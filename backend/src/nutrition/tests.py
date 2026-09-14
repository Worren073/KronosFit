import pytest
from django.contrib.auth import get_user_model
from .models import Meal, WaterIntake

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
def test_meals_are_isolated_per_user(authenticated_client):
    client, user = authenticated_client
    other = User.objects.create_user(username='otheruser', password='Password123')
    Meal.objects.create(user=user, name='Mi comida', calories=500)
    other_meal = Meal.objects.create(user=other, name='Otra comida', calories=800)

    response = client.get('/api/meals/')
    assert response.status_code == 200
    results = response.json()['results']
    assert len(results) == 1
    assert results[0]['name'] == 'Mi comida'

    response = client.get(f'/api/meals/{other_meal.id}/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_water_is_isolated_per_user(authenticated_client):
    client, user = authenticated_client
    other = User.objects.create_user(username='otheruser', password='Password123')
    WaterIntake.objects.create(user=user, milliliters=250)
    WaterIntake.objects.create(user=other, milliliters=500)

    response = client.get('/api/water/')
    assert response.status_code == 200
    results = response.json()['results']
    assert len(results) == 1
    assert results[0]['milliliters'] == 250


@pytest.mark.django_db
def test_meals_date_filter(authenticated_client):
    client, user = authenticated_client
    Meal.objects.create(user=user, name='Ayer', calories=100)
    Meal.objects.create(user=user, name='Hoy', calories=200)

    response = client.get('/api/meals/?date_from=2999-01-01')
    assert response.status_code == 200
    assert len(response.json()['results']) == 0

    response = client.get('/api/meals/?date_to=2000-01-01')
    assert response.status_code == 200
    assert len(response.json()['results']) == 0


@pytest.mark.django_db
def test_meals_summary(authenticated_client):
    client, user = authenticated_client
    Meal.objects.create(user=user, name='Desayuno', calories=400, protein_grams=30, carbs_grams=40, fat_grams=10)
    Meal.objects.create(user=user, name='Almuerzo', calories=600, protein_grams=50, carbs_grams=60, fat_grams=20)

    response = client.get('/api/meals/summary/')
    assert response.status_code == 200
    data = response.json()
    assert data['calories'] == 1000
    assert data['protein'] == 80
    assert data['carbs'] == 100
    assert data['fat'] == 30
    assert data['meal_count'] == 2


@pytest.mark.django_db
def test_pagination_on_meals(authenticated_client):
    client, user = authenticated_client
    for i in range(25):
        Meal.objects.create(user=user, name=f'Comida {i}', calories=100)

    response = client.get('/api/meals/')
    assert response.status_code == 200
    data = response.json()
    assert data['count'] == 25
    assert len(data['results']) == 20
    assert data['next'] is not None


@pytest.mark.django_db
def test_meal_validates_macros_with_calories(authenticated_client):
    client, _ = authenticated_client
    response = client.post('/api/meals/', {
        'name': 'Comida vacía',
        'calories': 500,
        'protein_grams': 0,
        'carbs_grams': 0,
        'fat_grams': 0,
    }, content_type='application/json')
    assert response.status_code == 400

    response = client.post('/api/meals/', {
        'name': 'Comida válida',
        'calories': 500,
        'protein_grams': 30,
        'carbs_grams': 40,
        'fat_grams': 10,
    }, content_type='application/json')
    assert response.status_code == 201


@pytest.mark.django_db
def test_meal_rejects_negative_macros(authenticated_client):
    client, _ = authenticated_client
    response = client.post('/api/meals/', {
        'name': 'Negativos',
        'calories': 100,
        'protein_grams': -5,
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_admin_roles_cannot_access_personal_nutrition(authenticated_client):
    client, _ = authenticated_client
    gym_admin = User.objects.create_user(username='gymadmin', password='Password123', role='gym_admin')
    client.post('/api/auth/login/', {
        'username': 'gymadmin', 'password': 'Password123',
    }, content_type='application/json')
    assert client.get('/api/meals/').status_code == 403
    assert client.get('/api/water/').status_code == 403

    superuser = User.objects.create_superuser(username='root', password='Password123', email='root@kronos.fit')
    client.post('/api/auth/login/', {
        'username': 'root', 'password': 'Password123',
    }, content_type='application/json')
    assert client.get('/api/meals/').status_code == 403
    assert client.get('/api/water/').status_code == 403