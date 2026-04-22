import { Dumbbell, Flame, UtensilsCrossed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { FoodRecommendationCard } from "../components/FoodRecommendationCard";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { MacroRing } from "../components/MacroRing";
import { RecoveryWindowTimer } from "../components/RecoveryWindowTimer";
import { activityService } from "../services/activityService";
import { nutritionService } from "../services/nutritionService";
import { formatDateTime } from "../utils/date";

export function ActivityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activityLog, setActivityLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const notifiedActivityRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await activityService.getLog(id);
        if (active) {
          setActivityLog(data.recommendation ? data : { ...data, recommendation: await nutritionService.getRecommendation(id) });
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not load this activity.");
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
  }, [id]);

  useEffect(() => {
    if (!activityLog || notifiedActivityRef.current === activityLog.id) {
      return;
    }

    const expiresAt = new Date(activityLog.timing_expires_at).getTime();
    if (Date.now() < expiresAt) {
      toast("⏱ Eat your post-workout meal soon!", { id: `recovery-window-${activityLog.id}` });
    } else {
      toast("Window passed — still eat your recovery meal!", {
        id: `recovery-window-${activityLog.id}`,
      });
    }
    notifiedActivityRef.current = activityLog.id;
  }, [activityLog]);

  if (loading || !activityLog) {
    return <LoadingSkeleton className="h-[640px] rounded-[32px]" />;
  }

  const recommendation = activityLog.recommendation;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Activity detail</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">{activityLog.activity_type.name}</h1>
            <p className="mt-3 text-textMuted">
              {activityLog.duration_minutes} minutes • {formatDateTime(activityLog.logged_at)}
            </p>
            {activityLog.notes ? <p className="mt-4 max-w-2xl text-textMuted">{activityLog.notes}</p> : null}
            {activityLog.gym_routine ? (
              <button
                onClick={() => navigate(`/routines/${activityLog.gym_routine.id}`)}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-secondary/30 px-4 py-2 text-sm font-semibold text-secondary"
              >
                <Dumbbell className="h-4 w-4" />
                Routine: {activityLog.gym_routine.name}
              </button>
            ) : null}
          </div>
          <div className="rounded-3xl bg-primary/10 px-5 py-4">
            <div className="flex items-center gap-2 text-primary">
              <Flame className="h-5 w-5" />
              <span className="text-sm">Calories burned</span>
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

      <section className="grid gap-4 lg:grid-cols-3">
        <MacroRing label="Protein target" value={Number(recommendation.protein_target_g)} goal={Number(recommendation.protein_target_g)} color="#10B981" />
        <MacroRing label="Carb target" value={Number(recommendation.carbs_target_g)} goal={Number(recommendation.carbs_target_g)} color="#6366F1" />
        <MacroRing label="Fat ceiling" value={Number(recommendation.fat_target_g)} goal={10} color="#F59E0B" />
      </section>

      <section className="glass-panel rounded-[32px] p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Recommended foods</h2>
            <p className="text-sm text-textMuted">
              Matched to your recovery targets using Open Food Facts.
            </p>
          </div>
          <button
            onClick={() => navigate("/nutrition/log", { state: { prefillFoods: recommendation.recommended_foods } })}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-background"
          >
            <UtensilsCrossed className="h-4 w-4" />
            Log these foods
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
