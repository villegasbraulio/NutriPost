import { motion } from "framer-motion";
import { AlertTriangle, Search, Sparkles, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useLanguage } from "../hooks/useLanguage";
import { nutritionService } from "../services/nutritionService";
import { staggerContainer, staggerItem } from "../utils/animations";
import {
  localizeNutritionBrand,
  localizeNutritionSourceLabel,
  localizeNutritionText,
} from "../utils/nutritionLocalization";

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
  return `${item.food_name}-${item.search_query}-${index}`;
}

function roundValue(value) {
  return Math.round(Number(value) || 0);
}

function buildSourceMetadata(item) {
  return {
    ...(item.source_metadata || {}),
    source_name: item.source_metadata?.source_name || item.source_name || item.name || item.food_name || "",
    source_brand: item.source_metadata?.source_brand || item.source_brand || item.brand || "",
    nutrition_source_label:
      item.source_metadata?.nutrition_source_label || item.nutrition_source_label || "",
  };
}

function buildSourceReference(item, fallbackPrefix = "manual") {
  return String(
    item.source_item_id || item.id || `${fallbackPrefix}:${item.search_query || item.food_name || "food"}`
  ).slice(0, 100);
}

function buildPayloadFromParsedItem(item, mealType) {
  const quantity = Number(item.estimated_quantity_g || 0);
  const sourceReference = buildSourceReference(item, item.nutrition_source || "ai");

  return {
    food_name: item.food_name,
    open_food_facts_id: sourceReference,
    nutrition_source: item.nutrition_source || "ai",
    source_item_id: item.source_item_id || sourceReference,
    source_metadata: buildSourceMetadata(item),
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
  const { isSpanish } = useLanguage();
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
  const copy = isSpanish
    ? {
        mealTypes: [
          ["breakfast", "Desayuno"],
          ["lunch", "Almuerzo"],
          ["dinner", "Cena"],
          ["snack", "Snack"],
          ["post_workout", "Post-entreno"],
        ],
        pickFood: "Elige primero un alimento.",
        saveLoading: "Guardando comida...",
        saveSuccess: "Comida agregada a tu dia.",
        saveError: "No pudimos guardar esta comida.",
        describeMeal: "Describe primero tu comida.",
        analyzeError: "No pudimos analizar esa comida.",
        selectItems: "Selecciona al menos un item para cargar.",
        logLoading: "Cargando alimentos seleccionados...",
        logSuccess: "Los alimentos elegidos se agregaron a tu dia.",
        logError: "No pudimos cargar los alimentos seleccionados.",
        sectionTag: "Registro de comida",
        title: "Carga alimentos exactos o describe tu comida naturalmente",
        searchTab: "Buscar alimento",
        describeTab: "Describir comida",
        mealType: "Tipo de comida",
        searchPlaceholder: "Busca pollo, yogurt, avena...",
        describeCardTitle: "Describe tu comida",
        describeCardText: "NutriPost detectara los alimentos y resolvera macros con USDA u Open Food Facts cuando haya una buena coincidencia.",
        describePlaceholder: "ej. Comi pollo grillado con arroz y ensalada",
        parseMeal: "Analizar comida",
        analyzingMeal: "Analizando tu comida...",
        analyzingMealText: "Detectando alimentos, porciones y la mejor fuente nutricional para cada item.",
        estimatedPortion: "porcion estimada",
        resolvedSource: "Fuente nutricional",
        lowConfidence: "Los macros pueden variar. Te conviene buscar este alimento manualmente.",
        selectedFood: "Alimento seleccionado",
        mealReview: "Revision de comida",
        selectedFoodText: "Los macros se actualizan en vivo con la cantidad.",
        mealReviewText: "Confirma los alimentos detectados que quieres cargar.",
        quantity: "Cantidad (g)",
        calories: "Calorias",
        protein: "Proteina",
        carbs: "Carbohidratos",
        fat: "Grasas",
        saveEntry: "Guardar comida",
        searchHint: "Busca un alimento o elige uno desde una recomendacion.",
        selectedMealTotals: "Totales de la comida elegida",
        confirmedItems: (count) =>
          `${count} item${count === 1 ? "" : "s"} confirmado${count === 1 ? "" : "s"} listo${count === 1 ? "" : "s"} para cargar`,
        logItems: "Cargar items seleccionados",
        parseHint: "Analiza una descripcion para revisar aqui los alimentos detectados.",
        per100g: "por 100g",
        confidenceHigh: "alta",
        confidenceMedium: "media",
        confidenceLow: "baja",
      }
    : {
        mealTypes: [
          ["breakfast", "Breakfast"],
          ["lunch", "Lunch"],
          ["dinner", "Dinner"],
          ["snack", "Snack"],
          ["post_workout", "Post-workout"],
        ],
        pickFood: "Pick a food first.",
        saveLoading: "Saving food log...",
        saveSuccess: "Food added to your day.",
        saveError: "Could not save this food.",
        describeMeal: "Describe your meal first.",
        analyzeError: "Could not analyze that meal.",
        selectItems: "Select at least one item to log.",
        logLoading: "Logging selected foods...",
        logSuccess: "Selected foods added to your day.",
        logError: "Could not log the selected foods.",
        sectionTag: "Food log",
        title: "Log exact foods or describe your meal naturally",
        searchTab: "Search Food",
        describeTab: "Describe your meal",
        mealType: "Meal type",
        searchPlaceholder: "Search chicken, yogurt, oats...",
        describeCardTitle: "Describe your meal",
        describeCardText: "NutriPost will detect foods and resolve macros with USDA or Open Food Facts when there is a strong match.",
        describePlaceholder: "e.g. I had grilled chicken with rice and salad",
        parseMeal: "Parse meal",
        analyzingMeal: "Analyzing your meal...",
        analyzingMealText: "Detecting foods, portions, and the best nutrition source for each item.",
        estimatedPortion: "estimated portion",
        resolvedSource: "Nutrition source",
        lowConfidence: "Macro estimates may vary — consider searching for this item manually",
        selectedFood: "Selected food",
        mealReview: "Meal review",
        selectedFoodText: "Macros update live with quantity.",
        mealReviewText: "Confirm the parsed foods you want to log.",
        quantity: "Quantity (g)",
        calories: "Calories",
        protein: "Protein",
        carbs: "Carbs",
        fat: "Fat",
        saveEntry: "Save Food Entry",
        searchHint: "Search for a food or pick one from a recommendation.",
        selectedMealTotals: "Selected meal totals",
        confirmedItems: (count) =>
          `${count} confirmed item${count === 1 ? "" : "s"} ready to log`,
        logItems: "Log selected items",
        parseHint: "Parse a meal description to review the detected items here.",
        per100g: "per 100g",
        confidenceHigh: "high",
        confidenceMedium: "medium",
        confidenceLow: "low",
      };

  const getDisplayFoodName = (value) => localizeNutritionText(value, isSpanish);
  const getDisplayBrand = (value) => localizeNutritionBrand(value, isSpanish);
  const getDisplaySourceLabel = (value) => localizeNutritionSourceLabel(value, isSpanish);

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
      toast.error(copy.pickFood);
      return;
    }

    await toast.promise(
      nutritionService.createFoodLog({
        food_name: selectedFood.name,
        open_food_facts_id: buildSourceReference(selectedFood, selectedFood.nutrition_source || "manual"),
        nutrition_source: selectedFood.nutrition_source || "manual",
        source_item_id: selectedFood.source_item_id || buildSourceReference(selectedFood, "manual"),
        source_metadata: buildSourceMetadata(selectedFood),
        calories: Number(liveMacros.calories),
        protein_g: Number(liveMacros.protein_g),
        carbs_g: Number(liveMacros.carbs_g),
        fat_g: Number(liveMacros.fat_g),
        quantity_g: quantity,
        meal_type: mealType,
      }),
      {
        loading: copy.saveLoading,
        success: copy.saveSuccess,
        error: (error) => error.response?.data?.message || copy.saveError,
      },
    );
    navigate("/nutrition/today");
  };

  const handleParseMeal = async () => {
    if (!description.trim()) {
      toast.error(copy.describeMeal);
      return;
    }

    setParsing(true);
    setParsedMeal(null);
    setSelectedParsedIds({});

    try {
      const parsed = await nutritionService.parseMeal(description);
      const enrichedItems = (parsed.items || []).map((item, index) => ({
        ...item,
        clientId: buildParsedItemId(item, index),
      }));

      setParsedMeal({ ...parsed, items: enrichedItems });
      setSelectedParsedIds(
        Object.fromEntries(enrichedItems.map((item) => [item.clientId, true])),
      );
    } catch (error) {
      toast.error(error.response?.data?.message || copy.analyzeError);
    } finally {
      setParsing(false);
    }
  };

  const handleToggleParsedItem = (itemId) => {
    setSelectedParsedIds((current) => ({ ...current, [itemId]: !current[itemId] }));
  };

  const handleLogParsedItems = async () => {
    if (!selectedParsedItems.length) {
      toast.error(copy.selectItems);
      return;
    }

    await toast.promise(
      Promise.all(
        selectedParsedItems.map((item) =>
          nutritionService.createFoodLog(buildPayloadFromParsedItem(item, mealType)),
        ),
      ),
      {
        loading: copy.logLoading,
        success: copy.logSuccess,
        error: (error) => error.response?.data?.message || copy.logError,
      },
    );
    navigate("/nutrition/today");
  };

  if (searching && !results.length && activeTab === "search") {
    return <LoadingSkeleton className="h-[640px] rounded-[32px]" />;
  }

  return (
    <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1fr_0.95fr]">
      <section className="glass-panel rounded-[32px] p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">{copy.sectionTag}</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{copy.title}</h1>
          </div>

          <div className="grid w-full grid-cols-2 rounded-2xl bg-background/60 p-1 sm:inline-grid sm:w-auto">
            {[
              ["search", copy.searchTab],
              ["describe", copy.describeTab],
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
            <span className="mb-2 block text-sm text-textMuted">{copy.mealType}</span>
            <select
              value={mealType}
              onChange={(event) => setMealType(event.target.value)}
              className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
            >
              {copy.mealTypes.map(([value, label]) => (
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
                    {getDisplayFoodName(food.name)}
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
                placeholder={copy.searchPlaceholder}
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{getDisplayFoodName(food.name)}</p>
                      <p className="text-sm text-textMuted">
                        {food.brand
                          ? `${getDisplayBrand(food.brand)}${food.nutrition_source_label ? ` • ${getDisplaySourceLabel(food.nutrition_source_label)}` : ""}`
                          : getDisplaySourceLabel(food.nutrition_source_label)}
                      </p>
                    </div>
                    <div className="text-left text-sm text-textMuted sm:text-right">
                      <p>{food.calories_per_100g} kcal</p>
                      <p>{copy.per100g}</p>
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
                  <p className="font-semibold">{copy.describeCardTitle}</p>
                  <p className="text-sm text-textMuted">{copy.describeCardText}</p>
                </div>
              </div>
            </div>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={copy.describePlaceholder}
              className="focus-ring min-h-[180px] w-full rounded-[28px] border border-white/10 bg-background/60 px-4 py-4 text-sm"
            />

            <button
              type="button"
              onClick={handleParseMeal}
              disabled={parsing}
              className="w-full rounded-2xl bg-secondary px-4 py-3 font-semibold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {copy.parseMeal}
            </button>

            {parsing ? (
              <div className="rounded-3xl border border-white/10 bg-background/45 p-6 text-center">
                <motion.p
                  animate={{ opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="font-medium text-textPrimary"
                >
                  {copy.analyzingMeal}
                </motion.p>
                <p className="mt-2 text-sm text-textMuted">{copy.analyzingMealText}</p>
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
                              <p className="text-lg font-semibold">{getDisplayFoodName(item.food_name)}</p>
                              <p className="text-sm text-textMuted">{roundValue(item.estimated_quantity_g)} g {copy.estimatedPortion}</p>
                            </div>
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${style.badge}`}>
                              <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                              {item.confidence === "high"
                                ? copy.confidenceHigh
                                : item.confidence === "low"
                                  ? copy.confidenceLow
                                  : copy.confidenceMedium}
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

                          {item.nutrition_source_label ? (
                            <div className="rounded-2xl border border-white/10 bg-background/45 px-4 py-3 text-sm">
                              <p className="font-medium text-textPrimary">{copy.resolvedSource}</p>
                              <p className="mt-1 text-textMuted">
                                {[
                                  item.source_name && item.source_name !== item.food_name
                                    ? getDisplayFoodName(item.source_name)
                                    : null,
                                  item.source_brand ? getDisplayBrand(item.source_brand) : null,
                                  item.nutrition_source_label
                                    ? getDisplaySourceLabel(item.nutrition_source_label)
                                    : null,
                                ].filter(Boolean).join(" • ") || getDisplaySourceLabel(item.nutrition_source_label)}
                              </p>
                            </div>
                          ) : null}

                          {item.confidence === "low" ? (
                            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <p>{copy.lowConfidence}</p>
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

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <Utensils className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold">
              {activeTab === "search" ? copy.selectedFood : copy.mealReview}
            </h2>
            <p className="text-sm text-textMuted">
              {activeTab === "search"
                ? copy.selectedFoodText
                : copy.mealReviewText}
            </p>
          </div>
        </div>

        {activeTab === "search" ? (
          selectedFood && liveMacros ? (
            <div className="space-y-5">
              <div className="rounded-3xl bg-background/50 p-5">
                <p className="text-2xl font-semibold">{getDisplayFoodName(selectedFood.name)}</p>
                <p className="text-sm text-textMuted">
                  {selectedFood.brand
                    ? `${getDisplayBrand(selectedFood.brand)}${selectedFood.nutrition_source_label ? ` • ${getDisplaySourceLabel(selectedFood.nutrition_source_label)}` : ""}`
                    : getDisplaySourceLabel(selectedFood.nutrition_source_label)}
                </p>
              </div>
              <label>
                <span className="mb-2 block text-sm text-textMuted">{copy.quantity}</span>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="focus-ring w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
                />
              </label>

              <div className="grid gap-3 min-[420px]:grid-cols-2">
                {[
                  [copy.calories, `${liveMacros.calories} kcal`],
                  [copy.protein, `${liveMacros.protein_g} g`],
                  [copy.carbs, `${liveMacros.carbs_g} g`],
                  [copy.fat, `${liveMacros.fat_g} g`],
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
                {copy.saveEntry}
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-textMuted">
              {copy.searchHint}
            </div>
          )
        ) : parsedMeal ? (
          <div className="space-y-5">
            <div className="rounded-3xl bg-background/50 p-5">
              <p className="text-lg font-semibold">{copy.selectedMealTotals}</p>
              <p className="mt-2 text-sm text-textMuted">
                {copy.confirmedItems(selectedParsedItems.length)}
              </p>
            </div>

            <div className="grid gap-3 min-[420px]:grid-cols-2">
              {[
                [copy.calories, `${roundValue(parsedTotals.calories)} kcal`],
                [copy.protein, `${roundValue(parsedTotals.protein_g)} g`],
                [copy.carbs, `${roundValue(parsedTotals.carbs_g)} g`],
                [copy.fat, `${roundValue(parsedTotals.fat_g)} g`],
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
              {copy.logItems}
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-textMuted">
            {copy.parseHint}
          </div>
        )}
      </motion.section>
    </div>
  );
}
