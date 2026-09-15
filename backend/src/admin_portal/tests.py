import pytest
from django.contrib.auth import get_user_model
from gyms.models import Gym, GymMembership, GymSubscription

User = get_user_model()


@pytest.fixture
def superuser_client(client):
    user = User.objects.create_superuser(
        username='root',
        password='Password123',
        email='root@kronos.fit',
    )
    response = client.post('/api/auth/login/', {
        'username': 'root',
        'password': 'Password123',
    }, content_type='application/json')
    client.cookies.load({k: v.value for k, v in response.cookies.items()})
    return client, user


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
def gym():
    owner = User.objects.create_user(username='gymowner', password='Password123')
    return Gym.objects.create(name='Test Gym', slug='test-gym', owner=owner)


@pytest.mark.django_db
def test_stats_requires_superuser(authenticated_client):
    client, _ = authenticated_client
    response = client.get('/api/admin/stats/')
    assert response.status_code == 403


@pytest.mark.django_db
def test_stats_shape(superuser_client):
    client, user = superuser_client
    User.objects.create_user(username='active', password='Password123')
    response = client.get('/api/admin/stats/')
    assert response.status_code == 200
    data = response.json()
    assert set(data) == {
        'gyms', 'memberships', 'plans', 'active_subscriptions',
        'expired_subscriptions', 'today_attendance', 'events', 'users',
    }
    assert data['users'] >= 2


@pytest.mark.django_db
def test_users_list_filtered(superuser_client):
    client, user = superuser_client
    User.objects.create_user(username='t', password='Password123', role='trainer')
    response = client.get('/api/admin/users/?role=trainer')
    assert response.status_code == 200
    for item in response.json()['results']:
        assert item['role'] == 'trainer'


@pytest.mark.django_db
def test_assign_gym_admin(superuser_client, gym):
    client, user = superuser_client
    target = User.objects.create_user(username='manager', password='Password123')
    response = client.patch(f'/api/admin/users/{target.id}/', {
        'role': 'gym_admin',
        'managed_gym': gym.id,
    }, content_type='application/json')
    assert response.status_code == 200
    target.refresh_from_db()
    assert target.role == 'gym_admin'
    assert target.managed_gym_id == gym.id
    assert GymMembership.objects.filter(user=target, gym=gym, role='admin').exists()


