import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Timer } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { ActivityTypePicker } from "../components/ActivityTypePicker";
import { FoodRecommendationCard } from "../components/FoodRecommendationCard";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { activityService } from "../services/activityService";
import { nutritionService } from "../services/nutritionService";
import { useActivities } from "../hooks/useActivities";

export function ActivityLogPage() {
  const navigate = useNavigate();
  const { activityTypes, loading } = useActivities();
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState(null);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!selectedType) {
      toast.error("Pick an activity to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const createdLog = await activityService.createLog({
        activity_type_id: selectedType.id,
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
            onSelect={setSelectedType}
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
              Burned during {result.activity_type.name.toLowerCase()} with a recovery target of{" "}
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
