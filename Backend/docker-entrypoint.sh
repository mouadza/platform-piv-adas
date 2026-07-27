#!/bin/sh
set -e

if [ "${RUN_DJANGO_SETUP:-true}" = "true" ]; then
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput
fi

exec "$@"
