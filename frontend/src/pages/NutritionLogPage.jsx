import { motion } from "framer-motion";
import { Search, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { nutritionService } from "../services/nutritionService";

const mealTypes = [
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["dinner", "Dinner"],
  ["snack", "Snack"],
  ["post_workout", "Post-workout"],
];

export function NutritionLogPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState(location.state?.prefillFoods?.[0] || null);
  const [mealType, setMealType] = useState("post_workout");
  const [quantity, setQuantity] = useState(150);

  useEffect(() => {
    if (location.state?.prefillFoods?.length) {
      setSelectedFood(location.state.prefillFoods[0]);
    }
  }, [location.state]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const data = await nutritionService.searchFoods(query, mealType === "post_workout" ? "balanced" : "carbs");
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => window.clearTimeout(handle);
  }, [query, mealType]);

  if (searching && !results.length) {
    return <LoadingSkeleton className="h-[640px] rounded-[32px]" />;
  }

  const ratio = quantity / 100;
  const liveMacros = selectedFood
    ? {
        calories: Math.round(selectedFood.calories_per_100g * ratio),
        protein_g: (selectedFood.protein_g * ratio).toFixed(1),
        carbs_g: (selectedFood.carbs_g * ratio).toFixed(1),
        fat_g: (selectedFood.fat_g * ratio).toFixed(1),
      }
    : null;

  const handleSubmit = async () => {
    if (!selectedFood) {
      toast.error("Pick a food first.");
      return;
    }
    await toast.promise(
      nutritionService.createFoodLog({
        food_name: selectedFood.name,
        open_food_facts_id: selectedFood.id,
        calories: Number(liveMacros.calories),
        protein_g: Number(liveMacros.protein_g),
        carbs_g: Number(liveMacros.carbs_g),
        fat_g: Number(liveMacros.fat_g),
        quantity_g: quantity,
        meal_type: mealType,
      }),
      {
        loading: "Saving food log...",
        success: "Food added to your day.",
        error: (error) => error.response?.data?.message || "Could not save this food.",
      },
    );
    navigate("/nutrition/today");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="glass-panel rounded-[32px] p-6">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">Food log</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Search Open Food Facts in real time</h1>
        </div>

        {location.state?.prefillFoods?.length ? (
          <div className="mb-6 flex flex-wrap gap-3">
            {location.state.prefillFoods.map((food) => (
              <button
                key={food.id}
                onClick={() => setSelectedFood(food)}
                className={`rounded-full px-4 py-2 text-sm ${
                  selectedFood?.id === food.id ? "bg-primary text-background" : "bg-background/60 text-textMuted"
                }`}
              >
                {food.name}
              </button>
            ))}
          </div>
        ) : null}

        <label className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-3">
          <Search className="h-4 w-4 text-textMuted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
            placeholder="Search chicken, yogurt, oats..."
          />
        </label>

        <div className="mt-6 grid gap-3">
          {results.map((food) => (
            <button
              key={food.id}
              onClick={() => setSelectedFood(food)}
              className={`rounded-3xl border p-4 text-left transition ${
                selectedFood?.id === food.id
                  ? "border-primary bg-primary/10"
                  : "border-white/10 bg-background/60 hover:border-secondary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{food.name}</p>
                  <p className="text-sm text-textMuted">{food.brand || "Open Food Facts"}</p>
                </div>
                <div className="text-right text-sm text-textMuted">
                  <p>{food.calories_per_100g} kcal</p>
                  <p>per 100g</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] p-6">
        <div className="mb-6 flex items-center gap-3">
          <Utensils className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold">Selected food</h2>
            <p className="text-sm text-textMuted">Macros update live with quantity.</p>
          </div>
        </div>

        {selectedFood ? (
          <div className="space-y-5">
            <div className="rounded-3xl bg-background/50 p-5">
              <p className="text-2xl font-semibold">{selectedFood.name}</p>
              <p className="text-sm text-textMuted">{selectedFood.brand || "Open Food Facts"}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm text-textMuted">Quantity (g)</span>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm text-textMuted">Meal type</span>
                <select
                  value={mealType}
                  onChange={(event) => setMealType(event.target.value)}
                  className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
                >
                  {mealTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Calories", `${liveMacros.calories} kcal`],
                ["Protein", `${liveMacros.protein_g} g`],
                ["Carbs", `${liveMacros.carbs_g} g`],
                ["Fat", `${liveMacros.fat_g} g`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl bg-background/50 p-4">
                  <p className="text-sm text-textMuted">{label}</p>
                  <p className="mt-2 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full rounded-2xl bg-primary px-4 py-3 font-semibold text-background transition hover:bg-primary/90"
            >
              Save Food Entry
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-textMuted">
            Search for a food or pick one from a recommendation.
          </div>
        )}
      </motion.section>
    </div>
  );
}
