import { motion } from "framer-motion";
import { ArrowRight, Dumbbell, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { routineService } from "../services/routineService";
import { staggerContainer, staggerItem } from "../utils/animations";

function normalizeListPayload(data) {
  return Array.isArray(data) ? data : data.results || [];
}

function metLabel(value) {
  if (!value) {
    return "Analyze";
  }
  return `MET ${Number(value).toFixed(1)}`;
}

export function RoutineListPage() {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState(null);

  const loadRoutines = async () => {
    try {
      const data = await routineService.getRoutines();
      setRoutines(normalizeListPayload(data));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load routines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutines();
  }, []);

  const handleAnalyze = async (routine) => {
    setAnalyzingId(routine.id);
    try {
      const data = await routineService.analyzeRoutine(routine.id);
      const updatedRoutine = data.routine;
      setRoutines((items) => items.map((item) => (item.id === routine.id ? updatedRoutine : item)));
      toast.success("Routine MET updated with Groq.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not analyze this routine.");
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (routine) => {
    const confirmed = window.confirm(`Delete "${routine.name}"? Activity history will stay saved.`);
    if (!confirmed) {
      return;
    }

    try {
      await routineService.deleteRoutine(routine.id);
      setRoutines((items) => items.filter((item) => item.id !== routine.id));
      toast.success("Routine deleted.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete this routine.");
    }
  };

  if (loading) {
    return <LoadingSkeleton className="h-[520px] rounded-[32px]" />;
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Gym routines</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">Train with your real volume</h1>
            <p className="mt-3 max-w-2xl text-textMuted">
              Save Push/Pull/Legs, Full Body or any custom session, then calculate calories from each exercise&apos;s tempo, rest, and intensity.
            </p>
          </div>
          <Link
            to="/routines/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-background transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Routine
          </Link>
        </div>
      </section>

      {routines.length === 0 ? (
        <section className="glass-panel rounded-[32px] p-8 text-center">
          <Dumbbell className="mx-auto h-12 w-12 text-secondary" />
          <h2 className="mt-4 text-2xl font-semibold">No routines yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-textMuted">
            Paste the routine exactly as you wrote it and NutriPost will structure it for you.
          </p>
          <Link
            to="/routines/new"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-background"
          >
            Create your first routine
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {routines.map((routine) => (
            <motion.article
              key={routine.id}
              variants={staggerItem}
              whileHover={{ scale: 1.02 }}
              className="rounded-[28px] border border-white/10 bg-surface/70 p-5 transition hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-secondary">Routine</p>
                  <h2 className="mt-2 text-2xl font-semibold">{routine.name}</h2>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {metLabel(routine.adjusted_met)}
                </span>
              </div>

              <p className="mt-4 text-sm text-textMuted">
                {Math.round(routine.calculated_duration_minutes || routine.estimated_duration_minutes)} min exercise time • {routine.exercises.length} exercises
              </p>
              {routine.estimated_calories ? (
                <p className="mt-2 text-sm font-semibold text-accent">~{Math.round(routine.estimated_calories)} kcal by exercise formula</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {(routine.muscle_groups || []).slice(0, 5).map((group) => (
                  <span key={group} className="rounded-full bg-secondary/10 px-3 py-1 text-xs capitalize text-secondary">
                    {group}
                  </span>
                ))}
                {(routine.muscle_groups || []).length === 0 ? (
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-textMuted">No muscle map yet</span>
                ) : null}
              </div>

              {routine.ai_analysis ? (
                <p className="mt-4 line-clamp-3 text-sm italic text-textMuted">{routine.ai_analysis}</p>
              ) : (
                <p className="mt-4 text-sm text-textMuted">Analyze this routine to refresh muscles, MET context, and calorie breakdown.</p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to={`/routines/${routine.id}`}
                  className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-background"
                >
                  Open
                </Link>
                <Link
                  to={`/routines/${routine.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm text-textMuted transition hover:text-textPrimary"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
                <button
                  onClick={() => handleAnalyze(routine)}
                  disabled={analyzingId === routine.id}
                  className="inline-flex items-center gap-2 rounded-2xl border border-secondary/30 px-4 py-2 text-sm text-secondary transition hover:bg-secondary/10 disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  {analyzingId === routine.id ? "Analyzing..." : "Analyze"}
                </button>
                <button
                  onClick={() => handleDelete(routine)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 px-4 py-2 text-sm text-red-300 transition hover:bg-red-400/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </motion.article>
          ))}
        </motion.section>
      )}
    </div>
  );
}
