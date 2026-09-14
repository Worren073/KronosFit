import pytest
from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Gym, GymMembership, GymPlan, GymSubscription, GymAttendance, GymEvent

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
def gym():
    owner = User.objects.create_user(username='gymowner', password='Password123')
    return Gym.objects.create(name='Test Gym', slug='test-gym', owner=owner)


@pytest.mark.django_db
def test_gym_public_create_forbidden(authenticated_client):
    client, _ = authenticated_client
    before = Gym.objects.count()
    response = client.post('/api/gyms/', {
        'name': 'Mi Gym',
        'slug': 'mi-gym',
    }, content_type='application/json')
    assert response.status_code == 405
    assert Gym.objects.count() == before


@pytest.mark.django_db
def test_gym_public_create_forbidden_for_superuser(authenticated_client):
    client, _ = authenticated_client
    User.objects.create_superuser(username='root', password='Password123', email='root@kronos.fit')
    client.post('/api/auth/login/', {
        'username': 'root', 'password': 'Password123',
    }, content_type='application/json')
    before = Gym.objects.count()
    response = client.post('/api/gyms/', {
        'name': 'Super Gym',
        'slug': 'super-gym',
    }, content_type='application/json')
    assert response.status_code == 405
    assert Gym.objects.count() == before


@pytest.mark.django_db
def test_user_can_only_see_own_gyms(authenticated_client):
    client, user = authenticated_client
    g1 = Gym.objects.create(name='G1', slug='g1', owner=user)
    g2 = Gym.objects.create(name='G2', slug='g2', owner=User.objects.create_user(username='other', password='Password123'))
    response = client.get('/api/gyms/')
    assert response.status_code == 200
    assert response.json()['count'] == 0


@pytest.mark.django_db
def test_membership_public_create_forbidden(authenticated_client, gym):
    client, user = authenticated_client
    response = client.post('/api/gym-memberships/', {
        'gym': gym.id,
        'role': 'admin',
    }, content_type='application/json')
    assert response.status_code == 405
    assert not GymMembership.objects.filter(user=user, gym=gym).exists()


@pytest.mark.django_db
def test_membership_public_update_delete_forbidden(authenticated_client, gym):
    client, user = authenticated_client
    membership = GymMembership.objects.create(user=user, gym=gym, role='member')
    response = client.patch(f'/api/gym-memberships/{membership.id}/', {
        'role': 'admin',
    }, content_type='application/json')
    assert response.status_code == 405
    response = client.delete(f'/api/gym-memberships/{membership.id}/')
    assert response.status_code == 405
    membership.refresh_from_db()
    assert membership.role == 'member'


@pytest.mark.django_db
def test_membership_leave_deactivates_and_cancels_subscription(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='member')
    sub = GymSubscription.objects.create(
        gym=gym, user=user,
        start_date=date.today(), end_date=date.today() + timedelta(days=30),
    )
    membership = GymMembership.objects.get(user=user, gym=gym)

    response = client.post(f'/api/gym-memberships/{membership.id}/leave/', {}, content_type='application/json')
    assert response.status_code == 200
    membership.refresh_from_db()
    assert membership.is_active is False
    assert membership.assigned_trainer is None
    sub.refresh_from_db()
    assert sub.status == 'cancelled'


@pytest.mark.django_db
def test_membership_list_only_own(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='member')
    before = GymMembership.objects.count()
    response = client.get('/api/gym-memberships/')
    assert response.status_code == 200
    assert len(response.json()['results']) == 1
    assert GymMembership.objects.count() == before
    for item in response.json()['results']:
        assert item['user'] == user.id


@pytest.mark.django_db
def test_gym_public_mutation_methods_forbidden(authenticated_client, gym):
    client, user = authenticated_client
    for method, url, data in [
        ('post', '/api/gyms/', {'name': 'Nuevo Gym', 'slug': 'nuevo-gym'}),
        ('patch', f'/api/gyms/{gym.slug}/', {'name': 'Renombrado'}),
        ('put', f'/api/gyms/{gym.slug}/', {'name': 'Renombrado'}),
        ('delete', f'/api/gyms/{gym.slug}/', None),
    ]:
        response = getattr(client, method)(url, data=data, content_type='application/json') if data else getattr(client, method)(url)
        assert response.status_code == 405
    gym.refresh_from_db()
    assert gym.name == 'Test Gym'


