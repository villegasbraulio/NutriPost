import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Bot, ClipboardList, Dumbbell, Home, Salad, UserCircle2 } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useUnreadNotificationsCount } from "../hooks/useUnreadNotificationsCount";
import { pageTransition, softSpring } from "../utils/animations";

export function DashboardLayout() {
  const { user } = useAuth();
  const { isSpanish } = useLanguage();
  const { count: unreadNotificationsCount } = useUnreadNotificationsCount();
  const location = useLocation();
  const navigation = [
    { to: "/dashboard", label: isSpanish ? "Inicio" : "Dashboard", icon: Home },
    { to: "/assistant", label: "NutriCoach", icon: Bot },
    { to: "/activities/logs", label: isSpanish ? "Actividades" : "Activities", icon: Dumbbell },
    { to: "/routines", label: isSpanish ? "Rutinas" : "Routines", icon: ClipboardList },
    { to: "/nutrition/today", label: isSpanish ? "Nutricion" : "Nutrition", icon: Salad },
    { to: "/profile", label: isSpanish ? "Perfil" : "Profile", icon: UserCircle2 },
  ];
  const copy = isSpanish
    ? {
        subtitle: `Recuperate mejor${user?.first_name ? `, ${user.first_name}` : ""}`,
        logActivity: "Cargar actividad",
        logFood: "Cargar comida",
        notifications: "Notificaciones",
        unreadNotifications: "sin leer",
        focus: "Tu centro de entrenamiento y recuperacion",
      }
    : {
        subtitle: `Recover smarter${user?.first_name ? `, ${user.first_name}` : ""}`,
        logActivity: "Log Activity",
        logFood: "Log Food",
        notifications: "Notifications",
        unreadNotifications: "unread",
        focus: "Your training and recovery command center",
      };

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero-radial">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-mesh opacity-80" />
      <motion.div
        animate={{ x: [0, 18, 0], y: [0, -18, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-12 top-24 h-48 w-48 rounded-full bg-primary/12 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -12, 0], y: [0, 24, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute right-0 top-40 h-64 w-64 rounded-full bg-secondary/12 blur-3xl"
      />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">NutriPost</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-sm text-textMuted">{copy.subtitle}</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-textMuted">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
                {copy.focus}
              </span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <NavLink
              to="/dashboard#dashboard-notifications"
              className="relative flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-textMuted hover:border-white/20 hover:text-textPrimary sm:w-auto"
            >
              <BellRing className="h-4 w-4" />
              {copy.notifications}
              {unreadNotificationsCount > 0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-background">
                  {unreadNotificationsCount}
                </span>
              ) : null}
            </NavLink>
            <NavLink
              to="/activities/log"
              className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-background shadow-glow hover:bg-primary/90 sm:w-auto"
            >
              + {copy.logActivity}
            </NavLink>
            <NavLink
              to="/nutrition/log"
              className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-textMuted hover:border-white/20 hover:text-textPrimary sm:w-auto"
            >
              + {copy.logFood}
            </NavLink>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-w-0 max-w-7xl flex-col gap-5 px-3 py-4 sm:px-6 sm:py-6 lg:flex-row">
        <nav className="glass-panel noise-mask flex max-w-full gap-2 overflow-x-auto rounded-[30px] p-2 pb-3 lg:w-72 lg:shrink-0 lg:flex-col lg:self-start lg:pb-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isDashboardEntry = item.to === "/dashboard";
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="block shrink-0 lg:w-full"
              >
                {({ isActive }) => (
                  <motion.div
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.985 }}
                    transition={softSpring}
                    className={`relative flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm lg:w-full ${
                      isActive ? "text-background" : "text-textMuted hover:text-textPrimary"
                    }`}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="dashboard-nav-pill"
                        transition={softSpring}
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-emerald-400 to-secondary shadow-glow"
                      />
                    ) : (
                      <span className="absolute inset-0 rounded-2xl bg-white/0 transition hover:bg-white/5" />
                    )}
                    <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="relative z-10 font-medium">{item.label}</span>
                    {isDashboardEntry && unreadNotificationsCount > 0 ? (
                      <span
                        className={`relative z-10 ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          isActive ? "bg-background/90 text-primary" : "bg-amber-400 text-background"
                        }`}
                      >
                        {unreadNotificationsCount}
                      </span>
                    ) : null}
                  </motion.div>
                )}
              </NavLink>
            );
          })}
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.main key={location.pathname} {...pageTransition} className="min-w-0 flex-1">
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
