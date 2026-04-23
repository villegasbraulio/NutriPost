import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

import { useLanguage } from "../hooks/useLanguage";
import { LoadingSkeleton } from "./LoadingSkeleton";

export function WeeklyInsightCard({ insight, loading, onRefresh }) {
  const { isSpanish } = useLanguage();
  if (loading) {
    return <LoadingSkeleton className="h-32 rounded-[28px]" />;
  }

  if (!insight) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
      className="glass-panel rounded-[28px] border-l-4 border-l-secondary p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-secondary">
            🧠 {isSpanish ? "Tu insight semanal" : "Your weekly insight"}
          </p>
          <p className="text-sm italic leading-relaxed text-textPrimary/90">
            {insight.available ? insight.content : insight.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="self-start rounded-2xl border border-white/10 p-2 text-textMuted transition hover:border-secondary/40 hover:text-textPrimary"
          aria-label={isSpanish ? "Actualizar insight semanal" : "Refresh weekly insight"}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </motion.section>
  );
}
