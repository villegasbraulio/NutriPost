import { motion } from "framer-motion";
import { ArrowRight, Dumbbell, Pencil, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { routineService } from "../services/routineService";
import { formatDateTime } from "../utils/date";

function hasAny(groups, aliases) {
  return aliases.some((alias) => groups.some((group) => group.includes(alias)));
}

function MuscleMap({ muscleGroups = [] }) {
  const groups = muscleGroups.map((group) => String(group).toLowerCase());
  const active = "#10B981";
  const inactive = "#334155";
  const pulse = {
    animate: { opacity: [0.65, 1, 0.65] },
    transition: { duration: 1.5, repeat: Infinity },
  };

  const parts = [
    { id: "chest", x: 82, y: 68, w: 36, h: 28, aliases: ["chest", "pec"] },
    { id: "shoulders", x: 62, y: 66, w: 20, h: 22, aliases: ["shoulder", "delts"] },
    { id: "shoulders-r", x: 118, y: 66, w: 20, h: 22, aliases: ["shoulder", "delts"] },
    { id: "back", x: 78, y: 98, w: 44, h: 34, aliases: ["back", "lat", "traps"] },
    { id: "core", x: 84, y: 132, w: 32, h: 32, aliases: ["core", "abs"] },
    { id: "arms", x: 50, y: 92, w: 20, h: 58, aliases: ["bicep", "tricep", "arm"] },
    { id: "arms-r", x: 130, y: 92, w: 20, h: 58, aliases: ["bicep", "tricep", "arm"] },
    { id: "glutes", x: 80, y: 166, w: 40, h: 24, aliases: ["glute"] },
    { id: "quads", x: 74, y: 192, w: 22, h: 68, aliases: ["quad", "leg"] },
    { id: "quads-r", x: 104, y: 192, w: 22, h: 68, aliases: ["quad", "leg"] },
    { id: "hamstrings", x: 76, y: 222, w: 20, h: 50, aliases: ["hamstring"] },
    { id: "hamstrings-r", x: 104, y: 222, w: 20, h: 50, aliases: ["hamstring"] },
    { id: "calves", x: 76, y: 266, w: 18, h: 46, aliases: ["calf"] },
    { id: "calves-r", x: 106, y: 266, w: 18, h: 46, aliases: ["calf"] },
  ];

  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-background/60 p-5">
      <p className="text-sm uppercase tracking-[0.2em] text-textMuted">Muscle map</p>
      <svg viewBox="0 0 200 330" className="mx-auto mt-4 h-[330px] max-w-full">
        <circle cx="100" cy="34" r="22" fill="#1E293B" stroke="#475569" strokeWidth="2" />
        {parts.map((part) => {
          const highlighted = hasAny(groups, part.aliases);
          const Rect = highlighted ? motion.rect : "rect";
          return (
            <Rect
              key={part.id}
              x={part.x}
              y={part.y}
              width={part.w}
              height={part.h}
              rx="10"
              fill={highlighted ? active : inactive}
              opacity={highlighted ? 0.95 : 0.5}
              {...(highlighted ? pulse : {})}
            />
          );
        })}
      </svg>
    </div>
  );
}

