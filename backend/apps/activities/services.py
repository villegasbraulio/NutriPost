import base64
import json
import mimetypes
import re
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from random import choice, randint, uniform

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.core.ai_client import GroqServiceError, get_model, get_vision_model

from .models import ActivityLog, ActivityType, GymRoutine

User = get_user_model()
TIMING_WINDOW_MINUTES = 60
ACTIVITY_LEVEL_MULTIPLIERS = {
    "sedentary": Decimal("1.2"),
    "light": Decimal("1.375"),
    "moderate": Decimal("1.55"),
    "active": Decimal("1.725"),
    "very_active": Decimal("1.9"),
}
ROUTINE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024
ROUTINE_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ROUTINE_PDF_CONTENT_TYPES = {"application/pdf"}
ROUTINE_TEXT_CONTENT_TYPES = {"text/plain", "text/markdown", "text/csv", "application/json"}
ROUTINE_MAX_PDF_IMAGES = 5
DEFAULT_SECONDS_PER_REP = Decimal("3")

ACTIVITY_SEED_DATA = [
    {"name": "Running", "met_value": Decimal("8.0"), "category": "cardio", "icon_name": "running"},
    {"name": "Walking", "met_value": Decimal("3.5"), "category": "cardio", "icon_name": "footprints"},
    {"name": "Cycling", "met_value": Decimal("6.0"), "category": "cardio", "icon_name": "bike"},
    {"name": "Swimming", "met_value": Decimal("6.0"), "category": "cardio", "icon_name": "waves"},
    {"name": "HIIT", "met_value": Decimal("8.0"), "category": "cardio", "icon_name": "zap"},
    {"name": "Weight Training", "met_value": Decimal("3.5"), "category": "strength", "icon_name": "dumbbell"},
    {"name": "Yoga", "met_value": Decimal("2.5"), "category": "flexibility", "icon_name": "flower-2"},
    {"name": "Football", "met_value": Decimal("7.0"), "category": "sport", "icon_name": "trophy"},
    {"name": "Basketball", "met_value": Decimal("6.5"), "category": "sport", "icon_name": "dribbble"},
    {"name": "Boxing", "met_value": Decimal("7.5"), "category": "sport", "icon_name": "shield"},
    {"name": "Jump Rope", "met_value": Decimal("10.0"), "category": "cardio", "icon_name": "activity"},
    {"name": "Rowing", "met_value": Decimal("7.0"), "category": "cardio", "icon_name": "sailboat"},
    {"name": "Pilates", "met_value": Decimal("3.0"), "category": "flexibility", "icon_name": "heart-pulse"},
    {"name": "Dancing", "met_value": Decimal("5.0"), "category": "cardio", "icon_name": "music-2"},
    {"name": "Rock Climbing", "met_value": Decimal("7.5"), "category": "sport", "icon_name": "mountain"},
    {"name": "Tennis", "met_value": Decimal("7.0"), "category": "sport", "icon_name": "circle-dot"},
    {"name": "Martial Arts", "met_value": Decimal("5.5"), "category": "sport", "icon_name": "shield-half"},
    {"name": "Hiking", "met_value": Decimal("6.0"), "category": "cardio", "icon_name": "mountain-snow"},
    {"name": "Elliptical", "met_value": Decimal("5.0"), "category": "cardio", "icon_name": "orbit"},
    {"name": "Stair Climbing", "met_value": Decimal("8.8"), "category": "cardio", "icon_name": "building-2"},
    {"name": "CrossFit", "met_value": Decimal("8.5"), "category": "strength", "icon_name": "dumbbell"},
    {"name": "Volleyball", "met_value": Decimal("4.0"), "category": "sport", "icon_name": "circle-dot"},
    {"name": "Rugby", "met_value": Decimal("8.3"), "category": "sport", "icon_name": "trophy"},
    {"name": "Badminton", "met_value": Decimal("5.5"), "category": "sport", "icon_name": "circle-dot"},
    {"name": "Skating", "met_value": Decimal("7.0"), "category": "sport", "icon_name": "snowflake"},
    {"name": "Skiing", "met_value": Decimal("7.0"), "category": "sport", "icon_name": "mountain-snow"},
    {"name": "Surfing", "met_value": Decimal("3.0"), "category": "sport", "icon_name": "waves-ladder"},
    {"name": "Kayaking", "met_value": Decimal("5.0"), "category": "sport", "icon_name": "sailboat"},
    {"name": "Table Tennis", "met_value": Decimal("4.0"), "category": "sport", "icon_name": "circle-dot"},
    {"name": "Circuit Training", "met_value": Decimal("8.0"), "category": "strength", "icon_name": "flame"},
    {"name": "Core Workout", "met_value": Decimal("4.0"), "category": "strength", "icon_name": "dumbbell"},
    {"name": "Stretching", "met_value": Decimal("2.3"), "category": "flexibility", "icon_name": "leaf"},
    {"name": "Jogging", "met_value": Decimal("7.0"), "category": "cardio", "icon_name": "running"},
    {"name": "Power Walking", "met_value": Decimal("4.3"), "category": "cardio", "icon_name": "footprints"},
]


def quantize(value: Decimal, precision: str = "0.01") -> Decimal:
    return Decimal(value).quantize(Decimal(precision), rounding=ROUND_HALF_UP)


def calculate_bmr(weight_kg, height_cm, age, gender) -> Decimal:
    """
    Calculate basal metabolic rate with the Mifflin-St Jeor equation.

    Formula:
    - base = (10 × weight_kg) + (6.25 × height_cm) - (5 × age)
    - male = base + 5
    - non-male = base - 161
    """

    weight = Decimal(str(weight_kg))
    height = Decimal(str(height_cm))
    age_value = Decimal(str(age))
    base = (Decimal("10") * weight) + (Decimal("6.25") * height) - (Decimal("5") * age_value)
    adjustment = Decimal("5") if gender == "male" else Decimal("-161")
    return quantize(base + adjustment)


