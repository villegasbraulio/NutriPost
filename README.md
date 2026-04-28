# NutriPost

NutriPost es una aplicación web full-stack para registrar actividad física, nutrición diaria y recuperación post-entrenamiento. Combina cálculo metabólico, recomendaciones nutricionales, dashboards de seguimiento y automatizaciones de producto para convertir datos del usuario en acciones concretas.

El proyecto fue desarrollado como pieza de portfolio técnico, con foco en arquitectura backend, experiencia de usuario, consumo de APIs externas, integración con IA y automatización de workflows reales dentro del producto.

## Resumen del branch actual

En este branch implementé una capa completa de automatización orientada a recuperación e insights:

- Workflow post-entreno persistido por actividad, con estados `pending`, `completed` y `reminder_due`.
- Cierre automático del workflow cuando el usuario registra una comida dentro de la ventana de recuperación.
- Procesamiento programado de workflows vencidos mediante scheduler.
- Notificaciones in-app para recordatorios post-entreno pendientes.
- Pregeneración automática de insights semanales para usuarios elegibles.
- Caché de insights por idioma para evitar mezclar contenido en español e inglés.
- Notificación in-app de “nuevo insight disponible”.
- Badge global de notificaciones visible desde cualquier pantalla autenticada.

## Resumen técnico para CV

Aplicación web full-stack construida con Django REST Framework y React que integra autenticación JWT con cookies httpOnly, cálculo de gasto energético con fórmulas nutricionales, análisis de rutinas de gimnasio con IA, búsqueda de alimentos en Open Food Facts, dashboards interactivos y automatizaciones backend programadas para recuperación post-entreno e insights semanales.

## Stack principal

| Capa | Tecnologías |
| --- | --- |
| Frontend | React 18, Vite, React Router, Tailwind CSS, Framer Motion, Recharts, Axios |
| Backend | Python, Django 5, Django REST Framework, django-filter |
| Autenticación | Simple JWT, cookies httpOnly, rotación y blacklist de refresh tokens |
| Base de datos | SQLite en desarrollo |
| IA y datos externos | Groq API, Open Food Facts API |
| Testing | pytest, pytest-django |
| Scheduler | Cron job en Render + comandos de management de Django |
| CI | GitHub Actions para testing, linting y build |

## Funcionalidades principales

- Registro, login, logout y refresh de sesión con JWT almacenado en cookies httpOnly.
- Perfil de usuario con peso, altura, edad, género, nivel de actividad y objetivo nutricional.
- Cálculo de BMR y TDEE con multiplicadores por nivel de actividad.
- Registro de actividades físicas con cálculo automático de calorías netas usando valores MET.
- Catálogo inicial de más de 30 tipos de actividad física.
- Gestión de rutinas de gimnasio con ejercicios estructurados, duración estimada, grupos musculares y MET ajustado.
- Parsing de rutinas desde texto libre, imágenes JPG/PNG/WEBP, PDFs con texto, PDFs con imágenes embebidas y archivos TXT/CSV/Markdown.
- Análisis de rutinas asistido por IA considerando volumen, carga, descansos, tipo de ejercicios y densidad de sesión.
- Recomendaciones post-entrenamiento basadas en objetivo personal, tipo de actividad, timing de recuperación y macronutrientes.
- Búsqueda de alimentos con datos normalizados desde Open Food Facts.
- Registro de comidas y visualización de calorías, proteínas, carbohidratos y grasas consumidas.
- Dashboard con resumen por período, progreso semanal, racha de actividad, métricas recientes y notificaciones in-app.
- Asistente conversacional NutriCoach con contexto del usuario, actividad del día y registros nutricionales.
- Generación de insights semanales asistidos por IA cuando existe suficiente historial de actividad.
- Pregeneración automática de insights semanales mediante scheduler, con caché por idioma para un dashboard bilingüe.
- Workflow post-entreno automatizado con seguimiento persistido, cierre automático al registrar comida y recordatorios listos para procesamiento programado.
- Notificaciones in-app en dashboard para recordatorios de recuperación pendientes y nuevos insights semanales disponibles.
- Badge global de notificaciones en el layout autenticado para visibilidad inmediata desde cualquier pantalla.
- Pipeline de CI con GitHub Actions para ejecutar tests de backend, lint del frontend y build en cada push o pull request.
- Cuenta demo y comandos de seed para mostrar datos realistas en un entorno local.

## Arquitectura

```text
NutriPost
├── frontend/
│   └── React + Vite
│       ├── páginas protegidas por sesión
│       ├── dashboard, nutrición, actividades, rutinas y asistente
│       ├── hooks y servicios para consumo de API
│       └── componentes reutilizables y visualizaciones
│
└── backend/
    └── Django + DRF
        ├── apps.users        autenticación, perfil y objetivos diarios
        ├── apps.activities   actividades, rutinas, MET y parsing asistido por IA
        ├── apps.nutrition    alimentos, comidas, recomendaciones y workflows post-entreno
        ├── apps.dashboard    métricas, progreso, insights y notificaciones
        └── apps.assistant    conversación contextual con NutriCoach
```

### Flujo general

