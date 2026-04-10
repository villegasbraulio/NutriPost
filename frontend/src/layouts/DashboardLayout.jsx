import { motion } from "framer-motion";
import { Home, Salad, UserCircle2 } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/activities/logs", label: "Activities", icon: Home },
  { to: "/nutrition/today", label: "Nutrition", icon: Salad },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
];

export function DashboardLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-hero-radial">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">NutriPost</p>
            <p className="text-sm text-textMuted">
              Recover smarter{user?.first_name ? `, ${user.first_name}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NavLink
              to="/activities/log"
              className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
            >
              + Log Activity
            </NavLink>
            <button
              onClick={logout}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-textMuted transition hover:border-white/20 hover:text-textPrimary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <nav className="glass-panel flex gap-2 overflow-x-auto rounded-3xl p-2 lg:w-64 lg:flex-col lg:self-start">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
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
          className="flex-1"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
