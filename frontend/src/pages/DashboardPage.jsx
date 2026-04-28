import { motion } from "framer-motion";
import { BellRing, CalendarDays, Flame, Salad, TrendingUp, X } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";

import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { StatCard } from "../components/StatCard";
import { WeeklyInsightCard } from "../components/WeeklyInsightCard";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useDashboard } from "../hooks/useDashboard";
import { formatDateLabel } from "../utils/date";

export function DashboardPage() {
  const { user } = useAuth();
  const { isSpanish, locale } = useLanguage();
  const { summary, streak, progress, insight, notifications, insightLoading, loading, refreshInsight, dismissNotification } = useDashboard("7d");
  const copy = isSpanish
    ? {
        sectionTag: "Inicio",
        greeting: user?.first_name
          ? `Hola ${user.first_name}, asi va tu recuperacion de hoy.`
          : "Bienvenido, asi va tu recuperacion de hoy.",
        burnedToday: "Calorias gastadas hoy",
        consumedToday: "Calorias consumidas hoy",
        netBalance: "Balance neto de hoy",
        dayStreak: "Racha de dias",
        weeklyBurn: "Calorias quemadas en la semana",
        weeklyBurnText: "Tu produccion de los ultimos siete dias",
        logActivity: "Cargar actividad",
        noActivityTitle: "Todavia no cargaste actividad esta semana",
        noActivityText: "Carga tu primera sesion y este grafico se completara automaticamente.",
        macroSplit: "Distribucion de macros de hoy",
        macroSplitText: "Proteina, carbohidratos y grasas consumidos hoy",
        noFoodTitle: "Todavia no cargaste comida hoy",
        noFoodText: "Agrega una comida para ver la distribucion de proteina, carbohidratos y grasas.",
        logFood: "Cargar comida",
        recentActivity: "Actividad reciente",
        recentActivityText: "Ultimas sesiones que alimentan tu plan de recuperacion",
        viewAll: "Ver todo",
        noRecentTitle: "Todavia no hay actividad reciente",
        noRecentText: "Cuando cargues un entrenamiento, aparecera aqui con calorias y detalles de recuperacion.",
        remindersTitle: "Recordatorios de recuperacion",
        remindersText: "Estos avisos se generan automaticamente cuando una ventana post-entreno vence sin comida registrada.",
        remindersEmpty: "No hay recordatorios pendientes.",
        openActivity: "Abrir actividad",
        dismissReminder: "Descartar",
        unreadBadge: "sin leer",
        protein: "Proteina",
        carbs: "Carbohidratos",
        fat: "Grasas",
      }
    : {
        sectionTag: "Dashboard",
        greeting: user?.first_name ? `Hi ${user.first_name}, here’s today’s recovery view.` : "Welcome back, here’s today’s recovery view.",
        burnedToday: "Calories burned today",
        consumedToday: "Calories consumed today",
        netBalance: "Net balance today",
        dayStreak: "Day streak",
        weeklyBurn: "Weekly calories burned",
        weeklyBurnText: "Your last seven days of output",
        logActivity: "Log activity",
        noActivityTitle: "No activity logged this week yet",
        noActivityText: "Log your first session and this chart will fill in automatically.",
        macroSplit: "Today’s macro split",
        macroSplitText: "Protein, carbs, and fats consumed today",
        noFoodTitle: "No food logged today yet",
        noFoodText: "Add a meal to see today’s protein, carbs, and fat split.",
        logFood: "Log food",
        recentActivity: "Recent activity",
        recentActivityText: "Latest sessions feeding your recovery plan",
        viewAll: "View all",
        noRecentTitle: "No recent activity yet",
        noRecentText: "Once you log a workout, it will appear here with calories and recovery details.",
        remindersTitle: "Recovery reminders",
        remindersText: "These alerts are generated automatically when a post-workout window expires without a logged meal.",
        remindersEmpty: "No pending reminders right now.",
        openActivity: "Open activity",
        dismissReminder: "Dismiss",
        unreadBadge: "unread",
        protein: "Protein",
        carbs: "Carbs",
        fat: "Fat",
      };

  if (loading || !summary) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <LoadingSkeleton className="h-32 rounded-[32px]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-36 rounded-3xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <LoadingSkeleton className="h-96 rounded-[32px]" />
          <LoadingSkeleton className="h-96 rounded-[32px]" />
        </div>
      </div>
    );
  }

  const today = summary.today || progress.at(-1) || {};
  const macroData = [
    { name: copy.protein, value: today.protein_g || 0, color: "#10B981" },
    { name: copy.carbs, value: today.carbs_g || 0, color: "#6366F1" },
    { name: copy.fat, value: today.fat_g || 0, color: "#F59E0B" },
  ];
  const hasWeeklyBurn = progress.some((item) => Number(item.calories_burned || 0) > 0);
  const hasMacroData = macroData.some((item) => Number(item.value || 0) > 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <section id="dashboard-notifications" className="glass-panel rounded-[32px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">{copy.sectionTag}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{copy.greeting}</h1>
          </div>
          <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-textMuted sm:w-auto">
            <CalendarDays className="h-4 w-4" />
            {new Intl.DateTimeFormat(locale, {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(new Date())}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{copy.remindersTitle}</h2>
            <p className="text-sm text-textMuted">{copy.remindersText}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300">
            <BellRing className="h-4 w-4" />
            {summary.unread_notifications_count} {copy.unreadBadge}
          </div>
        </div>
        <div className="grid gap-3">
          {notifications.length ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                      <BellRing className="h-3.5 w-3.5" />
                      {notification.title}
                    </div>
                    <p className="mt-3 text-lg font-semibold">{notification.activity_name || notification.title}</p>
                    <p className="mt-2 text-sm text-textMuted">{notification.message}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Link
                      to={notification.action_url}
                      className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-background"
                    >
                      {notification.action_label || copy.openActivity}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void dismissNotification(notification.id);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-textMuted"
                    >
                      <X className="h-4 w-4" />
                      {copy.dismissReminder}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-background/40 p-6 text-center">
              <p className="font-semibold">{copy.remindersEmpty}</p>
            </div>
          )}
        </div>
      </section>

      <WeeklyInsightCard insight={insight} loading={insightLoading} onRefresh={refreshInsight} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={copy.burnedToday} value={today.calories_burned || 0} icon={Flame} accent="primary" />
        <StatCard label={copy.consumedToday} value={today.calories_consumed || 0} icon={Salad} accent="secondary" />
        <StatCard label={copy.netBalance} value={today.net_balance || 0} icon={TrendingUp} accent="accent" />
        <StatCard label={copy.dayStreak} value={streak} icon={CalendarDays} accent="secondary" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <motion.div whileHover={{ scale: 1.01 }} className="glass-panel rounded-[32px] p-5 sm:p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{copy.weeklyBurn}</h2>
              <p className="text-sm text-textMuted">{copy.weeklyBurnText}</p>
            </div>
            <Link className="text-sm font-semibold text-primary" to="/activities/log">
              + {copy.logActivity}
            </Link>
          </div>
          <div className="h-72 sm:h-80">
            {hasWeeklyBurn ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progress}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatDateLabel(value)}
                    stroke="#94A3B8"
                    minTickGap={24}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip
                    contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }}
                  />
                  <Bar dataKey="calories_burned" fill="#10B981" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-background/40 px-6 text-center">
                <Flame className="h-10 w-10 text-primary" />
                <p className="mt-4 font-semibold">{copy.noActivityTitle}</p>
                <p className="mt-2 text-sm text-textMuted">{copy.noActivityText}</p>
                <Link className="mt-4 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-background" to="/activities/log">
                  {copy.logActivity}
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.01 }} className="glass-panel rounded-[32px] p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">{copy.macroSplit}</h2>
            <p className="text-sm text-textMuted">{copy.macroSplitText}</p>
          </div>
          <div className="h-64 sm:h-72">
            {hasMacroData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={macroData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={96} paddingAngle={6}>
                    {macroData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-background/40 px-6 text-center">
                <Salad className="h-10 w-10 text-secondary" />
                <p className="mt-4 font-semibold">{copy.noFoodTitle}</p>
                <p className="mt-2 text-sm text-textMuted">{copy.noFoodText}</p>
                <Link className="mt-4 rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-white" to="/nutrition/log">
                  {copy.logFood}
                </Link>
              </div>
            )}
          </div>
          <div className="grid gap-3">
            {macroData.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl bg-background/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-textMuted">{item.name}</span>
                </div>
                <span className="font-semibold">{Math.round(item.value)}g</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="glass-panel rounded-[32px] p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{copy.recentActivity}</h2>
            <p className="text-sm text-textMuted">{copy.recentActivityText}</p>
          </div>
          <Link className="text-sm font-semibold text-primary" to="/activities/logs">
            {copy.viewAll}
          </Link>
        </div>
        <div className="grid gap-3">
          {summary.recent_activities.length ? (
            summary.recent_activities.map((item) => (
              <Link
                key={item.id}
                to={`/activities/logs/${item.id}`}
                className="rounded-3xl border border-white/10 bg-background/50 p-4 transition hover:border-primary/40"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{item.activity}</p>
                    <p className="text-sm capitalize text-textMuted">
                      {item.category} • {item.duration_minutes} minutes
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold text-primary">{Math.round(item.calories_burned)} kcal</p>
                    <p className="text-sm text-textMuted">{formatDateLabel(item.logged_at, { weekday: "short" })}</p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-background/40 p-6 text-center">
              <p className="font-semibold">{copy.noRecentTitle}</p>
              <p className="mt-2 text-sm text-textMuted">{copy.noRecentText}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
