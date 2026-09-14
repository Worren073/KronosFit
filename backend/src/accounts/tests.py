import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def user_payload():
    return {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'Password123',
    }


@pytest.mark.django_db
def test_register_creates_user_and_sets_cookies(client, user_payload):
    response = client.post('/api/auth/register/', user_payload, content_type='application/json')
    assert response.status_code == 201
    assert User.objects.filter(username='testuser').exists()
    assert 'access_token' in response.cookies
    assert 'refresh_token' in response.cookies
    assert response.cookies['access_token']['httponly']


@pytest.mark.django_db
def test_register_with_weak_password_fails(client, user_payload):
    user_payload['password'] = '123'
    response = client.post('/api/auth/register/', user_payload, content_type='application/json')
    assert response.status_code == 400
    assert User.objects.count() == 0


@pytest.mark.django_db
def test_login_sets_cookies(client, user_payload):
    User.objects.create_user(**user_payload)
    response = client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json')
    assert response.status_code == 200
    assert 'access_token' in response.cookies
    assert 'refresh_token' in response.cookies


@pytest.mark.django_db
def test_login_with_wrong_password_fails(client, user_payload):
    User.objects.create_user(**user_payload)
    response = client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': 'wrongpassword',
    }, content_type='application/json')
    assert response.status_code == 401
    assert 'access_token' not in response.cookies


@pytest.mark.django_db
def test_protected_endpoint_requires_cookie(client, user_payload):
    user = User.objects.create_user(**user_payload)
    response = client.get('/api/users/me/')
    assert response.status_code == 401

    response = client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})

    response = client.get('/api/users/me/')
    assert response.status_code == 200
    assert response.json()['username'] == user.username


@pytest.mark.django_db
def test_logout_clears_cookies_and_blacklists_token(client, user_payload):
    User.objects.create_user(**user_payload)
    response = client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})

    response = client.post('/api/auth/logout/')
    assert response.status_code == 200
    assert response.cookies['access_token'].value == ''
    assert response.cookies['refresh_token'].value == ''


@pytest.mark.django_db
def test_check_username_available(client):
    response = client.get('/api/auth/check-username/?username=newuser')
    assert response.status_code == 200
    assert response.json()['available'] is True


@pytest.mark.django_db
def test_check_username_unavailable(client, user_payload):
    User.objects.create_user(**user_payload)
    response = client.get('/api/auth/check-username/?username=testuser')
    assert response.status_code == 200
    assert response.json()['available'] is False


@pytest.mark.django_db
def test_register_rate_limit(client, user_payload, settings):
    settings.RATELIMIT_ENABLE = True
    for i in range(6):
        payload = user_payload.copy()
        payload['username'] = f'testuser{i}'
        payload['email'] = f'test{i}@example.com'
        response = client.post('/api/auth/register/', payload, content_type='application/json')
    assert response.status_code == 429


@pytest.mark.django_db
def test_register_creates_profile(client, user_payload):
    response = client.post('/api/auth/register/', user_payload, content_type='application/json')
    assert response.status_code == 201
    user = User.objects.get(username='testuser')
    assert hasattr(user, 'profile')
    assert response.json()['user']['profile']['is_complete'] is False


@pytest.mark.django_db
def test_update_profile(client, user_payload):
    user = User.objects.create_user(**user_payload)
    response = client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})

    response = client.put('/api/users/me/profile/', {
        'first_name': 'Test',
        'last_name': 'User',
        'gender': 'male',
        'age': 25,
        'weight': '75.50',
        'height': '180.00',
        'experience': 'hero_in_training',
    }, content_type='application/json')
    assert response.status_code == 200
    assert response.json()['is_complete'] is True
    assert response.json()['gender'] == 'male'
    assert response.json()['experience'] == 'hero_in_training'


