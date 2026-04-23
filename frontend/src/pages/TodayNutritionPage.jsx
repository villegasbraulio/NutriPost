import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useNutrition } from "../hooks/useNutrition";
import { getLocalDateString } from "../utils/date";
import { localizeNutritionSourceLabel, localizeNutritionText } from "../utils/nutritionLocalization";

const mealOrder = ["breakfast", "lunch", "dinner", "snack", "post_workout"];

export function TodayNutritionPage() {
  const today = getLocalDateString();
  const { user } = useAuth();
  const { isSpanish } = useLanguage();
  const { foodLogs, loading } = useNutrition(today);
  const copy = isSpanish
    ? {
        sectionTag: "Nutricion de hoy",
        title: "Progreso hacia tus objetivos diarios",
        logFood: "Cargar comida",
        calories: "Calorias",
        protein: "Proteina",
        carbs: "Carbohidratos",
        fat: "Grasas",
        remainingCalories: "Calorias restantes",
        remainingProtein: "Proteina restante",
        overCalories: "Por encima de las calorias del dia",
        leftToday: "Te quedan hoy",
        aboveTarget: "Por encima del objetivo",
        mealsByType: "Comidas por tipo",
        items: "items",
        nothing: "Todavia no hay registros.",
        breakfast: "Desayuno",
        lunch: "Almuerzo",
        dinner: "Cena",
        snack: "Snack",
        post_workout: "Post-entreno",
      }
    : {
        sectionTag: "Today’s nutrition",
        title: "Progress toward daily goals",
        logFood: "Log food",
        calories: "Calories",
        protein: "Protein",
        carbs: "Carbs",
        fat: "Fat",
        remainingCalories: "Remaining calories",
        remainingProtein: "Remaining protein",
        overCalories: "Over daily calories",
        leftToday: "Left today",
        aboveTarget: "Above target",
        mealsByType: "Meals by type",
        items: "items",
        nothing: "Nothing logged yet.",
        breakfast: "Breakfast",
        lunch: "Lunch",
        dinner: "Dinner",
        snack: "Snack",
        post_workout: "Post-workout",
      };

  const getDisplayFoodName = (value) => localizeNutritionText(value, isSpanish);
  const getDisplaySourceLabel = (value) => localizeNutritionSourceLabel(value, isSpanish);

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
  const remaining = {
    calories: Number(goals.calories_goal || 0) - totals.calories,
    protein_g: Number(goals.protein_goal_g || 0) - totals.protein_g,
    carbs_g: Number(goals.carbs_goal_g || 0) - totals.carbs_g,
    fat_g: Number(goals.fat_goal_g || 0) - totals.fat_g,
  };

  const groupedMeals = mealOrder.reduce((groups, mealType) => {
    groups[mealType] = foodLogs.filter((item) => item.meal_type === mealType);
    return groups;
  }, {});

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="glass-panel rounded-[32px] p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">{copy.sectionTag}</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{copy.title}</h1>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary" to="/nutrition/log">
            {copy.logFood}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-5">
          {[
            [copy.calories, totals.calories, goals.calories_goal, "kcal"],
            [copy.protein, totals.protein_g, goals.protein_goal_g, "g"],
            [copy.carbs, totals.carbs_g, goals.carbs_goal_g, "g"],
            [copy.fat, totals.fat_g, goals.fat_goal_g, "g"],
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
            <p className="text-sm text-textMuted">{copy.remainingCalories}</p>
            <p className={`mt-2 text-3xl font-bold ${remaining.calories < 0 ? "text-accent" : ""}`}>
              {Math.round(Math.abs(remaining.calories))} kcal
            </p>
            <p className="mt-1 text-xs text-textMuted">
              {remaining.calories < 0 ? copy.overCalories : copy.leftToday}
            </p>
          </div>
          <div className="rounded-3xl bg-background/60 p-4">
            <p className="text-sm text-textMuted">{copy.remainingProtein}</p>
            <p className={`mt-2 text-3xl font-bold ${remaining.protein_g < 0 ? "text-primary" : ""}`}>
              {Math.round(Math.abs(remaining.protein_g))} g
            </p>
            <p className="mt-1 text-xs text-textMuted">
              {remaining.protein_g < 0 ? copy.aboveTarget : copy.leftToday}
            </p>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-5 sm:p-6">
        <h2 className="text-2xl font-semibold">{copy.mealsByType}</h2>
        <div className="mt-6 space-y-5">
          {mealOrder.map((mealType) => (
            <div key={mealType} className="rounded-3xl bg-background/50 p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold capitalize">{copy[mealType]}</p>
                <p className="text-sm text-textMuted">{groupedMeals[mealType].length} {copy.items}</p>
              </div>
              <div className="space-y-3">
                {groupedMeals[mealType].length ? (
                  groupedMeals[mealType].map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 px-4 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words font-medium">{getDisplayFoodName(item.food_name)}</p>
                          <p className="text-sm text-textMuted">
                            {Number(item.quantity_g)} g
                            {item.nutrition_source_label ? ` • ${getDisplaySourceLabel(item.nutrition_source_label)}` : ""}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-semibold">{Math.round(item.calories)} kcal</p>
                          <p className="text-sm text-textMuted">
                            P {Math.round(item.protein_g)} / C {Math.round(item.carbs_g)} / F {Math.round(item.fat_g)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-textMuted">{copy.nothing}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