export function RoutineDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const volumeLoad = useMemo(() => {
    if (!routine) {
      return 0;
    }
    return routine.exercises.reduce((total, exercise) => {
      const weight = Number(exercise.weight_kg || 0);
      return total + Number(exercise.sets || 0) * Number(exercise.reps || 0) * weight;
    }, 0);
  }, [routine]);

  useEffect(() => {
    let active = true;
    const loadRoutine = async () => {
      try {
        const data = await routineService.getRoutine(id);
        if (active) {
          setRoutine(data);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not load this routine.");
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
  }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const data = await routineService.analyzeRoutine(id);
      setRoutine(data.routine);
      toast.success("Routine calories updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not analyze this routine.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading || !routine) {
    return <LoadingSkeleton className="h-[640px] rounded-[32px]" />;
  }

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <section className="glass-panel min-w-0 overflow-hidden rounded-[32px] p-6">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Routine detail</p>
            <h1 className="mt-3 break-words text-4xl font-bold tracking-tight">{routine.name}</h1>
            <p className="mt-3 max-w-2xl break-words text-textMuted">
              {routine.description || "A saved strength routine ready for precise calorie estimates."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(routine.muscle_groups || []).map((group) => (
                <span key={group} className="rounded-full bg-secondary/10 px-3 py-1 text-sm capitalize text-secondary">
                  {group}
                </span>
              ))}
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-[440px] lg:shrink-0">
            <div className="rounded-3xl bg-primary/10 p-4">
              <p className="text-sm text-primary">Adjusted MET</p>
              <p className="mt-2 text-3xl font-bold">{routine.adjusted_met ? Number(routine.adjusted_met).toFixed(1) : "Pending"}</p>
            </div>
            <div className="rounded-3xl bg-secondary/10 p-4">
              <p className="text-sm text-secondary">Exercise time</p>
              <p className="mt-2 text-3xl font-bold">{Math.round(routine.calculated_duration_minutes || routine.estimated_duration_minutes)}m</p>
            </div>
            <div className="rounded-3xl bg-accent/10 p-4">
              <p className="text-sm text-accent">Calories</p>
              <p className="mt-2 text-3xl font-bold">{Math.round(routine.estimated_calories || 0)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex min-w-0 flex-wrap gap-3">
          <button
            onClick={() => navigate("/activities/log", { state: { routineId: routine.id } })}
            className="inline-flex max-w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-background"
          >
            Use this routine
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            to={`/routines/${routine.id}/edit`}
            className="inline-flex max-w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-textMuted hover:text-textPrimary"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="inline-flex max-w-full items-center justify-center gap-2 rounded-2xl border border-secondary/30 px-5 py-3 font-semibold text-secondary hover:bg-secondary/10 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {analyzing ? "Analyzing..." : "Analyze with Groq"}
          </button>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="glass-panel min-w-0 overflow-hidden rounded-[32px] p-6">
          <div className="mb-5 flex items-center gap-3">
            <Dumbbell className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Exercise list</h2>
          </div>
          <div className="max-w-full overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-textMuted">
                <tr>
                  <th className="py-3">Exercise</th>
                  <th className="py-3">Sets</th>
                  <th className="py-3">Reps</th>
                  <th className="py-3">Weight</th>
                  <th className="py-3">Sec/rep</th>
                  <th className="py-3">Rest</th>
                  <th className="py-3">MET</th>
                  <th className="py-3">Kcal</th>
                  <th className="py-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {routine.exercises.map((exercise, index) => {
                  const breakdown = routine.calorie_breakdown?.[index] || {};
                  return (
                    <tr key={`${exercise.name}-${index}`} className="border-t border-white/10">
                      <td className="max-w-[220px] break-words py-4 pr-4 font-semibold">{exercise.name}</td>
                      <td className="py-4">{exercise.sets}</td>
                      <td className="py-4">{exercise.reps}</td>
                      <td className="whitespace-nowrap py-4 pr-4">
                        {breakdown.load_label || (exercise.weight_kg ? `${exercise.weight_kg} kg` : "No external load")}
                      </td>
                      <td className="py-4">{exercise.seconds_per_rep || 3}s</td>
                      <td className="py-4">{exercise.rest_seconds}s</td>
                      <td className="py-4">{breakdown.met_value ? Number(breakdown.met_value).toFixed(1) : "-"}</td>
                      <td className="py-4 font-semibold text-primary">{breakdown.calories ? Math.round(breakdown.calories) : "-"}</td>
                      <td className="whitespace-nowrap py-4 pr-4 capitalize">{exercise.exercise_type.replace("_", " ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 break-words text-sm text-textMuted">
            External load volume: {Math.round(volumeLoad)} kg. This is shown for context only; calories use execution time, rest time, exercise MET, and your body weight.
          </p>
        </div>

        <MuscleMap muscleGroups={routine.muscle_groups || []} />
      </section>

      <section className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="glass-panel min-w-0 rounded-[32px] p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-secondary">AI analysis</p>
          <p className="mt-4 break-words text-textMuted">
            {routine.ai_analysis || "Analyze this routine to get the MET justification based on volume, rest and muscle groups."}
          </p>
        </div>

        <div className="glass-panel min-w-0 rounded-[32px] p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Usage history</p>
          <div className="mt-4 space-y-3">
            {(routine.recent_activity_logs || []).length === 0 ? (
              <p className="text-textMuted">No activity logs have used this routine yet.</p>
            ) : (
              routine.recent_activity_logs.map((log) => (
                <Link
                  key={log.id}
                  to={`/activities/logs/${log.id}`}
                  className="block rounded-2xl border border-white/10 bg-background/50 p-4 transition hover:border-primary/30"
                >
                  <div className="flex min-w-0 items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{log.activity_type}</p>
                      <p className="text-sm text-textMuted">
                        {log.duration_minutes} min • {formatDateTime(log.logged_at)}
                      </p>
                    </div>
                    <p className="font-bold text-primary">{Math.round(log.calories_burned)} kcal</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
