import { AlarmClock, BellRing, CheckCircle2, Dumbbell, Flame, UtensilsCrossed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { FoodRecommendationCard } from "../components/FoodRecommendationCard";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { MacroRing } from "../components/MacroRing";
import { RecoveryWindowTimer } from "../components/RecoveryWindowTimer";
import { useLanguage } from "../hooks/useLanguage";
import { activityService } from "../services/activityService";
import { nutritionService } from "../services/nutritionService";
import { formatDateTime } from "../utils/date";

function getWorkflowTone(status) {
  if (status === "completed") {
    return {
      icon: CheckCircle2,
      badge: "bg-primary/10 text-primary",
      panel: "border-primary/20 bg-primary/5",
    };
  }

  if (status === "reminder_due") {
    return {
      icon: BellRing,
      badge: "bg-amber-500/10 text-amber-300",
      panel: "border-amber-500/20 bg-amber-500/5",
    };
  }

  return {
    icon: AlarmClock,
    badge: "bg-secondary/10 text-secondary",
    panel: "border-secondary/20 bg-secondary/5",
  };
}

export function ActivityDetailPage() {
  const { isSpanish } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [activityLog, setActivityLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const notifiedActivityRef = useRef(null);
  const copy = isSpanish
    ? {
        loadError: "No pudimos cargar esta actividad.",
        eatSoon: "⏱ Come tu comida post-entreno pronto.",
        windowPassed: "La ventana paso, pero igual conviene tu comida de recuperacion.",
        sectionTag: "Detalle de actividad",
        routine: "Rutina",
        caloriesBurned: "Calorias gastadas",
        workflowTitle: "Workflow post-entreno",
        workflowPending: "Seguimiento activo",
        workflowCompleted: "Recuperacion registrada",
        workflowReminderDue: "Recordatorio listo",
        workflowPendingText: "Todavia estas dentro de la ventana de recuperacion. Cuando cargues una comida a tiempo, este workflow se completa solo.",
        workflowCompletedText: "Registraste una comida dentro de la ventana recomendada. El workflow se cerro automaticamente.",
        workflowReminderText: "No se detecto una comida dentro de la ventana. El sistema dejo listo un recordatorio con la accion recomendada.",
        workflowDueAt: "Vence",
        workflowCompletedAt: "Completado",
        workflowLinkedMeal: "Comida asociada",
        proteinTarget: "Objetivo de proteina",
        carbTarget: "Objetivo de carbohidratos",
        fatCeiling: "Tope de grasas",
        foodsTitle: "Alimentos recomendados",
        foodsText: "Ajustados a tus objetivos de recuperacion usando Open Food Facts.",
        logFoods: "Cargar estas comidas",
        recoveryLoggedToast: "Comida de recuperacion registrada a tiempo.",
      }
    : {
        loadError: "Could not load this activity.",
        eatSoon: "⏱ Eat your post-workout meal soon!",
        windowPassed: "Window passed — still eat your recovery meal!",
        sectionTag: "Activity detail",
        routine: "Routine",
        caloriesBurned: "Calories burned",
        workflowTitle: "Post-workout workflow",
        workflowPending: "Workflow active",
        workflowCompleted: "Recovery logged",
        workflowReminderDue: "Reminder ready",
        workflowPendingText: "You are still inside the recovery window. As soon as you log a meal on time, this workflow closes automatically.",
        workflowCompletedText: "You logged a meal inside the recommended window. The workflow was completed automatically.",
        workflowReminderText: "No meal was detected inside the recovery window. The system prepared a reminder with the recommended next action.",
        workflowDueAt: "Due at",
        workflowCompletedAt: "Completed",
        workflowLinkedMeal: "Linked meal",
        proteinTarget: "Protein target",
        carbTarget: "Carb target",
        fatCeiling: "Fat ceiling",
        foodsTitle: "Recommended foods",
        foodsText: "Matched to your recovery targets using Open Food Facts.",
        logFoods: "Log these foods",
        recoveryLoggedToast: "Recovery meal logged on time.",
      };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await activityService.getLog(id);
        if (active) {
          setActivityLog(data.recommendation ? data : { ...data, recommendation: await nutritionService.getRecommendation(id) });
        }
      } catch (error) {
        toast.error(error.response?.data?.message || copy.loadError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id, copy.loadError]);

  useEffect(() => {
    if (!activityLog || notifiedActivityRef.current === activityLog.id) {
      return;
    }

    const workflow = activityLog.post_workout_workflow || activityLog.recommendation?.workflow;
    if (workflow?.status === "completed") {
      toast.success(copy.recoveryLoggedToast, { id: `recovery-window-${activityLog.id}` });
    } else if (workflow?.status === "reminder_due") {
      toast(workflow.reminder_message || copy.windowPassed, {
        id: `recovery-window-${activityLog.id}`,
      });
    } else {
      toast(copy.eatSoon, { id: `recovery-window-${activityLog.id}` });
    }
    notifiedActivityRef.current = activityLog.id;
  }, [activityLog, copy.eatSoon, copy.recoveryLoggedToast, copy.windowPassed]);

  if (loading || !activityLog) {
    return <LoadingSkeleton className="h-[640px] rounded-[32px]" />;
  }

  const recommendation = activityLog.recommendation;
  const workflow = activityLog.post_workout_workflow || recommendation.workflow;
  const workflowTone = getWorkflowTone(workflow?.status);
  const WorkflowIcon = workflowTone.icon;
  const workflowTitle =
    workflow?.status === "completed"
      ? copy.workflowCompleted
      : workflow?.status === "reminder_due"
        ? copy.workflowReminderDue
        : copy.workflowPending;
  const workflowText =
    workflow?.status === "completed"
      ? copy.workflowCompletedText
      : workflow?.status === "reminder_due"
        ? copy.workflowReminderText
        : copy.workflowPendingText;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">{copy.sectionTag}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">{activityLog.activity_type.name}</h1>
            <p className="mt-3 text-textMuted">
              {activityLog.duration_minutes} {isSpanish ? "minutos" : "minutes"} • {formatDateTime(activityLog.logged_at)}
            </p>
            {activityLog.notes ? <p className="mt-4 max-w-2xl text-textMuted">{activityLog.notes}</p> : null}
            {activityLog.gym_routine ? (
              <button
                onClick={() => navigate(`/routines/${activityLog.gym_routine.id}`)}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-secondary/30 px-4 py-2 text-sm font-semibold text-secondary"
              >
                <Dumbbell className="h-4 w-4" />
                {copy.routine}: {activityLog.gym_routine.name}
              </button>
            ) : null}
          </div>
          <div className="rounded-3xl bg-primary/10 px-5 py-4">
            <div className="flex items-center gap-2 text-primary">
              <Flame className="h-5 w-5" />
              <span className="text-sm">{copy.caloriesBurned}</span>
            </div>
            <p className="mt-3 text-4xl font-bold">{Math.round(activityLog.calories_burned)} kcal</p>
          </div>
        </div>
      </section>

      <RecoveryWindowTimer
        loggedAt={activityLog.logged_at}
        timingWindowMinutes={activityLog.timing_window_minutes}
        timingExpiresAt={activityLog.timing_expires_at}
      />

      <section className={`glass-panel rounded-[32px] border p-6 ${workflowTone.panel}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.24em] text-textMuted">{copy.workflowTitle}</p>
            <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${workflowTone.badge}`}>
              <WorkflowIcon className="h-4 w-4" />
              {workflowTitle}
            </div>
            <p className="mt-4 text-textMuted">{workflow?.reminder_message || workflowText}</p>
          </div>

          <div className="grid gap-3 sm:min-w-[240px]">
            <div className="rounded-3xl border border-white/10 bg-background/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-textMuted">{copy.workflowDueAt}</p>
              <p className="mt-2 font-semibold">{formatDateTime(workflow?.reminder_due_at || activityLog.timing_expires_at)}</p>
            </div>
            {workflow?.completed_at ? (
              <div className="rounded-3xl border border-white/10 bg-background/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-textMuted">{copy.workflowCompletedAt}</p>
                <p className="mt-2 font-semibold">{formatDateTime(workflow.completed_at)}</p>
                {workflow.completed_by_food_log ? (
                  <p className="mt-2 text-sm text-textMuted">
                    {copy.workflowLinkedMeal}: #{workflow.completed_by_food_log}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MacroRing label={copy.proteinTarget} value={Number(recommendation.protein_target_g)} goal={Number(recommendation.protein_target_g)} color="#10B981" />
        <MacroRing label={copy.carbTarget} value={Number(recommendation.carbs_target_g)} goal={Number(recommendation.carbs_target_g)} color="#6366F1" />
        <MacroRing label={copy.fatCeiling} value={Number(recommendation.fat_target_g)} goal={10} color="#F59E0B" />
      </section>

      <section className="glass-panel rounded-[32px] p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{copy.foodsTitle}</h2>
            <p className="text-sm text-textMuted">{copy.foodsText}</p>
          </div>
          <button
            onClick={() => navigate("/nutrition/log", { state: { prefillFoods: recommendation.recommended_foods } })}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-background"
          >
            <UtensilsCrossed className="h-4 w-4" />
            {copy.logFoods}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recommendation.recommended_foods.map((food) => (
            <FoodRecommendationCard
              key={food.id}
              food={food}
              onSelect={(selectedFood) => navigate("/nutrition/log", { state: { prefillFoods: [selectedFood] } })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
