import { motion } from "framer-motion";
import { AlarmClock, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

function calculateRemainingMs(loggedAt, timingWindowMinutes, timingExpiresAt) {
  const loggedTime = new Date(loggedAt).getTime();
  const expiresAt = timingExpiresAt
    ? new Date(timingExpiresAt).getTime()
    : loggedTime + timingWindowMinutes * 60 * 1000;
  return Math.max(expiresAt - Date.now(), 0);
}

function getTimingTone(remainingMs) {
  const remainingMinutes = remainingMs / 60000;

  if (remainingMs <= 0) {
    return {
      ring: "#94A3B8",
      text: "text-textMuted",
      badge: "bg-white/5 text-textMuted",
      label: "Window passed",
      message: "Window passed — still eat your recovery meal!",
    };
  }

  if (remainingMinutes > 30) {
    return {
      ring: "#10B981",
      text: "text-primary",
      badge: "bg-primary/10 text-primary",
      label: "Recovery window open",
      message: "Great timing for protein and carbs.",
    };
  }

  if (remainingMinutes > 10) {
    return {
      ring: "#F59E0B",
      text: "text-accent",
      badge: "bg-accent/10 text-accent",
      label: "Recovery window narrowing",
      message: "Aim to eat soon while glycogen replacement is still timely.",
    };
  }

  return {
    ring: "#F43F5E",
    text: "text-rose-400",
    badge: "bg-rose-500/10 text-rose-300",
    label: "Last minutes",
    message: "A recovery meal now is still worth it.",
  };
}

export function RecoveryWindowTimer({
  loggedAt,
  timingWindowMinutes = 60,
  timingExpiresAt,
}) {
  const [remainingMs, setRemainingMs] = useState(() =>
    calculateRemainingMs(loggedAt, timingWindowMinutes, timingExpiresAt),
  );

  useEffect(() => {
    setRemainingMs(calculateRemainingMs(loggedAt, timingWindowMinutes, timingExpiresAt));

    const intervalId = window.setInterval(() => {
      setRemainingMs(calculateRemainingMs(loggedAt, timingWindowMinutes, timingExpiresAt));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [loggedAt, timingWindowMinutes, timingExpiresAt]);

  const totalMs = timingWindowMinutes * 60 * 1000;
  const remainingRatio = totalMs ? remainingMs / totalMs : 0;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - remainingRatio);
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const tone = getTimingTone(remainingMs);

  return (
    <div className="glass-panel rounded-[32px] p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex justify-center">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <svg className="h-40 w-40 -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="rgba(148, 163, 184, 0.18)"
                strokeWidth="14"
              />
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={tone.ring}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.6 }}
              />
            </svg>
            <div className="absolute text-center">
              <p className="text-4xl font-bold tracking-tight">
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-textMuted">
                Remaining
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${tone.badge}`}>
            {remainingMs > 0 ? (
              <AlarmClock className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {tone.label}
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Anabolic window countdown</h2>
            <p className="mt-2 text-textMuted">
              Recovery nutrition still matters even if you miss the first hour. This timer is a
              supportive prompt, not a hard cutoff.
            </p>
          </div>
          <div className={`rounded-3xl border border-white/10 bg-background/50 p-4 ${tone.text}`}>
            <p className="font-semibold">{tone.message}</p>
            <p className="mt-2 text-sm text-textMuted">
              Logged at {new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                minute: "2-digit",
                month: "short",
                day: "numeric",
              }).format(new Date(loggedAt))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
