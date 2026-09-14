import pytest
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from workouts.models import Workout
from nutrition.models import Meal, WaterIntake
from .models import WeightEntry

User = get_user_model()


@pytest.fixture
def authenticated_client(client):
    user = User.objects.create_user(username='testuser', password='Password123')
    user.profile.weight = 75
    user.profile.save()
    response = client.post('/api/auth/login/', {
        'username': 'testuser',
        'password': 'Password123',
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})
    return client, user


@pytest.mark.django_db
def test_progress_returns_totals_with_aggregation(authenticated_client):
    client, user = authenticated_client
    Workout.objects.create(user=user, name='W1', duration_minutes=60, calories_burned=300)
    Workout.objects.create(user=user, name='W2', duration_minutes=30, calories_burned=150)
    Meal.objects.create(user=user, name='M1', calories=500)
    WaterIntake.objects.create(user=user, milliliters=500)
    WaterIntake.objects.create(user=user, milliliters=250)

    response = client.get('/api/progress/')
    assert response.status_code == 200
    data = response.json()
    assert data['totals']['total_workouts'] == 2
    assert data['totals']['total_minutes'] == 90
    assert data['totals']['total_calories_burned'] == 450
    assert data['totals']['total_meals'] == 1
    assert data['totals']['total_water_ml'] == 750

    assert len(data['workouts']) == 31
    assert len(data['nutrition']) == 31
    assert data['weight'][0]['weight'] == 75.0


@pytest.mark.django_db
def test_weight_entry_create_and_upsert(authenticated_client):
    client, user = authenticated_client
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)

    response = client.post('/api/weight-entries/', {
        'date': yesterday.isoformat(),
        'weight': '72.5',
    }, content_type='application/json')
    assert response.status_code == 201
    assert response.json()['weight'] == '72.50'

    response = client.post('/api/weight-entries/', {
        'date': yesterday.isoformat(),
        'weight': '73.0',
    }, content_type='application/json')
    assert response.status_code == 200
    assert response.json()['weight'] == '73.00'
    assert WeightEntry.objects.filter(user=user, date=yesterday).count() == 1


@pytest.mark.django_db
def test_weight_entries_isolated_per_user(authenticated_client):
    client, user = authenticated_client
    other = User.objects.create_user(username='otheruser', password='Password123')
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    WeightEntry.objects.create(user=user, date=yesterday, weight=70)
    WeightEntry.objects.create(user=other, date=yesterday, weight=90)

    response = client.get('/api/weight-entries/')
    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.django_db
def test_progress_empty_data_no_crash(authenticated_client):
    client, _ = authenticated_client
    response = client.get('/api/progress/')
    assert response.status_code == 200
    data = response.json()
    assert data['totals']['total_workouts'] == 0
    assert data['weight'][0]['weight'] == 75.0


@pytest.mark.django_db
def test_progress_weight_history_includes_entries(authenticated_client):
    client, user = authenticated_client
    today = timezone.now().date()
    WeightEntry.objects.create(user=user, date=today - timedelta(days=10), weight=72)

    response = client.get('/api/progress/')
    data = response.json()
    assert len(data['weight']) >= 1
    weights = {w['weight'] for w in data['weight']}
    assert 72.0 in weights


@pytest.mark.django_db
def test_admin_roles_cannot_access_personal_progress(authenticated_client):
    client, _ = authenticated_client
    gym_admin = User.objects.create_user(username='gymadmin', password='Password123', role='gym_admin')
    client.post('/api/auth/login/', {
        'username': 'gymadmin', 'password': 'Password123',
    }, content_type='application/json')
    assert client.get('/api/weight-entries/').status_code == 403
    assert client.get('/api/progress/').status_code == 403

    superuser = User.objects.create_superuser(username='root', password='Password123', email='root@kronos.fit')
    client.post('/api/auth/login/', {
        'username': 'root', 'password': 'Password123',
    }, content_type='application/json')
    assert client.get('/api/weight-entries/').status_code == 403
    assert client.get('/api/progress/').status_code == 403