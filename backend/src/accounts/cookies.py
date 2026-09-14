import os


def get_cookie_settings():
    secure = os.environ.get('SECURE_COOKIES', 'False').lower() in ('true', '1', 'yes')
    return {
        'httponly': True,
        'secure': secure,
        'samesite': 'Lax',
        'path': '/',
    }


def set_auth_cookies(response, access_token, refresh_token):
    settings = get_cookie_settings()
    response.set_cookie('access_token', access_token, **settings)
    response.set_cookie('refresh_token', refresh_token, **settings)
    return response


def clear_auth_cookies(response):
    settings = get_cookie_settings()
    response.delete_cookie('access_token', path='/', samesite=settings['samesite'])
    response.delete_cookie('refresh_token', path='/', samesite=settings['samesite'])
    return response