@pytest.mark.django_db
def test_join_gym_by_slug(authenticated_client, gym):
    client, user = authenticated_client
    response = client.post('/api/gyms/join/', {
        'slug': gym.slug,
    }, content_type='application/json')
    assert response.status_code == 201
    membership = GymMembership.objects.get(user=user, gym=gym)
    assert membership.role == 'member'
    assert membership.is_active is True


@pytest.mark.django_db
def test_join_gym_reactivates_membership(authenticated_client, gym):
    client, user = authenticated_client
    GymMembership.objects.create(user=user, gym=gym, role='member', is_active=False)

    response = client.post('/api/gyms/join/', {
        'slug': gym.slug,
    }, content_type='application/json')
    assert response.status_code == 200
    membership = GymMembership.objects.get(user=user, gym=gym)
    assert membership.is_active is True


@pytest.mark.django_db
def test_join_gym_not_found(authenticated_client):
    client, _ = authenticated_client
    response = client.post('/api/gyms/join/', {
        'slug': 'no-existe',
    }, content_type='application/json')
    assert response.status_code == 404


@pytest.mark.django_db
def test_members_requires_admin(authenticated_client, gym):
    client, user = authenticated_client
    GymMembership.objects.create(user=user, gym=gym, role='member')
    response = client.get(f'/api/gyms/{gym.slug}/members/')
    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_can_list_members(authenticated_client, gym):
    client, user = authenticated_client
    GymMembership.objects.create(user=user, gym=gym, role='admin')
    other = User.objects.create_user(username='other', password='Password123')
    GymMembership.objects.create(user=other, gym=gym, role='member')

    response = client.get(f'/api/gyms/{gym.slug}/members/')
    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.django_db
def test_admin_can_update_member_role(authenticated_client, gym):
    client, user = authenticated_client
    GymMembership.objects.create(user=user, gym=gym, role='admin')
    other = User.objects.create_user(username='other', password='Password123')
    membership = GymMembership.objects.create(user=other, gym=gym, role='member')

    response = client.patch(f'/api/gyms/{gym.slug}/members/{membership.id}/', {
        'role': 'trainer',
    }, content_type='application/json')
    assert response.status_code == 200
    membership.refresh_from_db()
    assert membership.role == 'trainer'


@pytest.mark.django_db
def test_admin_cannot_update_own_role(authenticated_client, gym):
    client, user = authenticated_client
    membership = GymMembership.objects.create(user=user, gym=gym, role='admin')

    response = client.patch(f'/api/gyms/{gym.slug}/members/{membership.id}/', {
        'role': 'member',
    }, content_type='application/json')
    assert response.status_code == 403
    membership.refresh_from_db()
    assert membership.role == 'admin'


