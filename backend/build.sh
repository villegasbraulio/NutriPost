#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
python manage.py seed_activities

if [ "${SEED_DEMO_USER:-false}" = "true" ]; then
  python manage.py seed_demo_user
fi
