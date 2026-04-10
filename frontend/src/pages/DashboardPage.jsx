import { motion } from "framer-motion";
import { CalendarDays, Flame, Salad, TrendingUp } from "lucide-react";
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
import { useAuth } from "../hooks/useAuth";
import { useDashboard } from "../hooks/useDashboard";
import { formatDateLabel } from "../utils/date";

export function DashboardPage() {
  const { user } = useAuth();
  const { summary, streak, progress, loading } = useDashboard("7d");

  if (loading || !summary) {
    return (
      <div className="space-y-6">
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

  const today = progress.at(-1) || {};
  const macroData = [
    { name: "Protein", value: today.protein_g || 0, color: "#10B981" },
    { name: "Carbs", value: today.carbs_g || 0, color: "#6366F1" },
    { name: "Fat", value: today.fat_g || 0, color: "#F59E0B" },
  ];

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Dashboard</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              {user?.first_name ? `Hi ${user.first_name},` : "Welcome back,"} here’s today’s recovery view.
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-textMuted">
            <CalendarDays className="h-4 w-4" />
            {new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(new Date())}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Calories burned today" value={today.calories_burned || 0} icon={Flame} accent="primary" />
        <StatCard label="Calories consumed today" value={today.calories_consumed || 0} icon={Salad} accent="secondary" />
        <StatCard label="Net balance" value={(today.calories_burned || 0) - (today.calories_consumed || 0)} icon={TrendingUp} accent="accent" />
        <StatCard label="Day streak" value={streak} icon={CalendarDays} accent="secondary" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <motion.div whileHover={{ scale: 1.01 }} className="glass-panel rounded-[32px] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Weekly calories burned</h2>
              <p className="text-sm text-textMuted">Your last seven days of output</p>
            </div>
            <Link className="text-sm font-semibold text-primary" to="/activities/log">
              + Log activity
            </Link>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progress}>
                <XAxis dataKey="date" tickFormatter={(value) => formatDateLabel(value)} stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }}
                />
                <Bar dataKey="calories_burned" fill="#10B981" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.01 }} className="glass-panel rounded-[32px] p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Today’s macro split</h2>
            <p className="text-sm text-textMuted">Protein, carbs, and fats consumed</p>
          </div>
          <div className="h-72">
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

      <section className="glass-panel rounded-[32px] p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recent activity</h2>
            <p className="text-sm text-textMuted">Latest sessions feeding your recovery plan</p>
          </div>
          <Link className="text-sm font-semibold text-primary" to="/activities/logs">
            View all
          </Link>
        </div>
        <div className="grid gap-3">
          {summary.recent_activities.map((item) => (
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
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{Math.round(item.calories_burned)} kcal</p>
                  <p className="text-sm text-textMuted">{formatDateLabel(item.logged_at, { weekday: "short" })}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
