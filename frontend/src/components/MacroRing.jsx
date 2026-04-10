import { motion } from "framer-motion";

export function MacroRing({ label, value, goal, color }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((value / Math.max(goal, 1)) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel flex flex-col items-center rounded-3xl p-4"
    >
      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg className="h-32 w-32 -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="12"
          />
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.7 }}
            strokeDasharray={circumference}
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-2xl font-bold">{Math.round(value)}g</p>
          <p className="text-xs text-textMuted">Goal {Math.round(goal)}g</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-textMuted">{label}</p>
    </motion.div>
  );
}
