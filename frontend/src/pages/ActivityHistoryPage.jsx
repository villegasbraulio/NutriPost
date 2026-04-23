import { motion } from "framer-motion";
import { CalendarRange } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useActivities } from "../hooks/useActivities";
import { useLanguage } from "../hooks/useLanguage";
import { formatDateTime, groupActivitiesByDate } from "../utils/date";

export function ActivityHistoryPage() {
  const { isSpanish } = useLanguage();
  const [filters, setFilters] = useState({ start_date: "", end_date: "", category: "" });
  const { activityLogs, loading } = useActivities(filters);
  const copy = isSpanish
    ? {
        title: "Historial de actividades",
        description: "Filtra por rango de fechas y categoria.",
        allCategories: "Todas las categorias",
        cardio: "Cardio",
        strength: "Fuerza",
        flexibility: "Flexibilidad",
        sport: "Deporte",
        routine: "Rutina",
        minutes: "minutos",
        recommendation: "Recomendacion",
      }
    : {
        title: "Activity history",
        description: "Filter by date range and category.",
        allCategories: "All categories",
        cardio: "Cardio",
        strength: "Strength",
        flexibility: "Flexibility",
        sport: "Sport",
        routine: "Routine",
        minutes: "minutes",
        recommendation: "Recommendation",
      };

  if (loading) {
    return <LoadingSkeleton className="h-[520px] rounded-[32px]" />;
  }

  const groups = groupActivitiesByDate(activityLogs);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <CalendarRange className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
            <p className="text-sm text-textMuted">{copy.description}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <input
            type="date"
            value={filters.start_date}
            onChange={(event) => setFilters((current) => ({ ...current, start_date: event.target.value }))}
            className="focus-ring rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
          />
          <input
            type="date"
            value={filters.end_date}
            onChange={(event) => setFilters((current) => ({ ...current, end_date: event.target.value }))}
            className="focus-ring rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
          />
          <select
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            className="focus-ring rounded-2xl border border-white/10 bg-background/60 px-4 py-3"
          >
            <option value="">{copy.allCategories}</option>
            <option value="cardio">{copy.cardio}</option>
            <option value="strength">{copy.strength}</option>
            <option value="flexibility">{copy.flexibility}</option>
            <option value="sport">{copy.sport}</option>
          </select>
        </div>
      </section>

      <section className="space-y-8">
        {Object.entries(groups).map(([label, items]) => (
          <div key={label} className="grid gap-4 lg:grid-cols-[160px_1fr]">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-textMuted">{label}</div>
            <div className="space-y-4 lg:border-l lg:border-white/10 lg:pl-6">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.01 }}
                  className="relative rounded-3xl border border-white/10 bg-surface/60 p-5"
                >
                  <div className="absolute -left-[34px] top-8 hidden h-4 w-4 rounded-full border-4 border-background bg-primary lg:block" />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xl font-semibold">{item.activity_type.name}</p>
                      <p className="text-sm text-textMuted">
                        {item.duration_minutes} {copy.minutes} • {formatDateTime(item.logged_at)}
                      </p>
                      {item.gym_routine ? (
                        <p className="mt-1 text-sm text-secondary">{copy.routine}: {item.gym_routine.name}</p>
                      ) : null}
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-bold text-primary">{Math.round(item.calories_burned)} kcal</p>
                        <p className="text-sm capitalize text-textMuted">{item.activity_type.category}</p>
                      </div>
                      <Link
                        to={`/activities/logs/${item.id}`}
                        className="flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-background"
                      >
                        {copy.recommendation}
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
