import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useAuth } from "../hooks/useAuth";
import { useNutrition } from "../hooks/useNutrition";

const mealOrder = ["breakfast", "lunch", "dinner", "snack", "post_workout"];

export function TodayNutritionPage() {
  const today = new Date().toISOString().split("T")[0];
  const { user } = useAuth();
  const { foodLogs, loading } = useNutrition(today);

  if (loading) {
    return <LoadingSkeleton className="h-[640px] rounded-[32px]" />;
  }

  const totals = foodLogs.reduce(
    (accumulator, item) => ({
      calories: accumulator.calories + Number(item.calories),
      protein_g: accumulator.protein_g + Number(item.protein_g),
      carbs_g: accumulator.carbs_g + Number(item.carbs_g),
      fat_g: accumulator.fat_g + Number(item.fat_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  const goals = user?.daily_goal_preview || {
    calories_goal: 0,
    protein_goal_g: 0,
    carbs_goal_g: 0,
    fat_goal_g: 0,
  };

  const groupedMeals = mealOrder.reduce((groups, mealType) => {
    groups[mealType] = foodLogs.filter((item) => item.meal_type === mealType);
    return groups;
  }, {});

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="glass-panel rounded-[32px] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Today’s nutrition</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Progress toward daily goals</h1>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary" to="/nutrition/log">
            Log food
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-5">
          {[
            ["Calories", totals.calories, goals.calories_goal, "kcal"],
            ["Protein", totals.protein_g, goals.protein_goal_g, "g"],
            ["Carbs", totals.carbs_g, goals.carbs_goal_g, "g"],
            ["Fat", totals.fat_g, goals.fat_goal_g, "g"],
          ].map(([label, value, goal, unit]) => {
            const percentage = Math.min((value / Math.max(goal, 1)) * 100, 100);
            return (
              <div key={label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-textMuted">{label}</span>
                  <span className="font-semibold">
                    {Math.round(value)} / {Math.round(goal)} {unit}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-background/60">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="h-3 rounded-full bg-gradient-to-r from-primary to-secondary"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-background/60 p-4">
            <p className="text-sm text-textMuted">Remaining calories</p>
            <p className="mt-2 text-3xl font-bold">{Math.round(goals.calories_goal - totals.calories)} kcal</p>
          </div>
          <div className="rounded-3xl bg-background/60 p-4">
            <p className="text-sm text-textMuted">Remaining protein</p>
            <p className="mt-2 text-3xl font-bold">{Math.round(goals.protein_goal_g - totals.protein_g)} g</p>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-6">
        <h2 className="text-2xl font-semibold">Meals by type</h2>
        <div className="mt-6 space-y-5">
          {mealOrder.map((mealType) => (
            <div key={mealType} className="rounded-3xl bg-background/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold capitalize">{mealType.replace("_", " ")}</p>
                <p className="text-sm text-textMuted">{groupedMeals[mealType].length} items</p>
              </div>
              <div className="space-y-3">
                {groupedMeals[mealType].length ? (
                  groupedMeals[mealType].map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{item.food_name}</p>
                          <p className="text-sm text-textMuted">{Number(item.quantity_g)} g</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{Math.round(item.calories)} kcal</p>
                          <p className="text-sm text-textMuted">
                            P {Math.round(item.protein_g)} / C {Math.round(item.carbs_g)} / F {Math.round(item.fat_g)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-textMuted">Nothing logged yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
