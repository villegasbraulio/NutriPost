import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Dumbbell, Plus, Sparkles, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";

import { ActivityTypePicker } from "../components/ActivityTypePicker";
import { FoodRecommendationCard } from "../components/FoodRecommendationCard";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { activityService } from "../services/activityService";
import { nutritionService } from "../services/nutritionService";
import { routineService } from "../services/routineService";
import { useActivities } from "../hooks/useActivities";
import { useAuth } from "../hooks/useAuth";

function normalizeListPayload(data) {
  return Array.isArray(data) ? data : data.results || [];
}

function calculateNetPreview(metValue, weightKg, minutes) {
  const met = Math.max(Number(metValue || 0) - 1, 0);
  return met * Number(weightKg || 0) * (Number(minutes || 0) / 60);
}

function getRoutineCaloriePreview(routine, weightKg, minutes) {
  if (routine?.estimated_calories) {
    return Number(routine.estimated_calories);
  }
  if (routine?.adjusted_met) {
    return calculateNetPreview(routine.adjusted_met, weightKg, minutes);
  }
  return null;
}

export function ActivityLogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activityTypes, loading } = useActivities();
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [routinesLoading, setRoutinesLoading] = useState(true);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isStrengthActivity = selectedType?.category === "strength" || selectedType?.category === "gym";

  useEffect(() => {
    let active = true;
    const loadRoutines = async () => {
      try {
        const data = await routineService.getRoutines();
        if (active) {
          setRoutines(normalizeListPayload(data));
        }
      } catch {
        if (active) {
          setRoutines([]);
        }
      } finally {
        if (active) {
          setRoutinesLoading(false);
        }
      }
    };

    loadRoutines();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const routineId = location.state?.routineId;
    if (!routineId || !routines.length || !activityTypes.length || String(selectedRoutine?.id) === String(routineId)) {
      return;
    }

    const routine = routines.find((item) => String(item.id) === String(routineId));
    const strengthType =
      activityTypes.find((item) => item.name.toLowerCase().includes("weight training")) ||
      activityTypes.find((item) => item.category === "strength");

    if (routine && strengthType) {
      setSelectedRoutine(routine);
      setSelectedType(strengthType);
      setDuration(routine.estimated_duration_minutes || 45);
      setStep(2);
    }
  }, [activityTypes, location.state, routines, selectedRoutine?.id]);

  const handleSelectType = (activityType) => {
    setSelectedType(activityType);
    if (activityType.category !== "strength" && activityType.category !== "gym") {
      setSelectedRoutine(null);
    }
  };

  const calorieComparison = useMemo(() => {
    if (!selectedType || !user?.weight_kg) {
      return { generic: 0, routine: null };
    }

    return {
      generic: calculateNetPreview(selectedType.met_value, user.weight_kg, duration),
      routine: selectedRoutine ? getRoutineCaloriePreview(selectedRoutine, user.weight_kg, duration) : null,
    };
  }, [duration, selectedRoutine, selectedType, user?.weight_kg]);

  const handleCreate = async () => {
    if (!selectedType) {
      toast.error("Pick an activity to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const createdLog = await activityService.createLog({
        activity_type_id: selectedType.id,
        gym_routine_id: selectedRoutine?.id || null,
        duration_minutes: duration,
        notes,
      });
      const generatedRecommendation =
        createdLog.recommendation || (await nutritionService.getRecommendation(createdLog.id));
      setResult(createdLog);
      setRecommendation(generatedRecommendation);
      setStep(3);
      toast.success("Activity logged.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not log activity.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton className="h-[520px] rounded-[32px]" />;
  }

  return (
    <div className="glass-panel rounded-[32px] p-6">
      <div className="mb-8 flex items-center gap-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                item <= step ? "bg-primary text-background" : "bg-background/60 text-textMuted"
              }`}
            >
              {item}
            </div>
            {item < 3 ? <div className="h-px w-12 bg-white/10" /> : null}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Step 1</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Choose the activity you just finished</h1>
          </div>
          <ActivityTypePicker
            activityTypes={activityTypes}
            query={query}
            selectedId={selectedType?.id}
            onQueryChange={setQuery}
            onSelect={handleSelectType}
          />
          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedType}
              className="rounded-2xl bg-primary px-5 py-3 font-semibold text-background transition disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </motion.div>
      ) : null}

      {step === 2 ? (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Step 2</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Capture the effort details</h1>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
              <p className="text-sm text-textMuted">Selected activity</p>
              <p className="mt-3 text-2xl font-semibold">{selectedType?.name}</p>
              <p className="text-sm capitalize text-textMuted">{selectedType?.category}</p>
            </div>
            <label className="rounded-3xl border border-white/10 bg-background/60 p-5">
              <div className="flex items-center gap-2 text-sm text-textMuted">
                <Timer className="h-4 w-4" />
                Duration in minutes
              </div>
              <input
                type="number"
                min="1"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="mt-4 w-full bg-transparent text-4xl font-bold focus:outline-none"
              />
            </label>
          </div>

          {isStrengthActivity ? (
            <section className="rounded-[28px] border border-secondary/20 bg-secondary/10 p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-secondary">
                    <Dumbbell className="h-4 w-4" />
                    <span className="text-sm font-semibold">Use a saved routine?</span>
                  </div>
                  <p className="mt-2 text-sm text-textMuted">
                    Pick a routine to replace generic MET with exercise-by-exercise calorie math.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/routines/new")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-background/60 px-4 py-2 text-sm font-semibold text-primary"
                >
                  <Plus className="h-4 w-4" />
                  Create new
                </button>
              </div>

              {routinesLoading ? (
                <LoadingSkeleton className="h-24 rounded-3xl" />
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRoutine(null)}
                    className={`rounded-3xl border p-4 text-left transition ${
                      !selectedRoutine
                        ? "border-primary bg-primary/10"
                        : "border-white/10 bg-background/50 hover:border-primary/30"
                    }`}
                  >
                    <p className="font-semibold">Log without routine</p>
                    <p className="mt-1 text-sm text-textMuted">Uses generic MET {selectedType?.met_value}</p>
                  </button>

                  {routines.map((routine) => (
                    <button
                      key={routine.id}
                      type="button"
                      onClick={() => setSelectedRoutine(routine)}
                      className={`rounded-3xl border p-4 text-left transition ${
                        selectedRoutine?.id === routine.id
                          ? "border-primary bg-primary/10"
                          : "border-white/10 bg-background/50 hover:border-secondary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{routine.name}</p>
                          <p className="mt-1 text-sm text-textMuted">
                            {routine.estimated_duration_minutes} min • {routine.exercises.length} exercises
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                          {routine.adjusted_met ? `MET ${Number(routine.adjusted_met).toFixed(1)}` : "Needs AI"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedRoutine ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-3xl border border-primary/20 bg-background/60 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">{selectedRoutine.name}</p>
                      <p className="mt-1 text-sm text-textMuted">
                        {calorieComparison.routine
                          ? `Without your routine: ~${Math.round(calorieComparison.generic)} kcal | With your routine: ~${Math.round(calorieComparison.routine)} kcal`
                          : "Analyze this routine first to unlock the side-by-side calorie comparison."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/routines/${selectedRoutine.id}/edit`)}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-secondary"
                    >
                      <Sparkles className="h-4 w-4" />
                      Analyze/Edit
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </section>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm text-textMuted">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows="4"
              className="focus-ring w-full rounded-3xl border border-white/10 bg-background/60 px-4 py-3"
              placeholder="How did the session feel?"
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-textMuted transition hover:text-textPrimary"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-background transition disabled:opacity-60"
            >
              {submitting ? "Calculating..." : "See Results"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ) : null}

      {step === 3 && result && recommendation ? (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
          <div className="rounded-[32px] bg-gradient-to-br from-primary/20 to-secondary/20 p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-background/40 px-4 py-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Activity saved
            </div>
            <h1 className="mt-5 text-5xl font-bold tracking-tight text-textPrimary">
              {Math.round(result.calories_burned)} kcal
            </h1>
            <p className="mt-3 max-w-2xl text-textMuted">
              Burned during {result.activity_type.name.toLowerCase()}
              {result.gym_routine ? ` using ${result.gym_routine.name}` : ""} with a recovery target of{" "}
              {Math.round(recommendation.protein_target_g)}g protein and{" "}
              {Math.round(recommendation.carbs_target_g)}g carbs.
            </p>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Recommended foods</h2>
                <p className="text-sm text-textMuted">Tap a card to send it to the food log.</p>
              </div>
              <button
                onClick={() => navigate(`/activities/logs/${result.id}`)}
                className="text-sm font-semibold text-primary"
              >
                View detail
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recommendation.recommended_foods.map((food) => (
                <FoodRecommendationCard
                  key={food.id}
                  food={food}
                  onSelect={(selectedFood) =>
                    navigate("/nutrition/log", { state: { prefillFoods: [selectedFood] } })
                  }
                />
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