```text
Usuario
  │
  ▼
Frontend React
  │  credenciales por cookies httpOnly
  ▼
API REST Django
  │
  ├── ORM / SQLite
  ├── Open Food Facts API
  ├── Groq API
  └── Scheduler / comandos programados
```

## Módulos destacados

### Actividad física y rutinas

El backend calcula calorías netas con la fórmula:

```text
kcal netas = (MET - 1) * peso_kg * duración_horas
```

Para actividades generales se usa el MET del tipo de actividad. Para rutinas de gimnasio, el sistema puede utilizar un MET ajustado generado a partir de la rutina real del usuario.

El módulo de rutinas permite:

- crear, editar, listar y eliminar rutinas;
- guardar ejercicios como JSON estructurado;
- analizar grupos musculares e intensidad;
- estimar carga de volumen;
- vincular una rutina a un registro de actividad;
- conservar historial aunque una rutina sea eliminada.

### Nutrición y recuperación

NutriPost calcula objetivos post-entrenamiento en función de:

- peso del usuario;
- objetivo personal: perder, mantener o ganar peso;
- categoría de actividad: cardio, fuerza, flexibilidad o deporte;
- ventana de recuperación configurada.

Luego busca alimentos candidatos en Open Food Facts, normaliza calorías y macronutrientes por 100 g, y rankea opciones según cercanía al objetivo nutricional.

Además, cada actividad crea un workflow persistido de recuperación que:

- queda pendiente mientras la ventana post-entreno sigue abierta;
- se completa automáticamente si el usuario registra una comida a tiempo;
- pasa a estado `reminder_due` si la ventana vence sin una comida asociada.

### Automatizaciones y scheduler

La automatización del producto se apoya en comandos de Django ejecutados por scheduler:

- procesamiento periódico de workflows post-entreno vencidos;
- creación y sincronización de notificaciones in-app;
- pregeneración de insights semanales para usuarios elegibles;
- creación de notificaciones cuando un insight nuevo ya está disponible.

Esto permite mover lógica importante fuera del “clic del usuario” y convertir el backend en un sistema que también reacciona con el paso del tiempo.

### IA aplicada

El proyecto integra Groq para funcionalidades concretas dentro del producto:

- parsing de comidas desde lenguaje natural;
- parsing de rutinas desde texto o archivos;
- análisis de MET ajustado para rutinas de fuerza;
- asistente conversacional con contexto nutricional del día;
- insights semanales personalizados.

La integración está encapsulada en servicios del backend, manteniendo la lógica de IA fuera de las vistas y separada de la capa de presentación.

## API principal

Todos los endpoints funcionales se exponen bajo `/api/v1/`.

| Recurso | Endpoint | Descripción |
| --- | --- | --- |
| Autenticación | `/auth/register/` | Registro de usuario y creación de sesión |
| Autenticación | `/auth/login/` | Inicio de sesión |
| Autenticación | `/auth/logout/` | Cierre de sesión y limpieza de cookies |
| Autenticación | `/auth/refresh/` | Rotación de refresh token |
| Perfil | `/auth/me/` | Consulta y actualización del perfil |
| Actividades | `/activities/types/` | Listado de actividades disponibles |
| Actividades | `/activities/logs/` | CRUD de registros de actividad |
| Rutinas | `/routines/` | CRUD de rutinas de gimnasio |
| Rutinas | `/routines/{id}/analyze/` | Análisis de rutina con IA |
| Rutinas | `/routines/parse-text/` | Parsing de rutina desde texto |
| Rutinas | `/routines/parse-file/` | Parsing de rutina desde archivo |
| Nutrición | `/nutrition/recommendations/{activity_log_id}/` | Recomendación post-entrenamiento |
| Nutrición | `/nutrition/foods/search/` | Búsqueda de alimentos |
| Nutrición | `/nutrition/food-logs/` | Registro y listado de comidas |
| Nutrición | `/nutrition/post-workout-workflows/` | Estado del workflow post-entreno |
| Nutrición | `/nutrition/parse-meal/` | Parsing de comida con IA |
| Dashboard | `/dashboard/summary/` | Resumen de calorías, macros y actividad |
| Dashboard | `/dashboard/notifications/` | Notificaciones in-app del usuario |
| Dashboard | `/dashboard/progress/` | Progreso semanal |
| Dashboard | `/dashboard/streak/` | Racha de actividad |
| Dashboard | `/dashboard/insights/` | Insight semanal con IA |
| Asistente | `/assistant/chat/` | Chat contextual con NutriCoach |

## Instalación local

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd NutriPost
cp .env.example .env
```

### 2. Configurar backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_activities
python manage.py seed_demo_user
python manage.py runserver
```

El backend queda disponible en:

```text
http://127.0.0.1:8000
```

### 3. Configurar frontend

En una segunda terminal:

```bash
cd frontend
npm install
npm run dev
```

El frontend queda disponible en:

```text
http://127.0.0.1:5173
```

## Variables de entorno

El archivo `.env.example` incluye las variables necesarias para ejecutar el proyecto localmente.

