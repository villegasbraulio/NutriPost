import os
from datetime import timedelta
from pathlib import Path

import environ

ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = ROOT_DIR / "backend"

env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, "unsafe-dev-secret-key"),
    ALLOWED_HOSTS=(list, ["127.0.0.1", "localhost"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://127.0.0.1:5173", "http://localhost:5173"]),
    CSRF_TRUSTED_ORIGINS=(list, ["http://127.0.0.1:5173", "http://localhost:5173"]),
    FRONTEND_URL=(str, ""),
    OFF_API_BASE_URL=(str, "https://world.openfoodfacts.org"),
    GROQ_API_KEY=(str, ""),
    GROQ_API_BASE_URL=(str, "https://api.groq.com/openai/v1"),
    GROQ_MODEL_NAME=(str, "llama-3.3-70b-versatile"),
    GROQ_VISION_MODEL_NAME=(str, "meta-llama/llama-4-scout-17b-16e-instruct"),
)
environ.Env.read_env(ROOT_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG")

render_external_hostname = os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip()
default_allowed_hosts = ["127.0.0.1", "localhost"]
if render_external_hostname:
    default_allowed_hosts.append(render_external_hostname)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[]) or default_allowed_hosts

frontend_url = env("FRONTEND_URL", default="").strip().rstrip("/")
default_frontend_origins = [frontend_url] if frontend_url else [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "apps.users",
    "apps.activities",
    "apps.nutrition",
    "apps.assistant",
    "apps.dashboard",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BACKEND_DIR / 'db.sqlite3'}")
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="UTC")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BACKEND_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    }
}
MEDIA_URL = "media/"
MEDIA_ROOT = BACKEND_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "users.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.users.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "config.api.StandardResultsSetPagination",
    "EXCEPTION_HANDLER": "config.api.custom_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_COOKIE_ACCESS": env("JWT_ACCESS_COOKIE", default="nutripost_access"),
    "AUTH_COOKIE_REFRESH": env("JWT_REFRESH_COOKIE", default="nutripost_refresh"),
    "AUTH_COOKIE_SECURE": env.bool("JWT_COOKIE_SECURE", default=not DEBUG),
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SAMESITE": env("JWT_COOKIE_SAMESITE", default="Lax" if DEBUG else "None"),
    "AUTH_COOKIE_PATH": "/",
}

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[]) or default_frontend_origins
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[]) or default_frontend_origins

OPEN_FOOD_FACTS_BASE_URL = env("OFF_API_BASE_URL")
GROQ_API_KEY = env("GROQ_API_KEY", default="")
GROQ_API_BASE_URL = env("GROQ_API_BASE_URL", default="https://api.groq.com/openai/v1")
GROQ_MODEL_NAME = env("GROQ_MODEL_NAME", default="llama-3.3-70b-versatile")
GROQ_VISION_MODEL_NAME = env("GROQ_VISION_MODEL_NAME", default="meta-llama/llama-4-scout-17b-16e-instruct")
