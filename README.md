# NutriPost

![Project Banner Placeholder](https://placehold.co/1200x320/0F172A/F8FAFC?text=NutriPost)

NutriPost is a full-stack recovery nutrition tracker that turns workout effort into calorie burn insights and personalized post-workout meal recommendations.

[![Django](https://img.shields.io/badge/Django-5.1-092E20?logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-20232A?logo=react)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://www.sqlite.org/)
[![DRF](https://img.shields.io/badge/DRF-REST-red)](https://www.django-rest-framework.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-0EA5E9?logo=tailwindcss)](https://tailwindcss.com/)

Live demo: [Coming soon](https://example.com)

## Features

- 🏃 Track workouts with activity-specific MET values and automatic calorie burn calculation.
- 🍽️ Generate post-workout recovery meals using Open Food Facts nutrition data.
- 📊 Monitor calories burned vs consumed, macro balance, streaks, and weekly progress.
- 🔐 Use JWT authentication with httpOnly cookies and a custom Django user model.
- 📱 Explore a mobile-first React dashboard with charts, animations, and guided activity logging.
- 🧪 Seed 30+ activity types plus a demo account with 30 days of sample data.

## Architecture

```text
┌────────────────────────────── Frontend (React + Vite) ──────────────────────────────┐
│ Landing │ Auth │ Dashboard │ Activity Log │ History │ Nutrition │ Profile │ Charts   │
│  TailwindCSS + Framer Motion + Recharts + React Hook Form + Axios interceptors      │
└───────────────────────────────────────────┬──────────────────────────────────────────┘
                                            │ HTTPS / JSON
┌────────────────────────────── Backend (Django + DRF) ────────────────────────────────┐
│ Auth ViewSet │ Activity ViewSets │ Nutrition ViewSets │ Dashboard ViewSet            │
│ Service layer for TDEE, MET burn, macro targeting, OFF food ranking                  │
│ Custom JWT cookie auth │ django-filter │ consistent JSON error responses             │
└───────────────────────────────────────────┬──────────────────────────────────────────┘
                                            │ ORM
                                   ┌────────▼────────┐
                                   │ SQLite Database │
                                   │ Users           │
                                   │ Activities      │
                                   │ Food Logs       │
                                   │ Daily Goals     │
                                   └─────────────────┘
```

## Project Structure

```text
nutripost/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── users/
│   │   ├── activities/
│   │   ├── nutrition/
│   │   └── dashboard/
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── package.json
│   └── tailwind.config.js
├── .env.example
├── .gitignore
└── README.md
```

## Local Setup

### 1. Clone and configure environment

```bash
git clone <your-repo-url>
cd NutriPost
cp .env.example .env
```

### 2. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py seed_activities
python manage.py seed_demo_user
python manage.py runserver
```

Backend runs at `http://127.0.0.1:8000`.

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`.

### 4. Demo login

```text
Username: demo
Password: DemoPass123!
```

## API Overview

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/v1/auth/register/` | POST | No | Register a new user and issue JWT cookies |
| `/api/v1/auth/login/` | POST | No | Login and set access/refresh cookies |
| `/api/v1/auth/logout/` | POST | Yes | Logout and clear cookies |
| `/api/v1/auth/refresh/` | POST | No | Rotate refresh cookie and renew session |
| `/api/v1/auth/me/` | GET | Yes | Get current user profile and daily goal preview |
| `/api/v1/auth/me/` | PUT | Yes | Update profile and recalculate goals |
| `/api/v1/activities/types/` | GET | Yes | List activity types with MET values |
| `/api/v1/activities/logs/` | GET | Yes | List activity logs with filters and pagination |
| `/api/v1/activities/logs/` | POST | Yes | Create a new activity log |
| `/api/v1/activities/logs/{id}/` | GET | Yes | Activity detail including recommendation |
| `/api/v1/activities/logs/{id}/` | DELETE | Yes | Delete an activity log |
| `/api/v1/nutrition/recommendations/{activity_log_id}/` | GET | Yes | Get or generate a meal recommendation |
| `/api/v1/nutrition/foods/search/` | GET | Yes | Search Open Food Facts by keyword |
| `/api/v1/nutrition/food-logs/` | POST | Yes | Create a food log entry |
| `/api/v1/nutrition/food-logs/` | GET | Yes | List food logs with date filters |
| `/api/v1/dashboard/summary/` | GET | Yes | Summary metrics for a period |
| `/api/v1/dashboard/streak/` | GET | Yes | Get consecutive activity streak |
| `/api/v1/dashboard/progress/` | GET | Yes | Weekly progress toward daily goals |

## Data Sources

- Open Food Facts public API: [world.openfoodfacts.org](https://world.openfoodfacts.org/)
- MET values reference: Compendium of Physical Activities by Ainsworth et al. (2011 update)

## Screenshots

- Dashboard screenshot placeholder
- Activity log flow placeholder
- Recommendation detail placeholder
- Nutrition today placeholder

## Future Improvements

- Dockerized local and deployment workflow
- PostgreSQL for production environments
- Fitbit / Garmin / Apple Health integrations
- Push notifications for meal timing and streak nudges
- Barcode scanner for faster food logging

