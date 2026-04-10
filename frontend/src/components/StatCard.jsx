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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-textMuted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-textPrimary">
            <AnimatedNumber value={value} suffix={suffix} decimals={decimals} />
          </p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accentMap[accent]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
}