@pytest.mark.django_db
def test_non_numeric_membership_id_returns_404(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')
    response = client.patch('/api/gyms/test-gym/members/abc/', {
        'role': 'trainer',
    }, content_type='application/json')
    assert response.status_code == 404


@pytest.mark.django_db
def test_join_disabled_gym_blocked(authenticated_client, gym):
    client, user = authenticated_client
    gym.is_active = False
    gym.save(update_fields=['is_active'])
    response = client.post('/api/gyms/join/', {
        'slug': gym.slug,
    }, content_type='application/json')
    assert response.status_code == 403
    assert not GymMembership.objects.filter(user=user, gym=gym).exists()


@pytest.mark.django_db
def test_update_member_disabled_gym_blocked(authenticated_client, gym):
    client, user = authenticated_client
    GymMembership.objects.create(user=user, gym=gym, role='admin')
    other = User.objects.create_user(username='other', password='Password123')
    membership = GymMembership.objects.create(user=other, gym=gym, role='member')
    gym.is_active = False
    gym.save(update_fields=['is_active'])

    response = client.patch(f'/api/gyms/{gym.slug}/members/{membership.id}/', {
        'role': 'trainer',
    }, content_type='application/json')
    assert response.status_code == 403
    membership.refresh_from_db()
    assert membership.role == 'member'


@pytest.mark.django_db
def test_admin_can_assign_trainer(authenticated_client, gym):
    client, user = authenticated_client
    GymMembership.objects.create(user=user, gym=gym, role='admin')
    trainer = User.objects.create_user(username='trainer', password='Password123')
    trainer_ms = GymMembership.objects.create(user=trainer, gym=gym, role='trainer')
    athlete = User.objects.create_user(username='athlete', password='Password123')
    athlete_ms = GymMembership.objects.create(user=athlete, gym=gym, role='member')

    response = client.patch(f'/api/gyms/{gym.slug}/members/{athlete_ms.id}/', {
        'assigned_trainer': trainer_ms.id,
    }, content_type='application/json')
    assert response.status_code == 200
    athlete_ms.refresh_from_db()
    assert athlete_ms.assigned_trainer_id == trainer_ms.id


@pytest.mark.django_db
def test_assign_trainer_requires_active_trainer(authenticated_client, gym):
    client, user = authenticated_client
    GymMembership.objects.create(user=user, gym=gym, role='admin')
    trainer = User.objects.create_user(username='trainer', password='Password123')
    trainer_ms = GymMembership.objects.create(user=trainer, gym=gym, role='trainer', is_active=False)
    athlete = User.objects.create_user(username='athlete', password='Password123')
    athlete_ms = GymMembership.objects.create(user=athlete, gym=gym, role='member')

    response = client.patch(f'/api/gyms/{gym.slug}/members/{athlete_ms.id}/', {
        'assigned_trainer': trainer_ms.id,
    }, content_type='application/json')
    assert response.status_code == 404


@pytest.mark.django_db
def test_domain_models_created(authenticated_client, gym):
    plan = GymPlan.objects.create(gym=gym, name='Mensual', duration_days=30)
    client, user = authenticated_client
    sub = GymSubscription.objects.create(
        gym=gym, user=user, plan=plan,
        start_date=timezone.localdate(),
        end_date=timezone.localdate() + timedelta(days=30),
    )
    attendance = GymAttendance.objects.create(gym=gym, user=user)
    event = GymEvent.objects.create(gym=gym, title='Clase', starts_at=timezone.now())

    assert sub.status == 'active'
    assert attendance.date == timezone.localdate()
    assert GymSubscription.objects.filter(gym=gym, user=user, status='active').count() == 1


@pytest.mark.django_db
def test_my_gym_no_membership(authenticated_client):
    client, _ = authenticated_client
    response = client.get('/api/gyms/my-gym/')
    assert response.status_code == 200
    assert response.json()['gym'] is None


@pytest.mark.django_db
def test_my_gym_with_membership(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='member')
    response = client.get('/api/gyms/my-gym/')
    assert response.status_code == 200
    data = response.json()
    assert data['gym']['slug'] == gym.slug
    assert data['roles']['is_member'] is True
    assert data['attendance_count'] == 0


@pytest.mark.django_db
def test_check_in_self_and_duplicate(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='member')
    response = client.post(f'/api/gyms/{gym.slug}/check-in/', {}, content_type='application/json')
    assert response.status_code == 201
    dup = client.post(f'/api/gyms/{gym.slug}/check-in/', {}, content_type='application/json')
    assert dup.status_code == 400


@pytest.mark.django_db
def test_admin_registers_check_in_for_athlete(authenticated_client, gym):
    client, user = authenticated_client
    admin_ms = gym.memberships.create(user=user, role='admin')
    athlete = User.objects.create_user(username='athlete', password='Password123')
    athlete_ms = gym.memberships.create(user=athlete, role='member')

    response = client.post(f'/api/gyms/{gym.slug}/check-in/', {
        'user_id': athlete_ms.id,
    }, content_type='application/json')
    assert response.status_code == 201
    assert GymAttendance.objects.filter(gym=gym, user=athlete).exists()


@pytest.mark.django_db
def test_member_cannot_register_check_in_for_other(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='member')
    athlete = User.objects.create_user(username='athlete', password='Password123')
    athlete_ms = gym.memberships.create(user=athlete, role='member')

    response = client.post(f'/api/gyms/{gym.slug}/check-in/', {
        'user_id': athlete_ms.id,
    }, content_type='application/json')
    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_dashboard_shape(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')
    athlete = User.objects.create_user(username='athlete', password='Password123')
    gym.memberships.create(user=athlete, role='member')

    response = client.get(f'/api/gyms/{gym.slug}/dashboard/')
    assert response.status_code == 200
    data = response.json()
    assert data['athletes_count'] == 1
    assert data['trainers_count'] == 0
    assert len(data['members']) == 2
    assert 'membership_id' in data['members'][0]


@pytest.mark.django_db
def test_admin_dashboard_requires_admin(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='member')
    response = client.get(f'/api/gyms/{gym.slug}/dashboard/')
    assert response.status_code == 403


@pytest.mark.django_db
def test_trainer_sees_only_assigned(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')
    trainer = User.objects.create_user(username='trainer', password='Password123')
    trainer_ms = gym.memberships.create(user=trainer, role='trainer')
    a1 = User.objects.create_user(username='a1', password='Password123')
    a1_ms = gym.memberships.create(user=a1, role='member')
    a2 = User.objects.create_user(username='a2', password='Password123')
    a2_ms = gym.memberships.create(user=a2, role='member', assigned_trainer=trainer_ms)

    client.post('/api/auth/login/', {
        'username': 'trainer', 'password': 'Password123',
    }, content_type='application/json')
    response = client.get(f'/api/gyms/{gym.slug}/athletes/')
    assert response.status_code == 200
    athletes = response.json()
    assert len(athletes) == 1
    assert athletes[0]['user']['username'] == 'a2'


@pytest.mark.django_db
def test_trainer_athlete_dashboard_only_assigned(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')
    trainer = User.objects.create_user(username='trainer', password='Password123')
    trainer_ms = gym.memberships.create(user=trainer, role='trainer')
    a1 = User.objects.create_user(username='a1', password='Password123')
    a1_ms = gym.memberships.create(user=a1, role='member')
    a2 = User.objects.create_user(username='a2', password='Password123')
    a2_ms = gym.memberships.create(user=a2, role='member', assigned_trainer=trainer_ms)

    trainer_client = client
    client.post('/api/auth/login/', {
        'username': 'trainer', 'password': 'Password123',
    }, content_type='application/json')

    ok = trainer_client.get(f'/api/gyms/{gym.slug}/athletes/{a2_ms.id}/dashboard/')
    assert ok.status_code == 200
    assert ok.json()['user']['username'] == 'a2'

    forbidden = trainer_client.get(f'/api/gyms/{gym.slug}/athletes/{a1_ms.id}/dashboard/')
    assert forbidden.status_code == 404


@pytest.mark.django_db
def test_create_subscription_by_admin(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')
    athlete = User.objects.create_user(username='athlete', password='Password123')
    gym.memberships.create(user=athlete, role='member')

    response = client.post(f'/api/gyms/{gym.slug}/subscriptions/', {
        'user': athlete.id,
        'duration_days': 30,
    }, content_type='application/json')
    assert response.status_code == 201
    sub = GymSubscription.objects.get(gym=gym, user=athlete)
    assert sub.status == 'active'
    assert sub.end_date == date.today() + timedelta(days=30)


@pytest.mark.django_db
def test_create_subscription_requires_admin(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='member')
    athlete = User.objects.create_user(username='athlete', password='Password123')
    gym.memberships.create(user=athlete, role='member')

    response = client.post(f'/api/gyms/{gym.slug}/subscriptions/', {
        'user': athlete.id,
        'duration_days': 30,
    }, content_type='application/json')
    assert response.status_code == 403


@pytest.mark.django_db
def test_create_subscription_invalid_duration_returns_400(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')
    athlete = User.objects.create_user(username='athlete', password='Password123')
    gym.memberships.create(user=athlete, role='member')

    response = client.post(f'/api/gyms/{gym.slug}/subscriptions/', {
        'user': athlete.id,
        'duration_days': 'abc',
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_renew_invalid_duration_returns_400(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')
    sub = GymSubscription.objects.create(
        gym=gym, user=user,
        start_date=date.today(), end_date=date.today() + timedelta(days=30),
    )

    response = client.patch(f'/api/gyms/{gym.slug}/subscriptions/{sub.id}/', {
        'action': 'renew', 'duration_days': 'abc',
    }, content_type='application/json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_check_in_invalid_user_id_returns_400(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')

    response = client.post(f'/api/gyms/{gym.slug}/check-in/', {
        'user_id': 'abc',
    }, content_type='application/json')
    assert response.status_code == 400
    assert not GymAttendance.objects.filter(gym=gym).exists()


@pytest.mark.django_db
def test_renew_and_cancel_subscription(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')
    athlete = User.objects.create_user(username='athlete', password='Password123')
    gym.memberships.create(user=athlete, role='member')
    sub = GymSubscription.objects.create(
        gym=gym, user=athlete,
        start_date=date.today(), end_date=date.today() + timedelta(days=30),
    )

    renew = client.patch(f'/api/gyms/{gym.slug}/subscriptions/{sub.id}/', {
        'action': 'renew', 'duration_days': 30,
    }, content_type='application/json')
    assert renew.status_code == 200
    sub.refresh_from_db()
    assert sub.end_date == date.today() + timedelta(days=60)

    cancel = client.patch(f'/api/gyms/{gym.slug}/subscriptions/{sub.id}/', {
        'action': 'cancel',
    }, content_type='application/json')
    assert cancel.status_code == 200
    sub.refresh_from_db()
    assert sub.status == 'cancelled'


@pytest.mark.django_db
def test_kick_member_cancels_subscription(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')
    athlete = User.objects.create_user(username='athlete', password='Password123')
    athlete_ms = gym.memberships.create(user=athlete, role='member')
    sub = GymSubscription.objects.create(
        gym=gym, user=athlete,
        start_date=date.today(), end_date=date.today() + timedelta(days=30),
    )

    response = client.post(f'/api/gyms/{gym.slug}/members/{athlete_ms.id}/kick/', {}, content_type='application/json')
    assert response.status_code == 200
    athlete_ms.refresh_from_db()
    assert athlete_ms.is_active is False
    sub.refresh_from_db()
    assert sub.status == 'cancelled'


@pytest.mark.django_db
def test_events_admin_crud_and_member_list(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')
    created = client.post(f'/api/gyms/{gym.slug}/events/', {
        'title': 'Entrenamiento grupal',
        'description': 'Clase en el box',
        'starts_at': (timezone.now() + timedelta(days=1)).isoformat(),
    }, content_type='application/json')
    assert created.status_code == 201

    member = User.objects.create_user(username='member', password='Password123')
    client.post('/api/auth/login/', {
        'username': 'member', 'password': 'Password123',
    }, content_type='application/json')
    gym.memberships.create(user=member, role='member')
    listing = client.get(f'/api/gyms/{gym.slug}/events/')
    assert listing.status_code == 200
    assert len(listing.json()) == 1


@pytest.mark.django_db
def test_member_cannot_create_event(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='member')
    response = client.post(f'/api/gyms/{gym.slug}/events/', {
        'title': 'x', 'starts_at': (timezone.now() + timedelta(days=1)).isoformat(),
    }, content_type='application/json')
    assert response.status_code == 403


@pytest.mark.django_db
def test_plans_admin_crud(authenticated_client, gym):
    client, user = authenticated_client
    gym.memberships.create(user=user, role='admin')
    created = client.post(f'/api/gyms/{gym.slug}/plans/', {
        'name': 'Mensual', 'duration_days': 30, 'price': '1000.00',
    }, content_type='application/json')
    assert created.status_code == 201
    plan_id = created.json()['id']

    updated = client.patch(f'/api/gyms/{gym.slug}/plans/{plan_id}/', {
        'price': '1200.00',
    }, content_type='application/json')
    assert updated.status_code == 200
    assert updated.json()['price'] == '1200.00'

    deleted = client.delete(f'/api/gyms/{gym.slug}/plans/{plan_id}/')
    assert deleted.status_code == 204
