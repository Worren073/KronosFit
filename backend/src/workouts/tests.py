import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from routines.models import Routine, RoutineDay, RoutineExercise
from .models import Workout

User = get_user_model()


@pytest.fixture
def authenticated_client(client):
    user = User.objects.create_user(username='testuser', password='Password123')
    response = client.post('/api/auth/login/', {
        'username': 'testuser',
        'password': 'Password123',
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})
    return client, user


@pytest.fixture
def routine(authenticated_client):
    _, user = authenticated_client
    routine = Routine.objects.create(
        user=user,
        name='Rutina de prueba',
        focus='Fuerza',
        days_per_week=3,
        estimated_duration_minutes=60,
    )
    day = RoutineDay.objects.create(
        routine=routine,
        day_name='Lunes',
        muscle_groups='Pecho, Triceps',
        order=1,
    )
    RoutineExercise.objects.create(
        routine_day=day,
        name='Press banca',
        description='Press plano con barra',
        sets=2,
        reps=10,
        rest_seconds=90,
        order=1,
    )
    return routine


@pytest.mark.django_db
def test_start_workout_from_routine_day(authenticated_client, routine):
    client, user = authenticated_client
    day = routine.days.first()
    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    assert response.status_code == 201
    data = response.json()
    assert data['name'] == f'{routine.name} - {day.day_name}'
    assert len(data['exercises']) == 1
    assert data['exercises'][0]['sets'] == 2
    assert len(data['exercises'][0]['set_logs']) == 2


@pytest.mark.django_db
def test_start_workout_from_routine_day_requires_ownership(authenticated_client):
    client, _ = authenticated_client
    other = User.objects.create_user(username='otheruser', password='Password123')
    routine = Routine.objects.create(
        user=other,
        name='Otra rutina',
        focus='Hipertrofia',
        days_per_week=3,
        estimated_duration_minutes=60,
    )
    day = RoutineDay.objects.create(routine=routine, day_name='Lunes', muscle_groups='Pecho')
    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    assert response.status_code == 404


@pytest.mark.django_db
def test_complete_set(authenticated_client, routine):
    client, _ = authenticated_client
    day = routine.days.first()
    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    workout = response.json()
    exercise = workout['exercises'][0]
    exercise_set = exercise['set_logs'][0]

    response = client.post(f"/api/workouts/{workout['id']}/complete-set/", {
        'exercise_id': exercise['id'],
        'set_id': exercise_set['id'],
        'reps': 12,
        'weight': 80.5,
    }, content_type='application/json')
    assert response.status_code == 200
    data = response.json()
    assert data['reps'] == 12
    assert data['weight'] == '80.50'
    assert data['completed_at'] is not None


@pytest.mark.django_db
def test_finish_workout(authenticated_client, routine):
    client, _ = authenticated_client
    day = routine.days.first()
    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    workout = response.json()

    response = client.patch(f"/api/workouts/{workout['id']}/finish/", {
        'duration_minutes': 55,
    }, content_type='application/json')
    assert response.status_code == 200
    data = response.json()
    assert data['duration_minutes'] == 55
    assert data['status'] == 'finished'
    assert data['finished_at'] is not None


@pytest.mark.django_db
def test_finish_workout_is_idempotent(authenticated_client, routine):
    client, _ = authenticated_client
    day = routine.days.first()
    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    workout = response.json()

    first = client.patch(f"/api/workouts/{workout['id']}/finish/", {
        'duration_minutes': 40,
    }, content_type='application/json')
    assert first.status_code == 200
    finished_at = first.json()['finished_at']

    second = client.patch(f"/api/workouts/{workout['id']}/finish/", {
        'duration_minutes': 99,
    }, content_type='application/json')
    assert second.status_code == 200
    assert second.json()['duration_minutes'] == 40
    assert second.json()['finished_at'] == finished_at


