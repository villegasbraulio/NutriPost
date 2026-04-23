import { motion } from "framer-motion";

import { AnimatedNumber } from "./AnimatedNumber";

export function StatCard({ label, value, icon: Icon, accent = "primary", suffix = "", decimals = 0 }) {
  const accentMap = {
    primary: "from-primary/30 to-primary/5 text-primary",
    secondary: "from-secondary/30 to-secondary/5 text-secondary",
    accent: "from-accent/30 to-accent/5 text-accent",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="glass-panel rounded-3xl p-5 shadow-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-textMuted">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-textPrimary sm:text-3xl">
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
