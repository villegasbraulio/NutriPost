import { useEffect, useState } from "react";

import { dashboardService } from "../services/dashboardService";

const EMPTY_SUMMARY = {
  period: "7d",
  calories_burned: 0,
  calories_consumed: 0,
  net_balance: 0,
  macros: {
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  },
  today_goal: {
    calories_goal: 0,
    protein_goal_g: 0,
    carbs_goal_g: 0,
    fat_goal_g: 0,
  },
  recent_activities: [],
};

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function withRetry(requestFn, attempts = 2) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await delay(150);
      }
    }
  }

  throw lastError;
}

export function useDashboard(period = "7d") {
  const [summary, setSummary] = useState(null);
  const [streak, setStreak] = useState(0);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [summaryResult, streakResult, progressResult] = await Promise.allSettled([
          withRetry(() => dashboardService.getSummary(period)),
          withRetry(() => dashboardService.getStreak()),
          withRetry(() => dashboardService.getProgress()),
        ]);

        if (!active) {
          return;
        }

        setSummary(summaryResult.status === "fulfilled" ? summaryResult.value : { ...EMPTY_SUMMARY, period });
        setStreak(
          streakResult.status === "fulfilled" ? streakResult.value.streak || 0 : 0,
        );
        setProgress(
          progressResult.status === "fulfilled" ? progressResult.value.weekly_progress || [] : [],
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [period]);

  return { summary, streak, progress, loading };
}
