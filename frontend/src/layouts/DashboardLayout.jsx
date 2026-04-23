import { motion } from "framer-motion";
import { Bot, ClipboardList, Dumbbell, Home, Salad, UserCircle2 } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";

export function DashboardLayout() {
  const { user } = useAuth();
  const { isSpanish } = useLanguage();
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
      }
    : {
        subtitle: `Recover smarter${user?.first_name ? `, ${user.first_name}` : ""}`,
        logActivity: "Log Activity",
        logFood: "Log Food",
      };

  return (
    <div className="min-h-screen bg-hero-radial">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">NutriPost</p>
            <p className="text-sm text-textMuted">{copy.subtitle}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <NavLink
              to="/activities/log"
              className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary/90 sm:w-auto"
            >
              + {copy.logActivity}
            </NavLink>
            <NavLink
              to="/nutrition/log"
              className="flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-2 text-sm text-textMuted transition hover:border-white/20 hover:text-textPrimary sm:w-auto"
            >
              + {copy.logFood}
            </NavLink>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-w-0 max-w-7xl flex-col gap-5 px-3 py-4 sm:px-6 sm:py-6 lg:flex-row">
        <nav className="glass-panel flex max-w-full gap-2 overflow-x-auto rounded-3xl p-2 pb-3 lg:w-64 lg:shrink-0 lg:flex-col lg:self-start lg:pb-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm transition lg:shrink ${
                    isActive
                      ? "bg-primary text-background"
                      : "text-textMuted hover:bg-white/5 hover:text-textPrimary"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0 flex-1"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
