import { motion } from "framer-motion";
import { Flame, PackageOpen } from "lucide-react";

import { useLanguage } from "../hooks/useLanguage";
import {
  localizeNutritionBrand,
  localizeNutritionSourceLabel,
  localizeNutritionText,
} from "../utils/nutritionLocalization";

export function FoodRecommendationCard({ food, onSelect }) {
  const { isSpanish } = useLanguage();
  const displayName = localizeNutritionText(food.name, isSpanish);
  const displayBrand = localizeNutritionBrand(food.brand, isSpanish);
  const displaySourceLabel = localizeNutritionSourceLabel(
    food.nutrition_source_label || food.nutrition_source || "Open Food Facts",
    isSpanish,
  );
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      onClick={() => onSelect(food)}
      className="glass-panel flex w-full flex-col overflow-hidden rounded-3xl text-left transition-colors hover:border-primary/40"
    >
      <div className="h-36 overflow-hidden bg-background/60">
        {food.image_url ? (
          <img
            src={food.image_url}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-textMuted">
            <PackageOpen className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-lg font-semibold">{displayName}</p>
          <p className="text-sm text-textMuted">{displayBrand || displaySourceLabel}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-background/50 p-3">
            <p className="text-textMuted">{isSpanish ? "Proteina" : "Protein"}</p>
            <p className="font-semibold">{food.protein_g}g</p>
          </div>
          <div className="rounded-2xl bg-background/50 p-3">
            <p className="text-textMuted">{isSpanish ? "Carbohidratos" : "Carbs"}</p>
            <p className="font-semibold">{food.carbs_g}g</p>
          </div>
          <div className="rounded-2xl bg-background/50 p-3">
            <p className="text-textMuted">{isSpanish ? "Grasas" : "Fat"}</p>
            <p className="font-semibold">{food.fat_g}g</p>
          </div>
          <div className="rounded-2xl bg-background/50 p-3">
            <p className="text-textMuted">{isSpanish ? "Calorias" : "Calories"}</p>
            <p className="font-semibold">{food.calories_per_100g}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-accent">
          <Flame className="h-4 w-4" />
          {isSpanish ? "Agregar al registro de comida" : "Add to food log"}
        </div>
      </div>
    </motion.button>
  );
}