def calculate_tdee(bmr, activity_level) -> Decimal:
    """
    Calculate total daily energy expenditure with the selected activity multiplier.

    Formula:
    - total_calories = BMR × activity_level_multiplier
    - sedentary = 1.2
    - light = 1.375
    - moderate = 1.55
    - active = 1.725
    - very_active = 1.9
    """

    multiplier = ACTIVITY_LEVEL_MULTIPLIERS[activity_level]
    return quantize(Decimal(str(bmr)) * multiplier)


def calculate_net_calories_burned(met_value, weight_kg, duration_minutes) -> Decimal:
    """
    Calculate net exercise calories using the corrected MET formula.

    Formula:
    - net_kcal = (MET - 1) × weight_kg × (duration_minutes / 60)

    Subtracting 1 MET removes resting expenditure to avoid double-counting baseline calories.
    """

    duration_hours = Decimal(str(duration_minutes)) / Decimal("60")
    adjusted_met = max(Decimal(str(met_value)) - Decimal("1"), Decimal("0"))
    calories = adjusted_met * Decimal(str(weight_kg)) * duration_hours
    return quantize(calories)


def get_activity_log_met(activity_log: ActivityLog) -> Decimal:
    """Return the best available MET value for an activity log.

    Gym logs can use a routine-specific AI-adjusted MET value. Regular activity
    logs fall back to the scientific MET value stored on the selected activity type.
    """

    routine = getattr(activity_log, "gym_routine", None)
    if routine and routine.adjusted_met:
        return Decimal(str(routine.adjusted_met))
    return Decimal(str(activity_log.activity_type.met_value))


def calculate_activity_log_net_calories(activity_log: ActivityLog) -> Decimal:
    """
    Calculate net exercise calories for a saved activity log.

    Formula for routine-based gym logs:
    - exercise_time = (sets × reps × seconds_per_rep) + ((sets - 1) × rest_seconds)
    - exercise_calories = exercise_MET × user_weight_kg × (exercise_time_seconds / 3600)
    - routine_calories = sum(exercise_calories)

    Formula for regular activity logs:
    - net_kcal = (selected_MET - 1) × user_weight_kg × (duration_minutes / 60)

    Routine logs use exercise-level gross MET values because resistance-training
    calories depend heavily on set volume, rep tempo, rest, and exercise type.
    """

    routine = getattr(activity_log, "gym_routine", None)
    if routine:
        summary = calculate_routine_calorie_summary(routine.exercises, activity_log.user.weight_kg)
        if summary["total_calories"] > 0:
            return quantize(Decimal(str(summary["total_calories"])))

    return calculate_net_calories_burned(
        met_value=get_activity_log_met(activity_log),
        weight_kg=activity_log.user.weight_kg,
        duration_minutes=activity_log.duration_minutes,
    )


def calculate_timing_expires_at(logged_at, timing_window_minutes: int = TIMING_WINDOW_MINUTES):
    """Calculate the recovery timing deadline as logged_at plus the anabolic window in minutes."""

    return logged_at + timedelta(minutes=timing_window_minutes)


def get_timing_window_metadata(logged_at, timing_window_minutes: int = TIMING_WINDOW_MINUTES) -> dict:
    """Build timing metadata for recovery nutrition using the activity timestamp and 60-minute window."""

    return {
        "timing_window_minutes": timing_window_minutes,
        "timing_expires_at": calculate_timing_expires_at(logged_at, timing_window_minutes),
    }


def strip_json_object(raw_text: str) -> str:
    """Normalize AI output by removing optional markdown fences around a JSON object."""

    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    start_index = cleaned.find("{")
    end_index = cleaned.rfind("}")
    if start_index != -1 and end_index != -1:
        cleaned = cleaned[start_index : end_index + 1]
    return cleaned


def is_core_exercise_name(name: str) -> bool:
    """Return whether an exercise name looks like a core or abdominal movement."""

    lower_name = name.lower()
    core_terms = ("plank", "plancha", "abs", "abdominal", "crunch", "sit up", "hollow", "core")
    return any(term in lower_name for term in core_terms)


def is_lower_body_exercise_name(name: str) -> bool:
    """Return whether an exercise name looks lower-body dominant."""

    lower_name = name.lower()
    lower_terms = (
        "squat",
        "sentadilla",
        "deadlift",
        "peso muerto",
        "leg press",
        "prensa",
        "lunge",
        "zancada",
        "hip thrust",
        "glute",
        "glúteo",
        "calf",
        "gemelo",
    )
    return any(term in lower_name for term in lower_terms)


def is_bodyweight_exercise_name(name: str) -> bool:
    """Return whether an exercise is normally performed with body weight as the load."""

    lower_name = name.lower()
    bodyweight_terms = (
        "plank",
        "plancha",
        "push up",
        "push-up",
        "flexion",
        "flexión",
        "pull up",
        "pull-up",
        "dominada",
        "dip",
        "fondos",
        "burpee",
        "mountain climber",
        "jump",
        "salto",
        "bodyweight",
        "peso corporal",
        "air squat",
        "sentadilla libre",
        "swimming",
        "natacion",
        "natación",
    )
    return any(term in lower_name for term in bodyweight_terms)


def parse_external_weight_kg(value):
    """Parse optional external exercise load without treating bodyweight labels as numeric load."""

    if value in (None, ""):
        return None
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"bodyweight", "body weight", "peso corporal", "bw", "pc"}:
            return None
        normalized = normalized.replace("kg", "").replace(",", ".").strip()
        if not normalized:
            return None
        value = normalized
    return round(max(float(value), 0.0), 1)


def infer_uses_bodyweight(name: str, item: dict, parsed_weight_kg) -> bool:
    """Infer whether body weight is the meaningful load for an exercise."""

    explicit = item.get("uses_bodyweight")
    if explicit is True:
        return True
    if explicit is False and parsed_weight_kg is not None:
        return False

    raw_weight = str(item.get("weight_kg") or "").strip().lower()
    if raw_weight in {"bodyweight", "body weight", "peso corporal", "bw", "pc"}:
        return True
    if parsed_weight_kg is None and is_bodyweight_exercise_name(name):
        return True
    return False


