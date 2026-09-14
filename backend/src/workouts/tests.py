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
    assert response.json()['duration_minutes'] == 55


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
def test_workout_crud_free(authenticated_client):
    client, _ = authenticated_client
    response = client.post('/api/workouts/', {
        'name': 'Morning Run',
        'duration_minutes': 30,
    }, content_type='application/json')
    assert response.status_code == 201
    workout_id = response.json()['id']

    response = client.get(f'/api/workouts/{workout_id}/')
    assert response.status_code == 200

    response = client.patch(f'/api/workouts/{workout_id}/', {
        'name': 'Evening Run',
    }, content_type='application/json')
    assert response.json()['name'] == 'Evening Run'

    response = client.delete(f'/api/workouts/{workout_id}/')
    assert response.status_code == 204


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
