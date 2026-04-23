import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, FileUp, Save, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useLanguage } from "../hooks/useLanguage";
import { routineService } from "../services/routineService";
import { staggerContainer, staggerItem } from "../utils/animations";

const emptyExercise = {
  name: "",
  sets: 3,
  reps: 10,
  weight_kg: "",
  uses_bodyweight: false,
  seconds_per_rep: 3,
  rest_seconds: 90,
  exercise_type: "compound",
};

function normalizeRoutinesPayload(data) {
  return Array.isArray(data) ? data : data.results || [];
}

function muscleTextToList(value) {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeExercises(exercises) {
  return exercises
    .filter((exercise) => exercise.name.trim())
    .map((exercise) => ({
      name: exercise.name.trim(),
      sets: Number(exercise.sets) || 1,
      reps: Number(exercise.reps) || 1,
      weight_kg: exercise.weight_kg === "" || exercise.weight_kg === null ? null : Number(exercise.weight_kg),
      uses_bodyweight: Boolean(exercise.uses_bodyweight),
      seconds_per_rep: Number(exercise.seconds_per_rep) || 3,
      rest_seconds: Number(exercise.rest_seconds) || 0,
      exercise_type: exercise.exercise_type || "compound",
    }));
}

function getApiErrorMessage(error, fallback) {
  const data = error.response?.data;
  const detailMessage = data?.details?.message;
  const fileMessage = data?.details?.file;
  const nestedMessage = Array.isArray(detailMessage) ? detailMessage[0] : detailMessage;
  const nestedFileMessage = Array.isArray(fileMessage) ? fileMessage[0] : fileMessage;
  return nestedMessage || nestedFileMessage || data?.message || error.message || fallback;
}

function MetGauge({ value, isSpanish }) {
  const met = Number(value || 3.5);
  const percent = Math.min(Math.max(((met - 2.5) / 5.5) * 100, 0), 100);
  const label = met >= 7
    ? isSpanish ? "muy alto" : "very high"
    : met >= 5.5
      ? isSpanish ? "alto" : "high"
      : met >= 4.2
        ? isSpanish ? "medio" : "medium"
        : isSpanish ? "bajo" : "low";

  return (
    <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm uppercase tracking-[0.2em] text-primary">{isSpanish ? "MET ajustado" : "Adjusted MET"}</p>
        <span className="rounded-full bg-background/60 px-3 py-1 text-xs capitalize text-textMuted">{label}</span>
      </div>
      <motion.p
        key={met}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-5xl font-bold tracking-tight"
      >
        {met.toFixed(1)}
      </motion.p>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-background/70">
        <motion.div
          initial={{ width: "18%" }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-secondary"
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-textMuted">
        <span>{isSpanish ? "2.5 liviano" : "2.5 light"}</span>
        <span>{isSpanish ? "8.0 intenso" : "8.0 dense"}</span>
      </div>
    </div>
  );
}

export function RoutineFormPage() {
  const { isSpanish } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [routineId, setRoutineId] = useState(id || null);
  const [tab, setTab] = useState("paste");
  const [loading, setLoading] = useState(Boolean(id));
  const [rawText, setRawText] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [muscleGroupsText, setMuscleGroupsText] = useState("");
  const [exercises, setExercises] = useState([{ ...emptyExercise }]);
  const [analysis, setAnalysis] = useState(null);
  const [parsingNotes, setParsingNotes] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const copy = isSpanish
    ? {
        loadError: "No pudimos cargar esta rutina.",
        saveError: "No pudimos guardar la rutina.",
        parseFirst: "Pega primero tu rutina.",
        parseSuccess: "Rutina interpretada. Puedes editarla antes de guardar.",
        parseError: "No pudimos interpretar esta rutina.",
        fileSuccess: "Archivo interpretado. Revísalo antes de guardar.",
        fileError: "No pudimos interpretar este archivo.",
        saveSuccess: "Rutina guardada.",
        analyzeSuccess: "Calorías de la rutina recalculadas.",
        analyzeError: "No pudimos analizar esta rutina.",
        missingName: "Ponle un nombre a la rutina.",
        missingExercises: "Agrega al menos un ejercicio.",
        editTag: "Editar rutina",
        newTag: "Nueva rutina",
        title: "Construye tu sesión exacta",
        description:
          "Pega notas desordenadas, ordénalas y calcula calorías ejercicio por ejercicio usando tempo, descanso e intensidad.",
        backToRoutines: "Volver a rutinas",
        pasteTab: "Pegar rutina",
        manualTab: "Armar manualmente",
        uploadTitle: "Sube una imagen o PDF",
        uploadText: "JPG, PNG, WEBP, PDF, TXT, CSV o Markdown. Los PDFs escaneados se leen a través de imágenes embebidas cuando es posible.",
        reading: "Leyendo...",
        chooseFile: "Elegir archivo",
        readingText: "Leyendo tu rutina y convirtiéndola en ejercicios editables...",
        orPaste: "O pega texto",
        pastePlaceholder: "Pega tu rutina como la tengas escrita. Ejemplo: 4x8 sentadilla 80kg, 3x10 press banca 60kg, 3x12 jalón 55kg",
        parsing: "Interpretando con Groq...",
        parseRoutine: "Interpretar rutina",
        routineName: "Nombre de la rutina",
        estimatedDuration: "Duración estimada",
        muscleGroups: "Grupos musculares, separados por coma",
        musclePlaceholder: "pecho, hombros, tríceps",
        descriptionLabel: "Descripción",
        descriptionPlaceholder: "Notas, intención, plan de progresión...",
        exercisePlaceholder: "Ejercicio",
        sets: "Series",
        reps: "Reps",
        secPerRep: "Seg/reps",
        rest: "Descanso",
        compound: "Compuesto",
        isolation: "Aislado",
        cardioBurst: "Explosivo/cardio",
        addExercise: "Agregar ejercicio",
        analyzingText: "Calculando calorías ejercicio por ejercicio...",
        aiJustification: "Justificación IA",
        estimatedCalories: "Calorías estimadas de la rutina",
        analyzeRoutine: "Analizar rutina",
        analyzingButton: "Analizando...",
        saveRoutine: "Guardar rutina",
        saving: "Guardando...",
      }
    : {
        loadError: "Could not load this routine.",
        saveError: "Could not save this routine.",
        parseFirst: "Paste your routine first.",
        parseSuccess: "Routine parsed. You can edit it before saving.",
        parseError: "Could not parse this routine.",
        fileSuccess: "Routine file parsed. Review it before saving.",
        fileError: "Could not parse this file.",
        saveSuccess: "Routine saved.",
        analyzeSuccess: "Routine calories recalculated.",
        analyzeError: "Could not analyze this routine.",
        missingName: "Give the routine a name.",
        missingExercises: "Add at least one exercise.",
        editTag: "Edit routine",
        newTag: "New routine",
        title: "Build your exact session",
        description:
          "Paste messy notes, clean them up, then calculate calories exercise by exercise from tempo, rest, and intensity.",
        backToRoutines: "Back to routines",
        pasteTab: "Paste your routine",
        manualTab: "Build manually",
        uploadTitle: "Upload an image or PDF",
        uploadText: "JPG, PNG, WEBP, PDF, TXT, CSV, or Markdown. Scanned PDFs are read through embedded images when possible.",
        reading: "Reading...",
        chooseFile: "Choose file",
        readingText: "Reading your routine and converting it into editable exercises...",
        orPaste: "Or paste text",
        pastePlaceholder: "Paste your routine however you have it written. Example: 4x8 squat 80kg, 3x10 bench 60kg, 3x12 lat pulldown 55kg",
        parsing: "Parsing with Groq...",
        parseRoutine: "Parse routine",
        routineName: "Routine name",
        estimatedDuration: "Estimated duration",
        muscleGroups: "Muscle groups, comma separated",
        musclePlaceholder: "chest, shoulders, triceps",
        descriptionLabel: "Description",
        descriptionPlaceholder: "Notes, intent, progression plan...",
        exercisePlaceholder: "Exercise",
        sets: "Sets",
        reps: "Reps",
        secPerRep: "Sec/rep",
        rest: "Rest",
        compound: "Compound",
        isolation: "Isolation",
        cardioBurst: "Cardio burst",
        addExercise: "Add exercise",
        analyzingText: "Calculating exercise-by-exercise calories...",
        aiJustification: "AI justification",
        estimatedCalories: "Estimated routine calories",
        analyzeRoutine: "Analyze routine",
        analyzingButton: "Analyzing...",
        saveRoutine: "Save routine",
        saving: "Saving...",
      };

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;
    const loadRoutine = async () => {
      try {
        const routine = await routineService.getRoutine(id);
        if (!active) {
          return;
        }
        setRoutineId(routine.id);
        setName(routine.name);
        setDescription(routine.description || "");
        setDuration(routine.estimated_duration_minutes || 60);
        setMuscleGroupsText(normalizeRoutinesPayload(routine.muscle_groups).join(", "));
        setExercises(routine.exercises?.length ? routine.exercises : [{ ...emptyExercise }]);
        if (routine.adjusted_met || routine.ai_analysis) {
          setAnalysis({
            adjusted_met: routine.adjusted_met,
            justification: routine.ai_analysis,
            muscle_groups: routine.muscle_groups || [],
          });
        }
      } catch (error) {
        toast.error(error.response?.data?.message || copy.loadError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadRoutine();
    return () => {
      active = false;
    };
  }, [id, copy.loadError]);

  const updateExercise = (index, field, value) => {
    setExercises((items) =>
      items.map((exercise, currentIndex) =>
        currentIndex === index ? { ...exercise, [field]: value } : exercise
      )
    );
  };

  const moveExercise = (index, direction) => {
    setExercises((items) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) {
        return items;
      }
      const copy = [...items];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  };

  const addExercise = () => {
    setExercises((items) => [...items, { ...emptyExercise }]);
  };

  const removeExercise = (index) => {
    setExercises((items) => (items.length === 1 ? items : items.filter((_, currentIndex) => currentIndex !== index)));
  };

  const buildPayload = () => {
    const normalizedExercises = normalizeExercises(exercises);
    if (!name.trim()) {
      throw new Error(copy.missingName);
    }
    if (!normalizedExercises.length) {
      throw new Error(copy.missingExercises);
    }

    return {
      name: name.trim(),
      description,
      estimated_duration_minutes: Number(duration) || 60,
      muscle_groups: muscleTextToList(muscleGroupsText),
      exercises: normalizedExercises,
    };
  };

  const persistRoutine = async () => {
    const payload = buildPayload();
    const savedRoutine = routineId
      ? await routineService.updateRoutine(routineId, payload)
      : await routineService.createRoutine(payload);
    setRoutineId(savedRoutine.id);
    return savedRoutine;
  };

  const applyParsedRoutine = (parsed) => {
    setName((current) => current || parsed.suggested_name);
    setDuration(parsed.estimated_duration_minutes || 60);
    setMuscleGroupsText((parsed.muscle_groups || []).join(", "));
    setExercises(parsed.exercises?.length ? parsed.exercises : [{ ...emptyExercise }]);
    setParsingNotes(parsed.parsing_notes || "");
    setTab("manual");
  };

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error(copy.parseFirst);
      return;
    }

    setParsing(true);
    try {
      const parsed = await routineService.parseRoutine(rawText);
      applyParsedRoutine(parsed);
      toast.success(copy.parseSuccess);
    } catch (error) {
      toast.error(getApiErrorMessage(error, copy.parseError));
    } finally {
      setParsing(false);
    }
  };

  const handleParseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setParsingFile(true);
    try {
      const parsed = await routineService.parseRoutineFile(file);
      applyParsedRoutine(parsed);
      toast.success(copy.fileSuccess);
    } catch (error) {
      toast.error(getApiErrorMessage(error, copy.fileError));
    } finally {
      setParsingFile(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const savedRoutine = await persistRoutine();
      toast.success(copy.saveSuccess);
      navigate(`/routines/${savedRoutine.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, copy.saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const savedRoutine = await persistRoutine();
      if (!id) {
        navigate(`/routines/${savedRoutine.id}/edit`, { replace: true });
      }
      const data = await routineService.analyzeRoutine(savedRoutine.id);
      const routine = data.routine;
      setAnalysis(data.analysis);
      setName(routine.name);
      setDuration(routine.estimated_duration_minutes);
      setMuscleGroupsText((routine.muscle_groups || []).join(", "));
      setExercises(routine.exercises || []);
      toast.success(copy.analyzeSuccess);
    } catch (error) {
      toast.error(getApiErrorMessage(error, copy.analyzeError));
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton className="h-[640px] rounded-[32px]" />;
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">{id ? copy.editTag : copy.newTag}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">{copy.title}</h1>
            <p className="mt-3 max-w-2xl text-textMuted">{copy.description}</p>
          </div>
          <Link to="/routines" className="text-sm font-semibold text-primary">
            {copy.backToRoutines}
          </Link>
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-6">
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-background/60 p-1">
          {[
            ["paste", copy.pasteTab],
            ["manual", copy.manualTab],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                tab === value ? "bg-primary text-background" : "text-textMuted hover:text-textPrimary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "paste" ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-dashed border-secondary/30 bg-secondary/10 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-secondary">
                    <FileUp className="h-5 w-5" />
                    <p className="font-semibold">{copy.uploadTitle}</p>
                  </div>
                  <p className="mt-2 text-sm text-textMuted">{copy.uploadText}</p>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 font-semibold text-white transition hover:bg-secondary/90">
                  <FileUp className="h-4 w-4" />
                  {parsingFile ? copy.reading : copy.chooseFile}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown,text/csv,.txt,.md,.csv"
                    onChange={handleParseFile}
                    disabled={parsingFile}
                    className="hidden"
                  />
                </label>
              </div>
              {parsingFile ? (
                <motion.p
                  animate={{ opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="mt-4 text-sm text-secondary"
                >
                  {copy.readingText}
                </motion.p>
              ) : null}
            </div>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-textMuted">
              <div className="h-px flex-1 bg-white/10" />
              {copy.orPaste}
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              rows="8"
              className="focus-ring w-full rounded-3xl border border-white/10 bg-background/60 px-5 py-4"
              placeholder={copy.pastePlaceholder}
            />
            <button
              onClick={handleParse}
              disabled={parsing}
              className="inline-flex items-center gap-2 rounded-2xl bg-secondary px-5 py-3 font-semibold text-white transition disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {parsing ? copy.parsing : copy.parseRoutine}
            </button>
          </div>
        ) : null}

        {tab === "manual" ? (
          <div className="space-y-6">
            {parsingNotes ? (
              <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">
                {parsingNotes}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm text-textMuted">{copy.routineName}</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
                  placeholder="Push Day A"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-textMuted">{copy.estimatedDuration}</span>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm text-textMuted">{copy.muscleGroups}</span>
                <input
                  value={muscleGroupsText}
                  onChange={(event) => setMuscleGroupsText(event.target.value)}
                  className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
                  placeholder={copy.musclePlaceholder}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm text-textMuted">{copy.descriptionLabel}</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows="3"
                  className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
                  placeholder={copy.descriptionPlaceholder}
                />
              </label>
            </div>

            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="min-w-0 space-y-3">
              {exercises.map((exercise, index) => (
                <motion.div
                  key={index}
                  variants={staggerItem}
                  className="grid min-w-0 grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-background/50 p-4 sm:grid-cols-4 xl:grid-cols-[minmax(180px,1.4fr)_minmax(64px,0.45fr)_minmax(64px,0.45fr)_minmax(78px,0.55fr)_minmax(78px,0.55fr)_minmax(78px,0.55fr)_minmax(112px,0.65fr)_minmax(132px,0.8fr)_auto]"
                >
                  <input
                    value={exercise.name}
                    onChange={(event) => updateExercise(index, "name", event.target.value)}
                    className="focus-ring col-span-2 min-w-0 rounded-2xl border border-white/10 bg-surface/60 px-3 py-2 sm:col-span-4 xl:col-span-1"
                    placeholder={copy.exercisePlaceholder}
                  />
                  <input
                    type="number"
                    min="1"
                    value={exercise.sets}
                    onChange={(event) => updateExercise(index, "sets", event.target.value)}
                    className="focus-ring min-w-0 rounded-2xl border border-white/10 bg-surface/60 px-3 py-2"
                    placeholder={copy.sets}
                  />
                  <input
                    type="number"
                    min="1"
                    value={exercise.reps}
                    onChange={(event) => updateExercise(index, "reps", event.target.value)}
                    className="focus-ring min-w-0 rounded-2xl border border-white/10 bg-surface/60 px-3 py-2"
                    placeholder={copy.reps}
                  />
                  <input
                    type="number"
                    min="0"
                    value={exercise.weight_kg ?? ""}
                    onChange={(event) => updateExercise(index, "weight_kg", event.target.value)}
                    className="focus-ring min-w-0 rounded-2xl border border-white/10 bg-surface/60 px-3 py-2"
                    placeholder="kg"
                  />
                  <input
                    type="number"
                    min="1"
                    max="8"
                    step="0.5"
                    value={exercise.seconds_per_rep ?? 3}
                    onChange={(event) => updateExercise(index, "seconds_per_rep", event.target.value)}
                    className="focus-ring min-w-0 rounded-2xl border border-white/10 bg-surface/60 px-3 py-2"
                    placeholder={copy.secPerRep}
                  />
                  <label className="flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-surface/60 px-3 py-2 text-sm text-textMuted">
                    <input
                      type="checkbox"
                      checked={Boolean(exercise.uses_bodyweight)}
                      onChange={(event) => updateExercise(index, "uses_bodyweight", event.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    BW
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={exercise.rest_seconds}
                    onChange={(event) => updateExercise(index, "rest_seconds", event.target.value)}
                    className="focus-ring min-w-0 rounded-2xl border border-white/10 bg-surface/60 px-3 py-2"
                    placeholder={copy.rest}
                  />
                  <select
                    value={exercise.exercise_type}
                    onChange={(event) => updateExercise(index, "exercise_type", event.target.value)}
                    className="focus-ring col-span-2 min-w-0 rounded-2xl border border-white/10 bg-surface/60 px-3 py-2 sm:col-span-2 xl:col-span-1"
                  >
                    <option value="compound">{copy.compound}</option>
                    <option value="isolation">{copy.isolation}</option>
                    <option value="cardio_burst">{copy.cardioBurst}</option>
                  </select>
                  <div className="col-span-2 flex justify-end gap-2 sm:col-span-2 xl:col-span-1 xl:justify-start">
                    <button
                      type="button"
                      onClick={() => moveExercise(index, -1)}
                      className="rounded-xl border border-white/10 p-2 text-textMuted hover:text-textPrimary"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveExercise(index, 1)}
                      className="rounded-xl border border-white/10 p-2 text-textMuted hover:text-textPrimary"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExercise(index)}
                      className="rounded-xl border border-red-400/20 p-2 text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <button
              type="button"
              onClick={addExercise}
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-textMuted transition hover:text-textPrimary"
            >
              {copy.addExercise}
            </button>

            {analyzing ? (
              <motion.div
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="rounded-3xl border border-secondary/20 bg-secondary/10 p-5 text-secondary"
              >
                {copy.analyzingText}
              </motion.div>
            ) : null}

            {analysis ? (
              <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <MetGauge value={analysis.adjusted_met} isSpanish={isSpanish} />
                <div className="rounded-3xl border border-white/10 bg-background/60 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-textMuted">{copy.aiJustification}</p>
                  <p className="mt-3 text-textMuted">{analysis.justification}</p>
                  {analysis.calorie_summary ? (
                    <p className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                      {copy.estimatedCalories}: ~{Math.round(analysis.calorie_summary.total_calories)} kcal
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-secondary/30 px-5 py-3 font-semibold text-secondary transition hover:bg-secondary/10 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {analyzing ? copy.analyzingButton : copy.analyzeRoutine}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || analyzing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-background transition disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? copy.saving : copy.saveRoutine}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
