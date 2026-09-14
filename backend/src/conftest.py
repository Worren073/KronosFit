import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def disable_ratelimit(settings):
    settings.RATELIMIT_ENABLE = False
    cache.clear()


@pytest.fixture(autouse=True)
def isolated_media(tmp_path, settings):
    settings.MEDIA_ROOT = str(tmp_path / 'media')