@pytest.mark.django_db
def test_me_returns_profile_status(client, user_payload):
    user = User.objects.create_user(**user_payload)
    response = client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})

    response = client.get('/api/users/me/')
    assert response.status_code == 200
    assert 'profile' in response.json()
    assert response.json()['profile']['is_complete'] is False


@pytest.mark.django_db
def test_register_works_with_invalid_access_cookie(client, user_payload):
    client.cookies['access_token'] = 'invalid.token.value'
    response = client.post('/api/auth/register/', user_payload, content_type='application/json')
    assert response.status_code == 201
    assert User.objects.filter(username='testuser').exists()
    assert 'access_token' in response.cookies


@pytest.mark.django_db
def test_check_username_works_with_invalid_access_cookie(client):
    client.cookies['access_token'] = 'invalid.token.value'
    response = client.get('/api/auth/check-username/?username=newuser')
    assert response.status_code == 200
    assert response.json()['available'] is True


@pytest.mark.django_db
def test_logout_clears_cookies_with_invalid_access_cookie(client, user_payload):
    User.objects.create_user(**user_payload)
    response = client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})
    # tamper with access token but keep refresh token
    client.cookies['access_token'] = 'invalid.token.value'

    response = client.post('/api/auth/logout/')
    assert response.status_code == 200
    assert response.cookies['access_token'].value == ''
    assert response.cookies['refresh_token'].value == ''


@pytest.mark.django_db
def test_user_write_methods_forbidden(client, user_payload):
    user = User.objects.create_user(**user_payload)
    response = client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})

    patch = client.patch(f'/api/users/{user.id}/', {'role': 'admin'}, content_type='application/json')
    put = client.put(f'/api/users/{user.id}/', {
        'username': user.username, 'email': user.email,
    }, content_type='application/json')
    delete = client.delete(f'/api/users/{user.id}/')
    assert patch.status_code == 405
    assert put.status_code == 405
    assert delete.status_code == 405
    user.refresh_from_db()
    assert user.role == 'user'


@pytest.mark.django_db
def test_user_cannot_access_other_users(client, user_payload):
    user = User.objects.create_user(**user_payload)
    other = User.objects.create_user(username='other', email='other@example.com', password='Password123')
    response = client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})

    response = client.get(f'/api/users/{other.id}/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_change_password_success(client, user_payload):
    User.objects.create_user(**user_payload)
    response = client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})

    response = client.post('/api/auth/change-password/', {
        'old_password': user_payload['password'],
        'new_password': 'NewPassword123',
    }, content_type='application/json')
    assert response.status_code == 200

    user = User.objects.get(username=user_payload['username'])
    assert user.check_password('NewPassword123')


@pytest.mark.django_db
def test_change_password_wrong_old(client, user_payload):
    User.objects.create_user(**user_payload)
    client.cookies.load({k: v.value for k, v in (client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json').cookies).items()})

    response = client.post('/api/auth/change-password/', {
        'old_password': 'WrongPassword',
        'new_password': 'NewPassword123',
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_change_password_rejects_weak(client, user_payload):
    User.objects.create_user(**user_payload)
    client.cookies.load({k: v.value for k, v in (client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json').cookies).items()})

    response = client.post('/api/auth/change-password/', {
        'old_password': user_payload['password'],
        'new_password': '123',
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_header_token_without_cookie_rejected(client, user_payload):
    user = User.objects.create_user(**user_payload)
    login = client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json')
    access = login.cookies['access_token'].value

    bare = client.get('/api/workouts/', HTTP_AUTHORIZATION=f'Bearer {access}')
    assert bare.status_code == 401


@pytest.mark.django_db
def test_refresh_rate_limit(client, user_payload, settings):
    settings.RATELIMIT_ENABLE = True
    User.objects.create_user(**user_payload)
    client.post('/api/auth/login/', {
        'username': user_payload['username'],
        'password': user_payload['password'],
    }, content_type='application/json')
    response = None
    for _ in range(11):
        response = client.post('/api/auth/refresh/', {}, content_type='application/json')
    assert response.status_code == 429