| Variable | Uso |
| --- | --- |
| `SECRET_KEY` | Clave secreta de Django |
| `DEBUG` | Modo de desarrollo |
| `TIME_ZONE` | Zona horaria del proyecto |
| `ALLOWED_HOSTS` | Hosts permitidos por Django |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos para el frontend |
| `CSRF_TRUSTED_ORIGINS` | Orígenes confiables para CSRF |
| `JWT_ACCESS_COOKIE` | Nombre de la cookie del access token |
| `JWT_REFRESH_COOKIE` | Nombre de la cookie del refresh token |
| `JWT_COOKIE_SECURE` | Configuración `secure` para cookies |
| `JWT_COOKIE_SAMESITE` | Política `SameSite` de cookies |
| `OFF_API_BASE_URL` | URL base de Open Food Facts |
| `GROQ_API_BASE_URL` | URL base de Groq |
| `GROQ_MODEL_NAME` | Modelo de texto para IA |
| `GROQ_VISION_MODEL_NAME` | Modelo de visión para archivos de rutina |
| `GROQ_API_KEY` | API key de Groq |
| `VITE_API_BASE_URL` | URL base consumida por el frontend |

## Cuenta demo

Después de ejecutar los comandos de seed:

```text
Usuario: demo
Contraseña: DemoPass123!
```

La cuenta demo incluye historial de actividad, registros de comidas y datos suficientes para visualizar el dashboard, las recomendaciones y los insights.

## Scripts útiles

### Backend

```bash
python manage.py migrate
python manage.py seed_activities
python manage.py seed_demo_user
python manage.py runserver
python manage.py run_scheduled_jobs
python manage.py run_scheduled_jobs --post-workout-limit 200 --insight-user-limit 25
pytest
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
```

## Testing

El proyecto incluye configuración de `pytest` y `pytest-django`, con tests orientados a servicios de dominio, scheduler, workflows post-entreno, insights y notificaciones.

Para ejecutar la suite:

```bash
cd backend
pytest
```

## CI con GitHub Actions

El repositorio incluye un workflow de GitHub Actions en [.github/workflows/ci.yml](./.github/workflows/ci.yml) que se ejecuta en cada `push`, `pull_request` y ejecución manual.

El pipeline corre dos jobs en paralelo:

- `Backend Tests`: instala dependencias de Python y ejecuta `pytest` dentro de `backend/`.
- `Frontend Lint And Build`: instala dependencias de Node, ejecuta `npm run lint` y luego `npm run build` dentro de `frontend/`.

Esto permite detectar regresiones de backend, errores de estilo en frontend y problemas de compilación antes de mergear cambios.

## Despliegue y scheduler en producción

El proyecto deja preparado un `cron job` de Render en [render.yaml](./render.yaml) para ejecutar:

```bash
python manage.py run_scheduled_jobs --post-workout-limit 200 --insight-user-limit 25
```

Este scheduler corre cada 10 minutos y hoy:

- procesa workflows post-entreno vencidos para marcarlos como `reminder_due`;
- crea o sincroniza notificaciones in-app para esos recordatorios;
- pregenera insights semanales para usuarios elegibles;
- genera notificaciones de “nuevo insight disponible” cuando se crea contenido nuevo.

Cuando un workflow entra en `reminder_due`, el backend crea una notificación persistida para el dashboard. Si el usuario luego registra una comida dentro de esa sesión, la notificación se marca como leída automáticamente y deja de aparecer como pendiente.

Los insights semanales se cachean por idioma (`en` y `es`) para evitar mezclar contenido entre localizaciones distintas. Eso permite que el scheduler los deje listos de antemano sin romper la experiencia bilingüe del dashboard.

## Decisiones técnicas relevantes

- Separación por apps de dominio en Django para mantener responsabilidades claras.
- Capa de servicios para cálculos nutricionales, integración con APIs externas, workflows programados y lógica asistida por IA.
- Autenticación basada en cookies httpOnly para evitar exposición directa de tokens en el frontend.
- Rotación y blacklist de refresh tokens para mejorar el control de sesión.
- Normalización de respuestas externas antes de persistir o exponer datos al frontend.
- Uso de `django-filter`, ordering y search en recursos listables.
- Manejo centralizado de errores de API mediante un `exception handler` personalizado.
- Frontend organizado en páginas, hooks, servicios y componentes reutilizables.
- Automatizaciones desacopladas de la UI mediante comandos de Django y scheduler externo.

## Alcance actual

NutriPost está preparado para ejecución local y despliegue como proyecto full-stack de portfolio. El foco actual está en mostrar una experiencia funcional end-to-end con automatización real de producto:

- autenticación;
- carga y consulta de datos;
- procesamiento de actividad y nutrición;
- recomendaciones y recuperación post-entreno;
- visualización de métricas;
- notificaciones in-app;
- integración con IA;
- procesos programados de backend.

## Próximas mejoras posibles

- Dockerización del entorno completo.
- Migración a PostgreSQL para despliegue productivo.
- Pipeline de CI para linting, testing y build.
- Más cobertura de tests para endpoints y componentes frontend.
- Exportación de reportes semanales.
- Integraciones con dispositivos o plataformas de fitness.
- Escáner de código de barras para alimentos.