@pytest.mark.django_db
def test_gym_admin_requires_managed_gym(superuser_client):
    client, user = superuser_client
    target = User.objects.create_user(username='manager', password='Password123')
    response = client.patch(f'/api/admin/users/{target.id}/', {
        'role': 'gym_admin',
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_cannot_set_admin_role(superuser_client):
    client, user = superuser_client
    target = User.objects.create_user(username='manager', password='Password123')
    response = client.patch(f'/api/admin/users/{target.id}/', {
        'role': 'admin',
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_toggle_user_active(superuser_client):
    client, user = superuser_client
    target = User.objects.create_user(username='manager', password='Password123')
    response = client.patch(f'/api/admin/users/{target.id}/', {
        'is_active': False,
    }, content_type='application/json')
    assert response.status_code == 200
    target.refresh_from_db()
    assert target.is_active is False


@pytest.mark.django_db
def test_cannot_modify_superuser(superuser_client):
    client, user = superuser_client
    response = client.patch(f'/api/admin/users/{user.id}/', {
        'is_active': False,
    }, content_type='application/json')
    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_creates_gym_with_manager(superuser_client):
    client, user = superuser_client
    manager = User.objects.create_user(username='manager', password='Password123')
    response = client.post('/api/admin/gyms/', {
        'name': 'Templo Nuevo',
        'gym_admin_id': manager.id,
    }, content_type='application/json')
    assert response.status_code == 201
    data = response.json()
    assert data['slug']
    assert data['qr_url']
    gym = Gym.objects.get(id=data['id'])
    assert gym.owner == user
    assert gym.qr_code
    manager.refresh_from_db()
    assert manager.role == 'gym_admin'
    assert manager.managed_gym_id == gym.id
    assert GymMembership.objects.filter(user=manager, gym=gym, role='admin').exists()


@pytest.mark.django_db
def test_admin_creates_gym_with_new_admin_account(superuser_client):
    client, user = superuser_client
    response = client.post('/api/admin/gyms/', {
        'name': 'Templo Nuevo',
        'new_gym_admin': {
            'username': 'nuevo_admin',
            'email': 'nuevo@kronos.fit',
            'password': 'Password123',
        },
    }, content_type='application/json')
    assert response.status_code == 201
    data = response.json()
    gym = Gym.objects.get(id=data['id'])
    assert gym.owner == user
    assert gym.qr_code
    admin_user = User.objects.get(username='nuevo_admin')
    assert admin_user.email == 'nuevo@kronos.fit'
    assert admin_user.role == 'gym_admin'
    assert admin_user.managed_gym_id == gym.id
    assert GymMembership.objects.filter(user=admin_user, gym=gym, role='admin').exists()
    assert [a['username'] for a in data['managed_admins']] == ['nuevo_admin']


@pytest.mark.django_db
def test_admin_creates_gym_with_new_admin_account_weak_password(superuser_client):
    client, user = superuser_client
    before = User.objects.count()
    response = client.post('/api/admin/gyms/', {
        'name': 'Templo Nuevo',
        'new_gym_admin': {
            'username': 'nuevo_admin',
            'email': 'nuevo@kronos.fit',
            'password': 'abc',
        },
    }, content_type='application/json')
    assert response.status_code == 400
    assert User.objects.count() == before
    assert not Gym.objects.filter(name='Templo Nuevo').exists()


@pytest.mark.django_db
def test_admin_cannot_assign_and_create_manager(superuser_client):
    client, user = superuser_client
    manager = User.objects.create_user(username='manager', password='Password123')
    response = client.post('/api/admin/gyms/', {
        'name': 'Templo Nuevo',
        'gym_admin_id': manager.id,
        'new_gym_admin': {
            'username': 'nuevo_admin',
            'email': 'nuevo@kronos.fit',
            'password': 'Password123',
        },
    }, content_type='application/json')
    assert response.status_code == 400
    assert not Gym.objects.filter(name='Templo Nuevo').exists()


@pytest.mark.django_db
def test_admin_deletes_empty_gym(superuser_client):
    client, user = superuser_client
    response = client.post('/api/admin/gyms/', {
        'name': 'Templo Vacío',
    }, content_type='application/json')
    assert response.status_code == 201
    slug = response.json()['slug']
    response = client.delete(f'/api/admin/gyms/{slug}/')
    assert response.status_code == 204
    assert not Gym.objects.filter(slug=slug).exists()


@pytest.mark.django_db
def test_admin_delete_gym_releases_members(superuser_client, gym):
    client, user = superuser_client
    manager = User.objects.create_user(username='manager', password='Password123', role='gym_admin', managed_gym=gym)
    GymMembership.objects.create(user=manager, gym=gym, role='admin')
    member = User.objects.create_user(username='member', password='Password123')
    GymMembership.objects.create(user=member, gym=gym)
    response = client.delete(f'/api/admin/gyms/{gym.slug}/')
    assert response.status_code == 204
    assert not Gym.objects.filter(slug=gym.slug).exists()
    manager.refresh_from_db()
    assert manager.role == 'user'
    assert manager.managed_gym_id is None
    assert not GymMembership.objects.filter(user=manager).exists()
    assert not GymMembership.objects.filter(user=member).exists()


@pytest.mark.django_db
def test_admin_disables_gym(superuser_client, gym):
    client, user = superuser_client
    response = client.patch(f'/api/admin/gyms/{gym.slug}/', {
        'is_active': False,
    }, content_type='application/json')
    assert response.status_code == 200
    gym.refresh_from_db()
    assert gym.is_active is False


@pytest.mark.django_db
def test_admin_gyms_superuser_required(authenticated_client, gym):
    client, user = authenticated_client
    response = client.get('/api/admin/gyms/')
    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_portal_subscription_stats(superuser_client, gym):
    client, user = superuser_client
    member = User.objects.create_user(username='member', password='Password123')
    member.role = 'gym_admin'
    member.managed_gym = gym
    member.save()
    plan = None
    from datetime import date, timedelta
    GymSubscription.objects.create(
        gym=gym,
        user=member,
        plan=plan,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=30),
    )
    response = client.get('/api/admin/stats/')
    assert response.status_code == 200
    assert response.json()['active_subscriptions'] == 1