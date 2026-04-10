import { motion } from "framer-motion";
import { Flame, PackageOpen } from "lucide-react";

export function FoodRecommendationCard({ food, onSelect }) {
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
            alt={food.name}
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
          <p className="text-lg font-semibold">{food.name}</p>
          <p className="text-sm text-textMuted">{food.brand || "Open Food Facts"}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-background/50 p-3">
            <p className="text-textMuted">Protein</p>
            <p className="font-semibold">{food.protein_g}g</p>
          </div>
          <div className="rounded-2xl bg-background/50 p-3">
            <p className="text-textMuted">Carbs</p>
            <p className="font-semibold">{food.carbs_g}g</p>
          </div>
          <div className="rounded-2xl bg-background/50 p-3">
            <p className="text-textMuted">Fat</p>
            <p className="font-semibold">{food.fat_g}g</p>
          </div>
          <div className="rounded-2xl bg-background/50 p-3">
            <p className="text-textMuted">Calories</p>
            <p className="font-semibold">{food.calories_per_100g}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-accent">
          <Flame className="h-4 w-4" />
          Add to food log
        </div>
      </div>
    </motion.button>
  );
}
