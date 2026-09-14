import base64
import io
import uuid

from django.core.files.base import ContentFile

import segno
from PIL import Image

from .models import Gym, GymMembership


def generate_gym_slug():
    while True:
        slug = base64.urlsafe_b64encode(uuid.uuid4().bytes).decode().rstrip('=')[:8]
        if not Gym.objects.filter(slug=slug).exists():
            return slug


def generate_gym_qr(gym, base_url):
    from django.core.validators import URLValidator
    from django.core.exceptions import ValidationError

    base = (base_url or '').rstrip('/')
    if not base.startswith(('http://', 'https://')):
        base = f'http://{base}'
    payload = f'{base}/dashboard/gyms?join={gym.slug}'
    qr = segno.make(payload, error='m')
    matrix = qr.matrix
    scale = 8
    border = 4
    dim = (len(matrix) + 2 * border) * scale
    img = Image.new('RGB', (dim, dim), 'white')
    pixels = img.load()
    for y, row in enumerate(matrix):
        for x, val in enumerate(row):
            if val:
                for dy in range(scale):
                    for dx in range(scale):
                        px = (x + border) * scale + dx
                        py = (y + border) * scale + dy
                        pixels[px, py] = (0, 0, 0)
    buf = io.BytesIO()
    img.save(buf, format='WEBP', quality=90)
    gym.qr_code.save(f'{gym.slug}.webp', ContentFile(buf.getvalue()), save=False)
    gym.save(update_fields=['qr_code'])


def user_is_gym_admin(user, gym):
    if not user or not user.is_authenticated:
        return False
    if user.role == 'gym_admin' and user.managed_gym_id == gym.id:
        return True
    return gym.memberships.filter(
        user=user,
        role=GymMembership.Role.ADMIN,
        is_active=True,
    ).exists()


def user_is_gym_trainer(user, gym):
    if not user or not user.is_authenticated:
        return False
    return gym.memberships.filter(
        user=user,
        role=GymMembership.Role.TRAINER,
        is_active=True,
    ).exists()


def user_is_gym_member(user, gym):
    if not user or not user.is_authenticated:
        return False
    return gym.memberships.filter(user=user, is_active=True).exists()


def gym_is_active(gym):
    return bool(gym.is_active)