@pytest.mark.django_db
def test_finish_workout_rejects_invalid_duration(authenticated_client, routine):
    client, _ = authenticated_client
    day = routine.days.first()
    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    workout = response.json()

    response = client.patch(f"/api/workouts/{workout['id']}/finish/", {
        'duration_minutes': 0,
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_complete_set_rejects_negative_values(authenticated_client, routine):
    client, _ = authenticated_client
    day = routine.days.first()
    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    workout = response.json()
    exercise = workout['exercises'][0]
    exercise_set = exercise['set_logs'][0]

    response = client.post(f"/api/workouts/{workout['id']}/complete-set/", {
        'exercise_id': exercise['id'],
        'set_id': exercise_set['id'],
        'reps': -3,
        'weight': 10,
    }, content_type='application/json')
    assert response.status_code == 400

    response = client.post(f"/api/workouts/{workout['id']}/complete-set/", {
        'exercise_id': exercise['id'],
        'set_id': exercise_set['id'],
        'reps': 10,
        'weight': -5,
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_complete_set_requires_both_fields(authenticated_client, routine):
    client, _ = authenticated_client
    day = routine.days.first()
    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    workout = response.json()
    exercise = workout['exercises'][0]
    exercise_set = exercise['set_logs'][0]

    response = client.post(f"/api/workouts/{workout['id']}/complete-set/", {
        'exercise_id': exercise['id'],
        'set_id': exercise_set['id'],
        'reps': '',
        'weight': '80',
    }, content_type='application/json')
    assert response.status_code == 400

    response = client.post(f"/api/workouts/{workout['id']}/complete-set/", {
        'exercise_id': exercise['id'],
        'set_id': exercise_set['id'],
        'reps': 10,
        'weight': '',
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_complete_set_rejects_zero_reps_and_accepts_zero_weight(authenticated_client, routine):
    client, _ = authenticated_client
    day = routine.days.first()
    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    workout = response.json()
    exercise = workout['exercises'][0]
    exercise_set = exercise['set_logs'][0]

    response = client.post(f"/api/workouts/{workout['id']}/complete-set/", {
        'exercise_id': exercise['id'],
        'set_id': exercise_set['id'],
        'reps': 0,
        'weight': 0,
    }, content_type='application/json')
    assert response.status_code == 400

    response = client.post(f"/api/workouts/{workout['id']}/complete-set/", {
        'exercise_id': exercise['id'],
        'set_id': exercise_set['id'],
        'reps': 15,
        'weight': 0,
    }, content_type='application/json')
    assert response.status_code == 200
    assert response.json()['weight'] == '0.00'


@pytest.mark.django_db
def test_complete_set_blocked_after_finish(authenticated_client, routine):
    client, _ = authenticated_client
    day = routine.days.first()
    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    workout = response.json()
    exercise = workout['exercises'][0]
    exercise_set = exercise['set_logs'][0]

    client.patch(f"/api/workouts/{workout['id']}/finish/", {
        'duration_minutes': 30,
    }, content_type='application/json')

    response = client.post(f"/api/workouts/{workout['id']}/complete-set/", {
        'exercise_id': exercise['id'],
        'set_id': exercise_set['id'],
        'reps': 10,
        'weight': 10,
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_start_conflicts_with_active_session_and_force_replaces_it(authenticated_client, routine):
    client, _ = authenticated_client
    day = routine.days.first()
    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    first_workout = response.json()

    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    assert response.status_code == 409
    assert response.json()['active_workout_id'] == first_workout['id']

    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
        'force': True,
    }, content_type='application/json')
    assert response.status_code == 201
    new_workout = response.json()
    assert new_workout['id'] != first_workout['id']
    assert new_workout['status'] == 'in_progress'
    assert not Workout.objects.filter(id=first_workout['id']).exists()


@pytest.mark.django_db
def test_active_endpoint_returns_current_session(authenticated_client, routine):
    client, _ = authenticated_client
    day = routine.days.first()

    response = client.get('/api/workouts/active/')
    assert response.status_code == 200
    assert response.json()['active'] is None

    created = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json').json()

    response = client.get('/api/workouts/active/')
    assert response.status_code == 200
    assert response.json()['active']['id'] == created['id']


@pytest.mark.django_db
def test_expired_session_is_purged(authenticated_client, routine):
    client, user = authenticated_client
    day = routine.days.first()
    stale = Workout.objects.create(
        user=user,
        created_by=user,
        name='Sesión vieja',
        duration_minutes=60,
        status=Workout.Status.IN_PROGRESS,
    )
    Workout.objects.filter(id=stale.id).update(date=timezone.now() - timezone.timedelta(hours=6))

    response = client.post('/api/workouts/start-from-routine-day/', {
        'routine_id': routine.id,
        'day_id': day.id,
    }, content_type='application/json')
    assert response.status_code == 201
    new_workout = response.json()
    assert not Workout.objects.filter(id=stale.id).exists()

    response = client.get('/api/workouts/active/')
    assert response.json()['active']['id'] == new_workout['id']


@pytest.mark.django_db
def test_expired_session_purged_on_list(authenticated_client, routine):
    client, user = authenticated_client
    stale = Workout.objects.create(
        user=user,
        created_by=user,
        name='Sesión vieja',
        duration_minutes=60,
        status=Workout.Status.IN_PROGRESS,
    )
    Workout.objects.filter(id=stale.id).update(date=timezone.now() - timezone.timedelta(hours=6))

    response = client.get('/api/workouts/')
    assert response.status_code == 200
    payload = response.json()
    workouts = payload['results'] if isinstance(payload, dict) else payload
    ids = [w['id'] for w in workouts]
    assert stale.id not in ids


@pytest.mark.django_db
def test_cannot_access_other_users_workout(authenticated_client):
    client, _ = authenticated_client
    other = User.objects.create_user(username='otheruser', password='Password123')
    workout = Workout.objects.create(
        user=other,
        name='Workout ajeno',
        duration_minutes=30,
    )

    response = client.get(f'/api/workouts/{workout.id}/')
    assert response.status_code == 404

    response = client.patch(f"/api/workouts/{workout.id}/finish/", {
        'duration_minutes': 10,
    }, content_type='application/json')
    assert response.status_code == 404

    response = client.delete(f'/api/workouts/{workout.id}/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_workout_history_is_read_only(authenticated_client):
    client, user = authenticated_client

    response = client.post('/api/workouts/', {
        'name': 'Morning Run',
        'duration_minutes': 30,
    }, content_type='application/json')
    assert response.status_code == 405

    finished = Workout.objects.create(
        user=user,
        name='Completada',
        duration_minutes=30,
        status=Workout.Status.FINISHED,
        finished_at=timezone.now(),
    )

    response = client.patch(f'/api/workouts/{finished.id}/', {
        'name': 'Renamed',
    }, content_type='application/json')
    assert response.status_code == 405

    response = client.delete(f'/api/workouts/{finished.id}/')
    assert response.status_code == 405

    response = client.post(f'/api/workouts/{finished.id}/exercises/', {
        'name': 'Press banca',
        'sets': 3,
        'reps': 10,
    }, content_type='application/json')
    assert response.status_code == 405

    response = client.get('/api/workouts/')
    assert response.status_code == 200
    payload = response.json()
    workouts = payload['results'] if isinstance(payload, dict) else payload
    assert [w['id'] for w in workouts] == [finished.id]


@pytest.mark.django_db
def test_active_workout_can_be_cancelled(authenticated_client):
    client, user = authenticated_client
    active = Workout.objects.create(
        user=user,
        created_by=user,
        name='Sesión activa',
        duration_minutes=60,
        status=Workout.Status.IN_PROGRESS,
    )

    response = client.delete(f'/api/workouts/{active.id}/')
    assert response.status_code == 204
    assert not Workout.objects.filter(id=active.id).exists()


@pytest.mark.django_db
def test_workout_calendar(authenticated_client):
    client, user = authenticated_client
    now = timezone.now()
    Workout.objects.create(user=user, name='Today', duration_minutes=30)
    Workout.objects.create(user=user, name='Old', duration_minutes=45)

    response = client.get(f'/api/workouts/calendar/?year={now.year}&month={now.month}')
    assert response.status_code == 200
    data = response.json()
    assert str(now.day) in data['days']
    assert len(data['days'][str(now.day)]) == 2


@pytest.mark.django_db
def test_admin_roles_cannot_access_personal_workouts(authenticated_client):
    client, _ = authenticated_client
    gym_admin = User.objects.create_user(username='gymadmin', password='Password123', role='gym_admin')
    client.post('/api/auth/login/', {
        'username': 'gymadmin', 'password': 'Password123',
    }, content_type='application/json')
    assert client.get('/api/workouts/').status_code == 403

    superuser = User.objects.create_superuser(username='root', password='Password123', email='root@kronos.fit')
    client.post('/api/auth/login/', {
        'username': 'root', 'password': 'Password123',
    }, content_type='application/json')
    assert client.get('/api/workouts/').status_code == 403
