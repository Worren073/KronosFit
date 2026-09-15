import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def authenticated_client(client):
    user = User.objects.create_user(username='testuser', password='Password123')
    user.profile.age = 25
    user.profile.weight = 75
    user.profile.height = 180
    user.profile.gender = 'male'
    user.profile.experience = 'hero_in_training'
    user.profile.save()
    response = client.post('/api/auth/login/', {
        'username': 'testuser',
        'password': 'Password123',
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})
    return client


@pytest.mark.django_db
def test_chat_requires_messages(authenticated_client):
    response = authenticated_client.post('/api/ai/chat/', {}, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
@patch('ai.views.chat_with_trainer')
def test_chat_returns_reply(mock_chat, authenticated_client):
    mock_chat.return_value = 'Hola, atleta.'
    response = authenticated_client.post('/api/ai/chat/', {
        'messages': [{'role': 'user', 'content': 'Hola'}],
    }, content_type='application/json')
    assert response.status_code == 200
    assert response.json()['reply'] == 'Hola, atleta.'


@pytest.mark.django_db
def test_generate_routine_requires_fields(authenticated_client):
    response = authenticated_client.post('/api/ai/routines/generate/', {
        'preferences': {'goal': 'Ganar músculo'},
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
@patch('ai.views.generate_routine')
def test_generate_routine_persists(mock_generate, authenticated_client):
    mock_generate.return_value = {
        'message': 'Rutina pensada para ganar fuerza con 3 dias.',
        'routine': {
            'name': 'Rutina test',
            'focus': 'Fuerza',
            'days_per_week': 3,
            'estimated_duration_minutes': 60,
            'days': [
                {
                    'day_name': 'Push',
                    'muscle_groups': 'Pecho, Hombro',
                    'order': 1,
                    'exercises': [
                        {'name': 'Press banca', 'description': 'Ejercicio base', 'sets': 4, 'reps': 8, 'rest_seconds': 90, 'weight': '60.00', 'notes': '', 'order': 1},
                    ],
                },
            ],
        },
    }
    response = authenticated_client.post('/api/ai/routines/generate/', {
        'preferences': {
            'goal': 'Ganar músculo',
            'days_per_week': 3,
            'minutes_per_session': 60,
            'equipment': 'Gimnasio completo',
            'split_style': 'Full body',
        },
    }, content_type='application/json')
    assert response.status_code == 200
    data = response.json()
    assert data['message'] == 'Rutina pensada para ganar fuerza con 3 dias.'
    assert data['routine_id']

    from routines.models import Routine, RoutineDay, RoutineExercise
    routine = Routine.objects.get(id=data['routine_id'])
    assert routine.name == 'Rutina test'
    assert routine.user.username == 'testuser'
    assert routine.source == 'ai'
    assert routine.days.count() == 1
    assert routine.days.first().exercises.count() == 1


@pytest.mark.django_db
@patch('ai.views.generate_routine')
def test_generate_routine_blocks_at_limit(mock_generate, authenticated_client):
    from routines.models import Routine
    user = User.objects.get(username='testuser')
    for i in range(5):
        Routine.objects.create(
            user=user,
            name=f'Rutina {i}',
            focus='Fuerza',
            days_per_week=3,
            estimated_duration_minutes=45,
        )

    response = authenticated_client.post('/api/ai/routines/generate/', {
        'preferences': {
            'goal': 'Ganar músculo',
            'days_per_week': 3,
            'minutes_per_session': 60,
            'equipment': 'Gimnasio completo',
            'split_style': 'Full body',
        },
    }, content_type='application/json')
    assert response.status_code == 400
    assert 'límite de 5 rutinas' in response.json()['detail']
    mock_generate.assert_not_called()


@pytest.mark.django_db
@patch('ai.services._get_client')
def test_generate_routine_without_api_key(mock_client, authenticated_client):
    mock_client.side_effect = RuntimeError('GEMINI_API_KEY no esta configurada')
    response = authenticated_client.post('/api/ai/routines/generate/', {
        'preferences': {
            'goal': 'Ganar músculo',
            'days_per_week': 3,
            'minutes_per_session': 60,
            'equipment': 'Gimnasio completo',
            'split_style': 'Full body',
        },
    }, content_type='application/json')
    assert response.status_code == 503


@pytest.mark.django_db
@patch('ai.views.chat_with_trainer')
def test_chat_unexpected_error_is_generic(mock_chat, authenticated_client):
    mock_chat.side_effect = Exception('secreto interno')
    response = authenticated_client.post('/api/ai/chat/', {
        'messages': [{'role': 'user', 'content': 'Hola'}],
    }, content_type='application/json')
    assert response.status_code == 500
    assert 'secreto interno' not in response.json()['detail']


@pytest.mark.django_db
@patch('ai.views.chat_with_trainer')
def test_chat_includes_workout_history(mock_chat, authenticated_client):
    from django.utils import timezone
    from workouts.models import Workout, Exercise, ExerciseSet

    mock_chat.return_value = 'Ok.'
    user = User.objects.get(username='testuser')
    workout = Workout.objects.create(
        user=user,
        created_by=user,
        name='Rutina A - Lunes',
        duration_minutes=45,
        status=Workout.Status.FINISHED,
        finished_at=timezone.now(),
    )
    exercise = Exercise.objects.create(workout=workout, name='Press banca', sets=2, reps=10)
    ExerciseSet.objects.create(exercise=exercise, set_number=1, reps=12, weight='80.00', completed_at=timezone.now())
    ExerciseSet.objects.create(exercise=exercise, set_number=2, reps=10, weight='80.00', completed_at=timezone.now())

    response = authenticated_client.post('/api/ai/chat/', {
        'messages': [{'role': 'user', 'content': '¿Subo peso en press banca?'}],
    }, content_type='application/json')
    assert response.status_code == 200

    history_arg = mock_chat.call_args.args[1]
    assert 'Press banca' in history_arg
    assert '12 reps x 80.00 kg' in history_arg


@pytest.mark.django_db
def test_admin_roles_cannot_access_ai(authenticated_client):
    client = authenticated_client
    gym_admin = User.objects.create_user(username='gymadmin', password='Password123', role='gym_admin')
    client.post('/api/auth/login/', {
        'username': 'gymadmin', 'password': 'Password123',
    }, content_type='application/json')
    assert client.post('/api/ai/chat/', {
        'messages': [{'role': 'user', 'content': 'Hola'}],
    }, content_type='application/json').status_code == 403
    assert client.post('/api/ai/routines/generate/', {
        'preferences': {'goal': 'Ganar músculo', 'days_per_week': 3, 'minutes_per_session': 60, 'equipment': 'Gimnasio', 'split_style': 'Full body'},
    }, content_type='application/json').status_code == 403

    superuser = User.objects.create_superuser(username='root', password='Password123', email='root@kronos.fit')
    client.post('/api/auth/login/', {
        'username': 'root', 'password': 'Password123',
    }, content_type='application/json')
    assert client.post('/api/ai/chat/', {
        'messages': [{'role': 'user', 'content': 'Hola'}],
    }, content_type='application/json').status_code == 403
    assert client.post('/api/ai/routines/generate/', {
        'preferences': {'goal': 'Ganar músculo', 'days_per_week': 3, 'minutes_per_session': 60, 'equipment': 'Gimnasio', 'split_style': 'Full body'},
    }, content_type='application/json').status_code == 403