def build_exercise_load_label(exercise: dict) -> str:
    """Return a clear display label for external load vs bodyweight work."""

    if exercise.get("uses_bodyweight"):
        return "Bodyweight"
    if exercise.get("weight_kg") not in (None, ""):
        return f"{exercise['weight_kg']} kg"
    return "No external load"


def normalize_seconds_per_rep(name: str, exercise_type: str, value=None) -> float:
    """Normalize rep tempo, allowing longer per-rep durations for static holds."""

    is_hold = is_core_exercise_name(name) and any(term in name.lower() for term in ("plank", "plancha", "hold"))
    if value not in (None, ""):
        seconds = Decimal(str(value))
    elif is_hold:
        seconds = Decimal("30")
    elif exercise_type == "cardio_burst":
        seconds = Decimal("2")
    else:
        seconds = DEFAULT_SECONDS_PER_REP

    max_seconds = Decimal("180") if is_hold else Decimal("8")
    seconds = min(max(seconds, Decimal("1")), max_seconds)
    return float(seconds.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def normalize_exercise_payload(item: dict) -> dict:
    """Coerce an AI/manual exercise row into the stable routine JSON shape."""

    name = str(item.get("name") or "Unnamed exercise").strip() or "Unnamed exercise"
    exercise_type = str(item.get("exercise_type") or "compound").lower()
    if exercise_type not in {"compound", "isolation", "cardio_burst"}:
        exercise_type = "compound"

    weight_kg = parse_external_weight_kg(item.get("weight_kg"))
    uses_bodyweight = infer_uses_bodyweight(name, item, weight_kg)

    normalized = {
        "name": name,
        "sets": max(int(item.get("sets") or 1), 1),
        "reps": max(int(item.get("reps") or 1), 1),
        "weight_kg": weight_kg,
        "uses_bodyweight": uses_bodyweight,
        "seconds_per_rep": normalize_seconds_per_rep(name, exercise_type, item.get("seconds_per_rep")),
        "rest_seconds": max(int(item.get("rest_seconds") or 90), 0),
        "exercise_type": exercise_type,
    }
    if item.get("met_value") not in (None, ""):
        normalized["met_value"] = float(clamp_adjusted_met(item["met_value"]))
    return normalized


def normalize_routine_payload(payload: dict) -> dict:
    """Normalize a parsed routine into the response shape expected by the frontend."""

    exercises = [
        normalize_exercise_payload(item)
        for item in payload.get("exercises", [])
        if isinstance(item, dict)
    ]
    muscle_groups = [
        str(group).strip().lower()
        for group in payload.get("muscle_groups", [])
        if str(group).strip()
    ]
    duration = max(int(payload.get("estimated_duration_minutes") or 60), 1)

    return {
        "suggested_name": str(payload.get("suggested_name") or "Gym Routine").strip() or "Gym Routine",
        "exercises": exercises,
        "estimated_duration_minutes": duration,
        "muscle_groups": muscle_groups,
        "parsing_notes": str(payload.get("parsing_notes") or "").strip(),
    }


def infer_exercise_type_from_name(name: str) -> str:
    """Infer an exercise type from common English and Spanish exercise names."""

    lower_name = name.lower()
    cardio_terms = ("jump", "salto", "burpee", "rope", "soga", "battle", "sled", "trineo", "carrera")
    isolation_terms = (
        "curl",
        "extension",
        "extensión",
        "raise",
        "elevacion",
        "elevación",
        "fly",
        "apertura",
        "pullover",
    )
    if any(term in lower_name for term in cardio_terms):
        return "cardio_burst"
    if any(term in lower_name for term in isolation_terms):
        return "isolation"
    return "compound"


def infer_muscle_groups_from_exercises(exercises: list[dict]) -> list[str]:
    """Infer rough muscle groups from exercise names when AI parsing cannot return JSON."""

    keyword_groups = {
        "quads": ("squat", "sentadilla", "leg press", "prensa", "quad", "cuadriceps", "cuádriceps"),
        "glutes": ("squat", "sentadilla", "hip thrust", "glute", "glúteo", "gluteo"),
        "hamstrings": ("deadlift", "peso muerto", "curl femoral", "femoral", "hamstring"),
        "chest": ("bench", "banca", "press pecho", "chest", "pecho", "push up", "flexion", "flexión"),
        "back": ("row", "remo", "pulldown", "jalon", "jalón", "dominada", "pull up", "back", "espalda"),
        "shoulders": ("shoulder", "hombro", "military", "militar", "lateral", "press"),
        "biceps": ("curl", "bicep", "bíceps", "biceps"),
        "triceps": ("tricep", "tríceps", "triceps", "extension", "extensión"),
        "core": ("abs", "abdominal", "core", "plank", "plancha"),
        "calves": ("calf", "gemelo", "pantorrilla"),
    }
    names = " ".join(exercise["name"].lower() for exercise in exercises)
    groups = [
        group
        for group, keywords in keyword_groups.items()
        if any(keyword in names for keyword in keywords)
    ]
    return groups or ["full_body"]


def clean_fallback_exercise_name(name: str) -> str:
    """Clean labels and leftover load notation from regex-parsed exercise names."""

    cleaned = re.sub(r"\b\d+(?:[.,]\d+)?\s*(?:kg|kgs|kilos?)\b", "", name, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(?:sets?|series?|reps?|repeticiones?)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[:\-–]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,.")
    return cleaned.title() if cleaned else "Exercise"


def parse_fallback_exercise_segment(segment: str) -> dict | None:
    """Parse a common routine text segment without AI as a last-resort fallback."""

    cleaned = segment.strip()
    if len(cleaned) < 4:
        return None

    patterns = [
        re.compile(
            r"(?P<sets>\d+)\s*[x×]\s*(?P<reps>\d+)(?:\s*-\s*\d+)?\s+"
            r"(?P<name>.*?)(?:\s+(?P<weight>\d+(?:[.,]\d+)?)\s*(?:kg|kgs|kilos?)\b)?$",
            re.IGNORECASE,
        ),
        re.compile(
            r"(?P<name>.*?)\s+(?P<sets>\d+)\s*[x×]\s*(?P<reps>\d+)(?:\s*-\s*\d+)?"
            r"(?:.*?(?P<weight>\d+(?:[.,]\d+)?)\s*(?:kg|kgs|kilos?)\b)?$",
            re.IGNORECASE,
        ),
        re.compile(
            r"(?P<name>.*?)\s*:?\s*(?P<sets>\d+)\s*(?:sets?|series?)\s*(?:of|de)?\s*"
            r"(?P<reps>\d+)(?:\s*-\s*\d+)?(?:\s*(?:reps?|repeticiones?))?"
            r"(?:.*?(?P<weight>\d+(?:[.,]\d+)?)\s*(?:kg|kgs|kilos?)\b)?",
            re.IGNORECASE,
        ),
    ]

    for pattern in patterns:
        match = pattern.search(cleaned)
        if not match:
            continue

        name = clean_fallback_exercise_name(match.group("name") or "")
        if not name or name.lower() in {"kg", "kilos", "sets", "series"}:
            continue

        weight = match.groupdict().get("weight")
        weight_kg = float(weight.replace(",", ".")) if weight else None
        return normalize_exercise_payload(
            {
                "name": name,
                "sets": int(match.group("sets")),
                "reps": int(match.group("reps")),
                "weight_kg": weight_kg,
                "rest_seconds": 90,
                "exercise_type": infer_exercise_type_from_name(name),
            }
        )

    return None


def fallback_parse_routine_from_text(raw_text: str) -> dict:
    """Build a conservative routine from common text patterns when AI JSON parsing fails."""

    normalized_text = raw_text.replace("×", "x").replace("–", "-")
    segments = [
        segment.strip()
        for segment in re.split(r"[\n;,]+", normalized_text)
        if segment.strip()
    ]
    exercises = []
    for segment in segments:
        parsed = parse_fallback_exercise_segment(segment)
        if parsed:
            exercises.append(parsed)

    if not exercises:
        raise ValueError("Could not detect exercises in this routine file.")

    total_sets = sum(exercise["sets"] for exercise in exercises)
    estimated_duration = min(max((total_sets * 3) + 10, 20), 180)
    return normalize_routine_payload(
        {
            "suggested_name": "Imported Routine",
            "exercises": exercises,
            "estimated_duration_minutes": estimated_duration,
            "muscle_groups": infer_muscle_groups_from_exercises(exercises),
            "parsing_notes": "Used fallback parser after AI returned malformed JSON. Review exercises before saving.",
        }
    )


def build_routine_parse_prompt(source_description: str, user_weight_kg, raw_text: str | None = None) -> str:
    """Build the shared Groq prompt for converting routine notes into structured JSON."""

    text_section = f'\nRoutine text:\n"{raw_text}"\n' if raw_text else ""
    return f"""
Parse this gym routine into structured JSON.
Source: {source_description}
User weight: {user_weight_kg} kg
{text_section}

Return ONLY a valid JSON object, no markdown, no explanation:
{{
  "suggested_name": "Push Day",
  "exercises": [
    {{
      "name": "Barbell Squat",
      "sets": 4,
      "reps": 8,
      "weight_kg": 80,
      "uses_bodyweight": false,
      "seconds_per_rep": 3,
      "rest_seconds": 90,
      "exercise_type": "compound"
    }}
  ],
  "estimated_duration_minutes": 60,
  "muscle_groups": ["quads", "glutes", "hamstrings"],
  "parsing_notes": "Assumed 90s rest between sets where not specified"
}}

exercise_type values:
- "compound": multi-joint movements such as squat, deadlift, bench, row, press
- "isolation": single-joint movements such as curl, extension, lateral raise
- "cardio_burst": box jumps, battle ropes, sled push, conditioning intervals

For weight_kg: only store external load if explicitly written. Do not invent machine/barbell load.
For uses_bodyweight: true for planks, push-ups, pull-ups, dips, bodyweight squats/lunges, burpees, jumps, swimming, or similar bodyweight movements.
If weight is not mentioned, set weight_kg to null.
For seconds_per_rep: use 3 for normal resistance reps, 2 for fast/cardio reps, and 1 if reps represent seconds in holds such as planks.
If reps is a range like "8-12", use the lower number.
Return ONLY the JSON object.
""".strip()


def parse_routine_json_response(raw_response: str) -> dict:
    """Parse and normalize the JSON object returned by Groq routine parsing."""

    if not raw_response:
        raise GroqServiceError("Groq returned an empty routine parsing response.")

    try:
        payload = json.loads(strip_json_object(raw_response))
    except json.JSONDecodeError as exc:
        raise ValueError("Groq returned an invalid routine JSON payload.") from exc

    if not isinstance(payload, dict):
        raise ValueError("Groq routine parsing response must be a JSON object.")
    return normalize_routine_payload(payload)


def repair_routine_json_response(raw_response: str, source_text: str | None = None, user_weight_kg=None) -> dict:
    """Ask Groq for one strict JSON-only repair pass when the first response is not valid JSON."""

    source_block = f"\nOriginal routine source:\n{source_text[:6000]}\n" if source_text else ""
    prompt = f"""
The previous AI output was not valid JSON. Convert the routine information into this exact JSON object shape.
Return ONLY valid JSON. No markdown. No explanation.

User weight: {user_weight_kg or "unknown"} kg
Previous invalid output:
{raw_response[:6000]}
{source_block}

Required JSON shape:
{{
  "suggested_name": "Routine name",
  "exercises": [
    {{
      "name": "Exercise name",
      "sets": 3,
      "reps": 10,
      "weight_kg": null,
      "uses_bodyweight": false,
      "seconds_per_rep": 3,
      "rest_seconds": 90,
      "exercise_type": "compound"
    }}
  ],
  "estimated_duration_minutes": 60,
  "muscle_groups": ["chest", "shoulders"],
  "parsing_notes": "Short note about assumptions"
}}

Rules:
- exercise_type must be one of: compound, isolation, cardio_burst
- weight_kg must be a number or null
- uses_bodyweight must be true only when body weight is the meaningful load
- seconds_per_rep must be a number between 1 and 8
- If details are missing, make conservative assumptions and explain them in parsing_notes
- Always include at least one exercise if any exercise-like text exists
""".strip()

    model = get_model(temperature=0)
    repaired_response = model.generate_content(prompt)
    repaired_text = getattr(repaired_response, "text", "").strip()
    try:
        return parse_routine_json_response(repaired_text)
    except ValueError as exc:
        if source_text:
            try:
                return fallback_parse_routine_from_text(source_text)
            except ValueError:
                pass
        raise ValueError(
            "The AI could not structure this routine. Try a clearer image/PDF or paste the routine text."
        ) from exc


def parse_routine_response_with_repair(raw_response: str, source_text: str | None = None, user_weight_kg=None) -> dict:
    """Parse Groq routine output, repairing malformed JSON once before surfacing an error."""

    try:
        return parse_routine_json_response(raw_response)
    except ValueError:
        return repair_routine_json_response(raw_response, source_text=source_text, user_weight_kg=user_weight_kg)


def parse_routine_from_text(raw_text: str, user_weight_kg) -> dict:
    """
    Convert free-text gym routine notes into structured JSON using Groq.

    The prompt supports informal Spanish or English routine formats and asks the
    model to infer missing rest periods and exercise types without inventing
    weights that were not supplied.
    """

    prompt = build_routine_parse_prompt(
        source_description="free-text routine notes",
        user_weight_kg=user_weight_kg,
        raw_text=raw_text,
    )

    model = get_model(temperature=0.1)
    response = model.generate_content(prompt)
    return parse_routine_response_with_repair(
        getattr(response, "text", "").strip(),
        source_text=raw_text,
        user_weight_kg=user_weight_kg,
    )


def get_uploaded_file_content_type(uploaded_file) -> str:
    """Resolve an uploaded routine file content type from request metadata or filename."""

    content_type = getattr(uploaded_file, "content_type", "") or ""
    guessed_type, _ = mimetypes.guess_type(getattr(uploaded_file, "name", ""))
    content_type = content_type.lower()
    guessed_type = (guessed_type or "").lower()

    if content_type in {"", "application/octet-stream", "binary/octet-stream"}:
        content_type = guessed_type
    if content_type == "image/jpg":
        content_type = "image/jpeg"
    if content_type in {"application/x-pdf", "application/acrobat"}:
        content_type = "application/pdf"
    return content_type


def validate_routine_upload(uploaded_file) -> str:
    """Validate routine image/PDF uploads before sending them to local extraction or Groq Vision."""

    if not uploaded_file:
        raise ValueError("No routine file was uploaded.")
    if getattr(uploaded_file, "size", 0) > ROUTINE_UPLOAD_MAX_BYTES:
        raise ValueError("Routine files must be 8 MB or smaller.")

    content_type = get_uploaded_file_content_type(uploaded_file)
    supported_types = ROUTINE_IMAGE_CONTENT_TYPES | ROUTINE_PDF_CONTENT_TYPES | ROUTINE_TEXT_CONTENT_TYPES
    if content_type not in supported_types:
        detected = content_type or "unknown"
        raise ValueError(
            f"Unsupported file type ({detected}). Upload a JPG, PNG, WEBP, PDF, TXT, CSV, or Markdown routine."
        )
    return content_type


def parse_routine_from_image_data_urls(image_data_urls: list[str], user_weight_kg, source_description: str) -> dict:
    """Use Groq Vision to parse one or more routine images."""

    prompt = build_routine_parse_prompt(
        source_description=source_description,
        user_weight_kg=user_weight_kg,
    )
    content = [{"type": "text", "text": prompt}]
    content.extend(
        {"type": "image_url", "image_url": {"url": data_url}}
        for data_url in image_data_urls[:ROUTINE_MAX_PDF_IMAGES]
    )

    model = get_vision_model(temperature=0.1)
    response = model.generate_messages(
        [
            {
                "role": "user",
                "content": content,
            }
        ]
    )
    return parse_routine_response_with_repair(getattr(response, "text", "").strip(), user_weight_kg=user_weight_kg)


def parse_routine_from_image(uploaded_file, content_type: str, user_weight_kg) -> dict:
    """Use Groq Vision to parse a photo or screenshot of a gym routine."""

    uploaded_file.seek(0)
    encoded_file = base64.b64encode(uploaded_file.read()).decode("ascii")
    data_url = f"data:{content_type};base64,{encoded_file}"
    return parse_routine_from_image_data_urls(
        [data_url],
        user_weight_kg=user_weight_kg,
        source_description="an uploaded image of handwritten or typed gym routine notes",
    )


def extract_text_from_routine_pdf(uploaded_file, max_pages: int = 6) -> str:
    """Extract selectable text from a PDF routine so the normal Groq text parser can handle it."""

    from pypdf import PdfReader

    uploaded_file.seek(0)
    try:
        reader = PdfReader(uploaded_file)
        page_text = [
            page.extract_text() or ""
            for page in reader.pages[:max_pages]
        ]
    except Exception as exc:
        raise ValueError("Could not read this PDF. Try exporting it again or upload an image.") from exc

    extracted_text = "\n".join(page_text).strip()
    if len(extracted_text) < 12:
        raise ValueError(
            "This PDF looks scanned or image-only. Upload a JPG/PNG screenshot of the routine instead."
        )
    return extracted_text


def get_image_content_type_from_name(name: str) -> str | None:
    """Map extracted PDF image names to Groq-supported image content types."""

    guessed_type, _ = mimetypes.guess_type(name)
    guessed_type = (guessed_type or "").lower()
    if guessed_type == "image/jpg":
        guessed_type = "image/jpeg"
    if guessed_type in ROUTINE_IMAGE_CONTENT_TYPES:
        return guessed_type
    return None


def extract_image_data_urls_from_pdf(uploaded_file, max_pages: int = 6) -> list[str]:
    """Extract embedded JPG/PNG/WEBP images from scanned PDFs for Groq Vision parsing."""

    from pypdf import PdfReader

    uploaded_file.seek(0)
    try:
        reader = PdfReader(uploaded_file)
        image_data_urls = []
        for page in reader.pages[:max_pages]:
            for image in getattr(page, "images", []):
                content_type = get_image_content_type_from_name(getattr(image, "name", ""))
                image_data = getattr(image, "data", b"") or b""
                if not content_type or len(image_data) < 2048:
                    continue
                encoded_image = base64.b64encode(image_data).decode("ascii")
                image_data_urls.append(f"data:{content_type};base64,{encoded_image}")
                if len(image_data_urls) >= ROUTINE_MAX_PDF_IMAGES:
                    return image_data_urls
    except Exception as exc:
        raise ValueError("Could not extract images from this PDF. Try uploading a screenshot instead.") from exc

    return image_data_urls


def parse_text_file(uploaded_file) -> str:
    """Read a plain text-like routine file safely."""

    uploaded_file.seek(0)
    raw_bytes = uploaded_file.read()
    for encoding in ("utf-8", "latin-1"):
        try:
            text = raw_bytes.decode(encoding).strip()
            break
        except UnicodeDecodeError:
            text = ""
    if len(text) < 3:
        raise ValueError("This text file appears to be empty.")
    return text


def parse_routine_from_file(uploaded_file, user_weight_kg) -> dict:
    """Parse an uploaded routine image or text-based PDF into structured routine JSON using Groq."""

    content_type = validate_routine_upload(uploaded_file)
    if content_type in ROUTINE_IMAGE_CONTENT_TYPES:
        return parse_routine_from_image(uploaded_file, content_type, user_weight_kg)

    if content_type in ROUTINE_TEXT_CONTENT_TYPES:
        return parse_routine_from_text(parse_text_file(uploaded_file), user_weight_kg)

    text_error = None
    try:
        extracted_text = extract_text_from_routine_pdf(uploaded_file)
        parsed = parse_routine_from_text(extracted_text, user_weight_kg)
        parsed["parsing_notes"] = (
            f"Extracted text from PDF. {parsed.get('parsing_notes', '')}".strip()
        )
        return parsed
    except ValueError as exc:
        text_error = exc

    image_data_urls = extract_image_data_urls_from_pdf(uploaded_file)
    if image_data_urls:
        parsed = parse_routine_from_image_data_urls(
            image_data_urls,
            user_weight_kg=user_weight_kg,
            source_description="images extracted from an uploaded PDF routine",
        )
        parsed["parsing_notes"] = (
            f"Read routine from PDF images. {parsed.get('parsing_notes', '')}".strip()
        )
        return parsed

    raise ValueError(
        f"Could not read this PDF as text or images. Last text attempt: {text_error}. "
        "Try uploading a clearer screenshot, JPG, PNG, WEBP, TXT, CSV, or Markdown file."
    )


def calculate_volume_load_kg(exercises: list[dict]) -> float:
    """Estimate external load volume for display only, not for calorie formulas."""

    volume = 0.0
    for exercise in exercises:
        weight = exercise.get("weight_kg")
        if weight in (None, ""):
            continue
        volume += (
            max(float(exercise.get("sets") or 0), 0)
            * max(float(exercise.get("reps") or 0), 0)
            * max(float(weight), 0)
        )
    return round(volume, 1)


def clamp_adjusted_met(value) -> Decimal:
    """Keep AI-adjusted resistance-training MET values within the supported 2.5 to 8.0 range."""

    met = Decimal(str(value))
    met = min(max(met, Decimal("2.5")), Decimal("8.0"))
    return quantize(met)


def classify_met_intensity(met_value: Decimal) -> str:
    """Classify routine intensity from the final adjusted MET value."""

    met = float(met_value)
    if met < 3.5:
        return "low"
    if met < 4.7:
        return "moderate"
    if met < 6.1:
        return "moderate-high"
    if met < 7.2:
        return "high"
    return "very-high"


def calculate_local_routine_met(exercises: list[dict], user_weight_kg, duration_minutes: int, muscle_groups=None) -> Decimal:
    """
    Calculate a routine-specific MET estimate as a guardrail.

    Formula components:
    - each exercise gets its own MET based on movement type, rest density, bodyweight status, and reps
    - routine MET is the time-weighted average of exercise-level MET values
    - external load weight is intentionally not used as moved mass in the formula
    """

    if not exercises:
        return Decimal("3.50")

    weighted_met_sum = Decimal("0")
    total_seconds = Decimal("0")
    for exercise in exercises:
        normalized = normalize_exercise_payload(exercise)
        timing = calculate_exercise_time_seconds(normalized)
        exercise_seconds = max(timing["total_seconds"], Decimal("1"))
        weighted_met_sum += estimate_exercise_met(normalized, user_weight_kg) * exercise_seconds
        total_seconds += exercise_seconds

    met = weighted_met_sum / max(total_seconds, Decimal("1"))
    return clamp_adjusted_met(met.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def bounded_ai_met(ai_met, local_met: Decimal) -> Decimal:
    """Allow Groq to nudge MET slightly, but prevent copied/example values from dominating."""

    try:
        candidate = Decimal(str(ai_met))
    except Exception:
        return local_met

    lower_bound = max(local_met - Decimal("0.4"), Decimal("2.5"))
    upper_bound = min(local_met + Decimal("0.4"), Decimal("8.0"))
    bounded = min(max(candidate, lower_bound), upper_bound)
    return bounded.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def calculate_exercise_time_seconds(exercise: dict) -> dict[str, Decimal]:
    """
    Calculate total work time for a routine exercise.

    Formula:
    - execution_seconds = sets × reps × seconds_per_rep
    - pause_seconds = (sets - 1) × rest_seconds
    - total_seconds = execution_seconds + pause_seconds
    """

    normalized = normalize_exercise_payload(exercise)
    sets = Decimal(str(normalized["sets"]))
    reps = Decimal(str(normalized["reps"]))
    seconds_per_rep = Decimal(str(normalized["seconds_per_rep"]))
    rest_seconds = Decimal(str(normalized["rest_seconds"]))
    execution_seconds = sets * reps * seconds_per_rep
    pause_seconds = max(sets - Decimal("1"), Decimal("0")) * rest_seconds
    return {
        "execution_seconds": execution_seconds,
        "pause_seconds": pause_seconds,
        "total_seconds": execution_seconds + pause_seconds,
    }


def estimate_exercise_met(exercise: dict, user_weight_kg) -> Decimal:
    """
    Assign an exercise-level MET from movement type and intensity.

    Heuristics:
    - core and abdominal work starts near 3.5 MET
    - moderate resistance work starts near 5.0 MET
    - intense compound/lower-body work moves toward 6-7 MET
    - cardio bursts and dense conditioning move toward 7-8 MET
    - external exercise load is not used as moved body mass; it stays informational
    """

    normalized = normalize_exercise_payload(exercise)
    if normalized.get("met_value") not in (None, ""):
        return clamp_adjusted_met(normalized["met_value"]).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

    name = normalized["name"]
    exercise_type = normalized["exercise_type"]
    sets = Decimal(str(normalized["sets"]))
    reps = Decimal(str(normalized["reps"]))
    rest_seconds = Decimal(str(normalized["rest_seconds"]))
    uses_bodyweight = bool(normalized.get("uses_bodyweight"))

    if is_core_exercise_name(name):
        met = Decimal("3.5")
        if reps >= Decimal("20") or sets >= Decimal("4"):
            met += Decimal("0.3")
    elif exercise_type == "cardio_burst":
        met = Decimal("7.0")
        if rest_seconds <= Decimal("45"):
            met += Decimal("0.6")
        if uses_bodyweight:
            met += Decimal("0.2")
    elif exercise_type == "isolation":
        met = Decimal("4.0")
        if sets >= Decimal("4") and rest_seconds <= Decimal("60"):
            met += Decimal("0.4")
        if reps >= Decimal("15"):
            met += Decimal("0.2")
    else:
        met = Decimal("5.0")
        if is_lower_body_exercise_name(name):
            met += Decimal("0.6")
        if uses_bodyweight:
            met += Decimal("0.3")
        if reps >= Decimal("15"):
            met += Decimal("0.2")
        if reps <= Decimal("6"):
            met += Decimal("0.3")
        if rest_seconds <= Decimal("60"):
            met += Decimal("0.4")
        elif rest_seconds >= Decimal("150"):
            met -= Decimal("0.3")

    return clamp_adjusted_met(met.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def calculate_routine_calorie_breakdown(exercises: list[dict], user_weight_kg) -> list[dict]:
    """
    Calculate routine calories exercise by exercise.

    Formula per exercise:
    - calories = exercise_MET × user_weight_kg × (total_seconds / 3600)
    - total routine calories = sum(exercise calories)
    """

    weight = Decimal(str(user_weight_kg or 0))
    breakdown = []
    for exercise in exercises:
        normalized = normalize_exercise_payload(exercise)
        timing = calculate_exercise_time_seconds(normalized)
        met_value = estimate_exercise_met(normalized, user_weight_kg)
        calories = (met_value * weight * (timing["total_seconds"] / Decimal("3600"))).quantize(
            Decimal("0.1"),
            rounding=ROUND_HALF_UP,
        )
        breakdown.append(
            {
                "name": normalized["name"],
                "sets": normalized["sets"],
                "reps": normalized["reps"],
                "weight_kg": normalized["weight_kg"],
                "uses_bodyweight": normalized["uses_bodyweight"],
                "load_label": build_exercise_load_label(normalized),
                "seconds_per_rep": normalized["seconds_per_rep"],
                "rest_seconds": normalized["rest_seconds"],
                "execution_seconds": float(timing["execution_seconds"]),
                "pause_seconds": float(timing["pause_seconds"]),
                "total_seconds": float(timing["total_seconds"]),
                "met_value": float(met_value),
                "calories": float(calories),
            }
        )
    return breakdown


def calculate_routine_calorie_summary(exercises: list[dict], user_weight_kg) -> dict:
    """Summarize exercise-level routine calories, duration, and detailed breakdown."""

    breakdown = calculate_routine_calorie_breakdown(exercises, user_weight_kg)
    total_calories = sum((Decimal(str(item["calories"])) for item in breakdown), Decimal("0"))
    total_seconds = sum((Decimal(str(item["total_seconds"])) for item in breakdown), Decimal("0"))
    return {
        "total_calories": float(total_calories.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
        "calculated_duration_minutes": float((total_seconds / Decimal("60")).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
        "breakdown": breakdown,
    }


def analyze_routine_met(routine: GymRoutine, user_weight_kg) -> dict:
    """
    Estimate a routine-specific MET value from actual resistance-training volume.

    Generic resistance training is often stored as MET 3.5. This routine analysis
    asks Groq for muscle-group and explanation context, while NutriPost keeps the
    final MET anchored to its local formula so repeated/example AI values do not
    flatten every routine into the same calorie result.
    """

    exercises = [normalize_exercise_payload(item) for item in routine.exercises]
    exercises_summary = "\n".join(
        (
            f"- {exercise['name']}: {exercise['sets']}x{exercise['reps']} "
            f"load: {build_exercise_load_label(exercise)}, "
            f"{exercise['seconds_per_rep']}s/rep, "
            f"{exercise['rest_seconds']}s rest, type: {exercise['exercise_type']}"
        )
        for exercise in exercises
    )
    fallback_volume = calculate_volume_load_kg(exercises)
    calorie_summary = calculate_routine_calorie_summary(exercises, user_weight_kg)
    local_met = calculate_local_routine_met(
        exercises,
        user_weight_kg=user_weight_kg,
        duration_minutes=routine.estimated_duration_minutes,
        muscle_groups=routine.muscle_groups,
    )
    local_intensity = classify_met_intensity(local_met)

    prompt = f"""
You are an exercise physiologist. Estimate the MET (Metabolic Equivalent of Task)
value for this specific gym routine.

User weight: {user_weight_kg} kg
Routine name: {routine.name}
Duration: {routine.estimated_duration_minutes} minutes
External load total for display only: {fallback_volume} kg
Exercise-by-exercise calorie estimate: {calorie_summary['total_calories']} kcal
Local guardrail MET estimate: {local_met}
Local intensity classification: {local_intensity}
Exercises:
{exercises_summary}

MET reference scale for resistance training:
- 2.5: very light, isolation only, long rests over 3 minutes, low weight
- 3.5: standard weight training, ACSM generic value
- 4.5: moderate volume, mix of compound and isolation, 90s rests
- 5.5: high volume compound movements, 60s rests, moderate-heavy weight
- 6.5: heavy compound squat/deadlift focus, short rests, high volume
- 7.5: circuit training, minimal rest, full body compound movements
- 8.0: extreme density training, supersets, drop sets, 30s rest

Consider:
1. Percentage of compound vs isolation exercises
2. Major muscle groups involved, with legs having the highest metabolic cost
3. Execution time = sets x reps x seconds_per_rep
4. Average rest period across exercises
5. Overall session density
6. External exercise weight is informational only and must not inflate calorie estimates.

Return ONLY a valid JSON object:
{{
  "adjusted_met": {local_met},
  "muscle_groups": ["quads", "glutes"],
  "justification": "Brief evidence-based explanation using this routine's actual exercises, rep tempo, rest, bodyweight status, and density.",
  "volume_load_kg": {fallback_volume},
  "intensity_classification": "{local_intensity}"
}}

The adjusted_met must stay within 0.4 MET of the local guardrail unless the routine data clearly proves otherwise.
Do not copy example numbers. Use this routine only.
Return ONLY the JSON. No markdown. No explanation outside the JSON.
""".strip()

    model = get_model(temperature=0.2)
    response = model.generate_content(prompt)
    raw_response = getattr(response, "text", "").strip()
    if not raw_response:
        raise GroqServiceError("Groq returned an empty routine analysis response.")

    try:
        payload = json.loads(strip_json_object(raw_response))
    except json.JSONDecodeError as exc:
        raise ValueError("Groq returned an invalid routine analysis JSON payload.") from exc

    if not isinstance(payload, dict):
        raise ValueError("Groq routine analysis response must be a JSON object.")

    groq_suggested_met = bounded_ai_met(payload.get("adjusted_met"), local_met)
    adjusted_met = local_met
    muscle_groups = [
        str(group).strip().lower()
        for group in payload.get("muscle_groups", routine.muscle_groups or [])
        if str(group).strip()
    ] or infer_muscle_groups_from_exercises(exercises)
    result = {
        "adjusted_met": float(adjusted_met),
        "muscle_groups": muscle_groups,
        "justification": str(
            payload.get("justification")
            or f"Routine analyzed from exercise volume, rest density, and a local MET guardrail of {local_met}."
        ).strip(),
        "volume_load_kg": float(payload.get("volume_load_kg") or fallback_volume),
        "intensity_classification": str(payload.get("intensity_classification") or classify_met_intensity(adjusted_met)).strip(),
        "local_guardrail_met": float(local_met),
        "groq_suggested_met": float(groq_suggested_met),
        "calorie_summary": calorie_summary,
    }

    routine.exercises = exercises
    routine.adjusted_met = adjusted_met
    routine.muscle_groups = result["muscle_groups"]
    routine.ai_analysis = result["justification"]
    routine.last_analyzed_at = timezone.now()
    routine.save(
        update_fields=[
            "exercises",
            "adjusted_met",
            "muscle_groups",
            "ai_analysis",
            "last_analyzed_at",
            "updated_at",
        ]
    )
    for activity_log in routine.activity_logs.select_related("user", "activity_type", "gym_routine"):
        activity_log.calories_burned = calculate_activity_log_net_calories(activity_log)
        activity_log.save(update_fields=["calories_burned"])
    return result


def seed_activity_types() -> list[ActivityType]:
    """Create or update the default set of activity types using official-style MET values."""
    created_items = []
    for payload in ACTIVITY_SEED_DATA:
        activity_type, _ = ActivityType.objects.update_or_create(
            name=payload["name"],
            defaults=payload,
        )
        created_items.append(activity_type)
    return created_items


def seed_demo_user_data(user: User, days: int = 30) -> None:
    """Generate portfolio-friendly activity logs and food logs for a demo experience."""
    from apps.nutrition.models import FoodLog
    from apps.nutrition.services import ensure_daily_goal, get_or_create_meal_recommendation

    activity_types = list(ActivityType.objects.all())
    if not activity_types:
        activity_types = seed_activity_types()

    FoodLog.objects.filter(user=user).delete()
    ActivityLog.objects.filter(user=user).delete()

    meal_types = ["breakfast", "lunch", "dinner", "snack", "post_workout"]
    food_templates = [
        {"food_name": "Greek Yogurt Bowl", "calories": 220, "protein_g": 18, "carbs_g": 22, "fat_g": 6},
        {"food_name": "Chicken Rice Plate", "calories": 430, "protein_g": 34, "carbs_g": 42, "fat_g": 10},
        {"food_name": "Banana Protein Smoothie", "calories": 310, "protein_g": 24, "carbs_g": 38, "fat_g": 5},
        {"food_name": "Oatmeal with Berries", "calories": 260, "protein_g": 10, "carbs_g": 44, "fat_g": 5},
    ]

    for offset in range(days):
        logged_at = timezone.now() - timedelta(days=offset, hours=randint(0, 12))
        activity_type = choice(activity_types)
        duration_minutes = randint(20, 75)
        activity_log = ActivityLog.objects.create(
            user=user,
            activity_type=activity_type,
            duration_minutes=duration_minutes,
            notes=f"Demo session focused on {activity_type.name.lower()} volume.",
            logged_at=logged_at,
        )
        ensure_daily_goal(user, logged_at.date())
        get_or_create_meal_recommendation(activity_log)

        for index in range(randint(2, 4)):
            template = choice(food_templates)
            quantity_g = Decimal(str(round(uniform(120, 280), 2)))
            ratio = quantity_g / Decimal("100")
            FoodLog.objects.create(
                user=user,
                food_name=template["food_name"],
                open_food_facts_id=f"demo-{offset}-{index}",
                calories=Decimal(str(template["calories"])) * ratio,
                protein_g=Decimal(str(template["protein_g"])) * ratio,
                carbs_g=Decimal(str(template["carbs_g"])) * ratio,
                fat_g=Decimal(str(template["fat_g"])) * ratio,
                quantity_g=quantity_g,
                meal_type=choice(meal_types),
                logged_at=logged_at + timedelta(hours=index + 1),
            )
