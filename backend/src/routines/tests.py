import pytest
from django.contrib.auth import get_user_model
from .models import Routine

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


@pytest.mark.django_db
def test_create_and_list_routines(authenticated_client):
    client, _ = authenticated_client
    payload = {
        'name': 'Arnold Split',
        'focus': 'Hipertrofia',
        'days_per_week': 4,
        'estimated_duration_minutes': 60,
        'days': [
            {
                'day_name': 'Lunes',
                'muscle_groups': 'Pecho, Triceps',
                'exercises': [
                    {'name': 'Press banca', 'description': 'Press plano con barra', 'sets': 4, 'reps': 10, 'rest_seconds': 90},
                ],
            },
        ],
    }
    response = client.post('/api/routines/', payload, content_type='application/json')
    assert response.status_code == 201
    data = response.json()
    assert data['name'] == 'Arnold Split'
    assert len(data['days']) == 1

    response = client.get('/api/routines/')
    assert response.status_code == 200
    assert len(response.json()['results']) == 1


@pytest.mark.django_db
def test_create_routine_with_muscle_groups_as_list(authenticated_client):
    client, _ = authenticated_client
    payload = {
        'name': 'Rutina IA',
        'focus': 'Fuerza',
        'days_per_week': 3,
        'estimated_duration_minutes': 60,
        'days': [
            {
                'day_name': 'Lunes',
                'muscle_groups': ['Pecho', 'Triceps'],
                'exercises': [
                    {'name': 'Press banca', 'description': 'Press plano con barra', 'sets': 4, 'reps': 10, 'rest_seconds': 90},
                ],
            },
        ],
    }
    response = client.post('/api/routines/', payload, content_type='application/json')
    assert response.status_code == 201
    data = response.json()
    assert data['days'][0]['muscle_groups'] == 'Pecho, Triceps'


@pytest.mark.django_db
def test_routines_are_isolated_per_user(authenticated_client):
    client, user = authenticated_client
    other = User.objects.create_user(username='otheruser', password='Password123')

    client.post('/api/routines/', {
        'name': 'Mi rutina',
        'focus': 'Fuerza',
        'days_per_week': 3,
        'estimated_duration_minutes': 45,
        'days': [],
    }, content_type='application/json')

    response = client.get('/api/routines/')
    assert response.status_code == 200
    assert len(response.json()['results']) == 1


@pytest.mark.django_db
def test_cannot_access_other_users_routine(authenticated_client):
    client, user = authenticated_client
    other = User.objects.create_user(username='otheruser', password='Password123')
    routine = Routine.objects.create(
        user=other,
        name='Rutina ajena',
        focus='Fuerza',
        days_per_week=3,
        estimated_duration_minutes=45,
    )

    response = client.get(f'/api/routines/{routine.id}/')
    assert response.status_code == 404

    response = client.patch(f'/api/routines/{routine.id}/', {
        'name': 'Hackeada',
    }, content_type='application/json')
    assert response.status_code == 404

    response = client.delete(f'/api/routines/{routine.id}/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_routines_list_is_paginated(authenticated_client):
    client, user = authenticated_client
    for i in range(25):
        Routine.objects.create(
            user=user,
            name=f'Rutina {i}',
            focus='Fuerza',
            days_per_week=3,
            estimated_duration_minutes=45,
        )

    response = client.get('/api/routines/')
    assert response.status_code == 200
    data = response.json()
    assert data['count'] == 25
    assert len(data['results']) == 20
    assert data['next'] is not None


@pytest.mark.django_db
def test_routine_limit_blocks_sixth_creation(authenticated_client):
    client, user = authenticated_client
    for i in range(5):
        Routine.objects.create(
            user=user,
            name=f'Rutina {i}',
            focus='Fuerza',
            days_per_week=3,
            estimated_duration_minutes=45,
        )

    response = client.post('/api/routines/', {
        'name': 'Sexta rutina',
        'focus': 'Fuerza',
        'days_per_week': 3,
        'estimated_duration_minutes': 45,
        'days': [],
    }, content_type='application/json')
    assert response.status_code == 400
    assert 'límite de 5 rutinas' in response.json()['detail']
    assert Routine.objects.filter(user=user).count() == 5


@pytest.mark.django_db
def test_routine_limit_allows_up_to_five(authenticated_client):
    client, user = authenticated_client
    for i in range(5):
        response = client.post('/api/routines/', {
            'name': f'Rutina {i}',
            'focus': 'Fuerza',
            'days_per_week': 3,
            'estimated_duration_minutes': 45,
            'days': [],
        }, content_type='application/json')
        assert response.status_code == 201
    assert Routine.objects.filter(user=user).count() == 5


@pytest.mark.django_db
def test_admin_roles_cannot_access_personal_routines(authenticated_client):
    client, _ = authenticated_client
    gym_admin = User.objects.create_user(username='gymadmin', password='Password123', role='gym_admin')
    client.post('/api/auth/login/', {
        'username': 'gymadmin', 'password': 'Password123',
    }, content_type='application/json')
    assert client.get('/api/routines/').status_code == 403

    superuser = User.objects.create_superuser(username='root', password='Password123', email='root@kronos.fit')
    client.post('/api/auth/login/', {
        'username': 'root', 'password': 'Password123',
    }, content_type='application/json')
    assert client.get('/api/routines/').status_code == 403
