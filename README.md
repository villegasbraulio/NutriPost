# NutriPost

NutriPost es una aplicación full-stack orientada al seguimiento de actividad física, nutrición diaria y recuperación post-entrenamiento. El sistema permite registrar entrenamientos, estimar calorías quemadas con valores MET, calcular objetivos nutricionales personalizados y generar recomendaciones alimentarias a partir de datos reales de productos.

El proyecto fue desarrollado como una solución de portfolio profesional, con foco en arquitectura backend, consumo de APIs externas, autenticación segura, experiencia de usuario moderna y funcionalidades asistidas por IA.

## Resumen técnico para CV

Aplicación web full-stack construida con Django REST Framework y React que integra autenticación JWT mediante cookies httpOnly, cálculo de gasto energético con fórmulas nutricionales, análisis de rutinas de gimnasio con IA, búsqueda de alimentos en Open Food Facts y dashboards interactivos para seguimiento de progreso.

## Stack principal

| Capa | Tecnologías |
| --- | --- |
| Frontend | React 18, Vite, React Router, Tailwind CSS, Framer Motion, Recharts, Axios |
| Backend | Python, Django 5, Django REST Framework, django-filter |
| Autenticación | Simple JWT, cookies httpOnly, rotación y blacklist de refresh tokens |
| Base de datos | SQLite en desarrollo |
| IA y datos externos | Groq API, Open Food Facts API |
| Testing | pytest, pytest-django |

## Funcionalidades principales

- Registro, login, logout y refresh de sesión con JWT almacenado en cookies httpOnly.
- Perfil de usuario con peso, altura, edad, género, nivel de actividad y objetivo nutricional.
- Cálculo de BMR y calorías diarias totales como BMR × multiplicador de actividad TDEE.
- Registro de actividades físicas con cálculo automático de calorías netas mediante valores MET.
- Catálogo inicial de más de 30 tipos de actividad física.
- Gestión de rutinas de gimnasio con ejercicios estructurados, duración estimada, grupos musculares y MET ajustado.
- Parsing de rutinas desde texto libre, imágenes JPG/PNG/WEBP, PDFs con texto, PDFs con imágenes embebidas y archivos TXT/CSV/Markdown.
- Análisis de rutinas asistido por IA considerando volumen, carga, descansos, tipo de ejercicios y densidad de sesión.
- Recomendaciones post-entrenamiento basadas en objetivo personal, tipo de actividad, timing de recuperación y macronutrientes.
- Búsqueda de alimentos con datos normalizados desde Open Food Facts.
- Registro de comidas y visualización de calorías, proteínas, carbohidratos y grasas consumidas.
- Dashboard con resumen por período, progreso semanal, racha de actividad y métricas recientes.
- Asistente conversacional NutriCoach con contexto del usuario, actividad del día y registros nutricionales.
- Generación de insights semanales asistidos por IA cuando existe suficiente historial de actividad.
- Cuenta demo y comandos de seed para mostrar datos realistas en un entorno local.

## Arquitectura

```text
NutriPost
├── frontend/
│   └── React + Vite
│       ├── páginas protegidas por sesión
│       ├── dashboard, nutrición, actividades, rutinas y asistente
│       └── servicios Axios para consumir la API REST
│
└── backend/
    └── Django + DRF
        ├── apps.users        autenticación, perfil y objetivos diarios
        ├── apps.activities   actividades, rutinas, MET y parsing asistido por IA
        ├── apps.nutrition    alimentos, comidas, recomendaciones y macros
        ├── apps.dashboard    métricas, progreso, rachas e insights
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
  └── Groq API
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

### Nutrición y recomendaciones

NutriPost calcula objetivos post-entrenamiento en función de:

- peso del usuario;
- objetivo personal: perder, mantener o ganar peso;
- categoría de actividad: cardio, fuerza, flexibilidad o deporte;
- ventana de recuperación configurada.

Luego busca alimentos candidatos en Open Food Facts, normaliza calorías y macronutrientes por 100 g, y rankea opciones según cercanía al objetivo nutricional.

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
| Nutrición | `/nutrition/parse-meal/` | Parsing de comida con IA |
| Dashboard | `/dashboard/summary/` | Resumen de calorías, macros y actividad |
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
| `JWT_COOKIE_SECURE` | Configuración secure para cookies |
| `JWT_COOKIE_SAMESITE` | Política SameSite de cookies |
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

La cuenta demo incluye historial de actividad, registros de comidas y datos suficientes para visualizar el dashboard.

## Scripts útiles

### Backend

```bash
python manage.py migrate
python manage.py seed_activities
python manage.py seed_demo_user
python manage.py runserver
pytest
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
```

## Testing

El proyecto incluye configuración de `pytest` y `pytest-django`, con tests orientados a servicios de dominio, especialmente cálculos y lógica de actividades.

Para ejecutar la suite:

```bash
cd backend
pytest
```

## Decisiones técnicas relevantes

- Separación por apps de dominio en Django para mantener responsabilidades claras.
- Capa de servicios para cálculos nutricionales, integración con APIs externas y lógica asistida por IA.
- Autenticación basada en cookies httpOnly para evitar exposición directa de tokens en el frontend.
- Rotación y blacklist de refresh tokens para mejorar el control de sesión.
- Normalización de respuestas externas antes de persistir o exponer datos al frontend.
- Uso de `django-filter`, ordering y search en recursos listables.
- Manejo centralizado de errores de API mediante un exception handler personalizado.
- Frontend organizado en páginas, hooks, servicios y componentes reutilizables.

## Alcance actual

NutriPost está preparado para ejecución local como proyecto full-stack de portfolio. El foco actual está en mostrar una experiencia funcional end-to-end: autenticación, carga de datos, procesamiento de actividad, nutrición, visualización de métricas e integración con IA.

## Próximas mejoras posibles

- Dockerización del entorno completo.
- Migración a PostgreSQL para despliegue productivo.
- Pipeline de CI para linting, testing y build.
- Más cobertura de tests para endpoints y componentes frontend.
- Exportación de reportes semanales.
- Integraciones con dispositivos o plataformas de fitness.
- Escáner de código de barras para alimentos.
