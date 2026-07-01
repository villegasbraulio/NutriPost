import { motion } from "framer-motion";

import { AnimatedNumber } from "./AnimatedNumber";
import { hoverLift } from "../utils/animations";

export function StatCard({ label, value, icon: Icon, accent = "primary", suffix = "", decimals = 0 }) {
  const accentMap = {
    primary: "from-primary/30 via-primary/12 to-primary/0 text-primary",
    secondary: "from-secondary/30 via-secondary/12 to-secondary/0 text-secondary",
    accent: "from-accent/30 via-accent/12 to-accent/0 text-accent",
  };

  return (
    <motion.div
      whileHover={hoverLift}
      className="glass-panel rounded-3xl p-5 shadow-soft"
    >
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accentMap[accent]}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-textMuted">{label}</p>
          <p className="font-display mt-3 break-words text-3xl font-bold tracking-tight text-textPrimary sm:text-[2.1rem]">
            <AnimatedNumber value={value} suffix={suffix} decimals={decimals} />
          </p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accentMap[accent]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
}
