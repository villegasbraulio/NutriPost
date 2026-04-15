import { motion } from "framer-motion";
import { AlertTriangle, Search, Sparkles, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { nutritionService } from "../services/nutritionService";
import { staggerContainer, staggerItem } from "../utils/animations";

const mealTypes = [
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["dinner", "Dinner"],
  ["snack", "Snack"],
  ["post_workout", "Post-workout"],
];

const confidenceStyles = {
  high: {
    dot: "bg-primary",
    badge: "bg-primary/12 text-primary",
  },
  medium: {
    dot: "bg-accent",
    badge: "bg-accent/12 text-accent",
  },
  low: {
    dot: "bg-rose-400",
    badge: "bg-rose-400/12 text-rose-300",
  },
};

function buildParsedItemId(item, index) {
  return `${item.food_name}-${item.open_food_facts_query}-${index}`;
}

function roundValue(value) {
  return Math.round(Number(value) || 0);
}

function buildPayloadFromParsedItem(item, mealType) {
  const quantity = Number(item.estimated_quantity_g || 0);
  const ratio = quantity > 0 ? quantity / 100 : 0;

  if (item.offMatch) {
    return {
      food_name: item.offMatch.name,
      open_food_facts_id: item.offMatch.id,
      calories: Number((item.offMatch.calories_per_100g * ratio).toFixed(1)),
      protein_g: Number((item.offMatch.protein_g * ratio).toFixed(1)),
      carbs_g: Number((item.offMatch.carbs_g * ratio).toFixed(1)),
      fat_g: Number((item.offMatch.fat_g * ratio).toFixed(1)),
      quantity_g: quantity,
      meal_type: mealType,
    };
  }

  return {
    food_name: item.food_name,
    open_food_facts_id: `ai:${item.open_food_facts_query}`.slice(0, 100),
    calories: Number(item.calories),
    protein_g: Number(item.protein_g),
    carbs_g: Number(item.carbs_g),
    fat_g: Number(item.fat_g),
    quantity_g: quantity,
    meal_type: mealType,
  };
}

export function NutritionLogPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState(location.state?.prefillFoods?.[0] || null);
  const [mealType, setMealType] = useState("post_workout");
  const [quantity, setQuantity] = useState(150);
  const [description, setDescription] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsedMeal, setParsedMeal] = useState(null);
  const [selectedParsedIds, setSelectedParsedIds] = useState({});

  useEffect(() => {
    if (location.state?.prefillFoods?.length) {
      setSelectedFood(location.state.prefillFoods[0]);
      setActiveTab("search");
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
        const data = await nutritionService.searchFoods(
          query,
          mealType === "post_workout" ? "balanced" : "carbs",
        );
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => window.clearTimeout(handle);
  }, [query, mealType]);

  const ratio = quantity / 100;
  const liveMacros = selectedFood
    ? {
        calories: Math.round(selectedFood.calories_per_100g * ratio),
        protein_g: Number((selectedFood.protein_g * ratio).toFixed(1)),
        carbs_g: Number((selectedFood.carbs_g * ratio).toFixed(1)),
        fat_g: Number((selectedFood.fat_g * ratio).toFixed(1)),
      }
    : null;

  const selectedParsedItems =
    parsedMeal?.items?.filter((item) => selectedParsedIds[item.clientId]) || [];
  const parsedTotals = selectedParsedItems.reduce(
    (totals, item) => ({
      calories: totals.calories + Number(item.calories || 0),
      protein_g: totals.protein_g + Number(item.protein_g || 0),
      carbs_g: totals.carbs_g + Number(item.carbs_g || 0),
      fat_g: totals.fat_g + Number(item.fat_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  const handleSaveSearchedFood = async () => {
    if (!selectedFood || !liveMacros) {
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

  const handleParseMeal = async () => {
    if (!description.trim()) {
      toast.error("Describe your meal first.");
      return;
    }

    setParsing(true);
    setParsedMeal(null);
    setSelectedParsedIds({});

    try {
      const parsed = await nutritionService.parseMeal(description);
      const enrichedItems = await Promise.all(
        (parsed.items || []).map(async (item, index) => {
          const clientId = buildParsedItemId(item, index);
          try {
            const matches = await nutritionService.searchFoods(item.open_food_facts_query, "balanced");
            return { ...item, clientId, offMatch: matches[0] || null };
          } catch {
            return { ...item, clientId, offMatch: null };
          }
        }),
      );

      setParsedMeal({ ...parsed, items: enrichedItems });
      setSelectedParsedIds(
        Object.fromEntries(enrichedItems.map((item) => [item.clientId, true])),
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not analyze that meal.");
    } finally {
      setParsing(false);
    }
  };

  const handleToggleParsedItem = (itemId) => {
    setSelectedParsedIds((current) => ({ ...current, [itemId]: !current[itemId] }));
  };

  const handleLogParsedItems = async () => {
    if (!selectedParsedItems.length) {
      toast.error("Select at least one item to log.");
      return;
    }

    await toast.promise(
      Promise.all(
        selectedParsedItems.map((item) =>
          nutritionService.createFoodLog(buildPayloadFromParsedItem(item, mealType)),
        ),
      ),
      {
        loading: "Logging selected foods...",
        success: "Selected foods added to your day.",
        error: (error) => error.response?.data?.message || "Could not log the selected foods.",
      },
    );
    navigate("/nutrition/today");
  };

  if (searching && !results.length && activeTab === "search") {
    return <LoadingSkeleton className="h-[640px] rounded-[32px]" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
      <section className="glass-panel rounded-[32px] p-6">
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Food log</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Log exact foods or describe your meal naturally</h1>
          </div>

          <div className="inline-flex rounded-2xl bg-background/60 p-1">
            {[
              ["search", "Search Food"],
              ["describe", "Describe your meal"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  activeTab === value ? "bg-primary text-background" : "text-textMuted hover:text-textPrimary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

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

        {activeTab === "search" ? (
          <>
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
          </>
        ) : (
          <div className="space-y-5">
            <div className="rounded-3xl bg-background/45 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-secondary/15 p-2 text-secondary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Describe your meal</p>
                  <p className="text-sm text-textMuted">NutriPost will estimate portions, macros, and suggested Open Food Facts matches.</p>
                </div>
              </div>
            </div>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. I had grilled chicken with rice and salad"
              className="focus-ring min-h-[180px] w-full rounded-[28px] border border-white/10 bg-background/60 px-4 py-4 text-sm"
            />

            <button
              type="button"
              onClick={handleParseMeal}
              disabled={parsing}
              className="w-full rounded-2xl bg-secondary px-4 py-3 font-semibold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Parse meal
            </button>

            {parsing ? (
              <div className="rounded-3xl border border-white/10 bg-background/45 p-6 text-center">
                <motion.p
                  animate={{ opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="font-medium text-textPrimary"
                >
                  Analyzing your meal...
                </motion.p>
                <p className="mt-2 text-sm text-textMuted">Estimating foods, portions, and macros from your description.</p>
              </div>
            ) : null}

            {parsedMeal?.items?.length ? (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4">
                {parsedMeal.items.map((item) => {
                  const style = confidenceStyles[item.confidence] || confidenceStyles.medium;
                  return (
                    <motion.label
                      key={item.clientId}
                      variants={staggerItem}
                      className="rounded-[28px] border border-white/10 bg-background/50 p-5"
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedParsedIds[item.clientId])}
                          onChange={() => handleToggleParsedItem(item.clientId)}
                          className="mt-1 h-4 w-4 rounded border-white/20 bg-background/40 text-primary"
                        />
                        <div className="flex-1 space-y-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-lg font-semibold">{item.food_name}</p>
                              <p className="text-sm text-textMuted">{roundValue(item.estimated_quantity_g)} g estimated portion</p>
                            </div>
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${style.badge}`}>
                              <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                              {item.confidence}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {[
                              ["P", `${roundValue(item.protein_g)}g`],
                              ["C", `${roundValue(item.carbs_g)}g`],
                              ["F", `${roundValue(item.fat_g)}g`],
                              ["Kcal", `${roundValue(item.calories)}`],
                            ].map(([label, value]) => (
                              <span key={label} className="rounded-full bg-background px-3 py-1 text-xs text-textMuted">
                                {label} {value}
                              </span>
                            ))}
                          </div>

                          {item.offMatch ? (
                            <div className="rounded-2xl border border-white/10 bg-background/45 px-4 py-3 text-sm">
                              <p className="font-medium text-textPrimary">Suggested product match</p>
                              <p className="mt-1 text-textMuted">
                                {item.offMatch.name}
                                {item.offMatch.brand ? ` • ${item.offMatch.brand}` : ""}
                              </p>
                            </div>
                          ) : null}

                          {item.confidence === "low" ? (
                            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <p>Macro estimates may vary — consider searching for this item manually</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </motion.label>
                  );
                })}
              </motion.div>
            ) : null}
          </div>
        )}
      </section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] p-6">
        <div className="mb-6 flex items-center gap-3">
          <Utensils className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold">
              {activeTab === "search" ? "Selected food" : "Meal review"}
            </h2>
            <p className="text-sm text-textMuted">
              {activeTab === "search"
                ? "Macros update live with quantity."
                : "Confirm the parsed foods you want to log."}
            </p>
          </div>
        </div>

        {activeTab === "search" ? (
          selectedFood && liveMacros ? (
            <div className="space-y-5">
              <div className="rounded-3xl bg-background/50 p-5">
                <p className="text-2xl font-semibold">{selectedFood.name}</p>
                <p className="text-sm text-textMuted">{selectedFood.brand || "Open Food Facts"}</p>
              </div>
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
                onClick={handleSaveSearchedFood}
                className="w-full rounded-2xl bg-primary px-4 py-3 font-semibold text-background transition hover:bg-primary/90"
              >
                Save Food Entry
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-textMuted">
              Search for a food or pick one from a recommendation.
            </div>
          )
        ) : parsedMeal ? (
          <div className="space-y-5">
            <div className="rounded-3xl bg-background/50 p-5">
              <p className="text-lg font-semibold">Selected meal totals</p>
              <p className="mt-2 text-sm text-textMuted">
                {selectedParsedItems.length} confirmed item{selectedParsedItems.length === 1 ? "" : "s"} ready to log
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Calories", `${roundValue(parsedTotals.calories)} kcal`],
                ["Protein", `${roundValue(parsedTotals.protein_g)} g`],
                ["Carbs", `${roundValue(parsedTotals.carbs_g)} g`],
                ["Fat", `${roundValue(parsedTotals.fat_g)} g`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl bg-background/50 p-4">
                  <p className="text-sm text-textMuted">{label}</p>
                  <p className="mt-2 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleLogParsedItems}
              className="w-full rounded-2xl bg-primary px-4 py-3 font-semibold text-background transition hover:bg-primary/90"
            >
              Log selected items
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-textMuted">
            Parse a meal description to review the detected items here.
          </div>
        )}
      </motion.section>
    </div>
  );
}
