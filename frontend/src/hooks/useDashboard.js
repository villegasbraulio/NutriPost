import { useCallback, useEffect, useState } from "react";

import { dispatchUnreadNotificationsCount } from "./useUnreadNotificationsCount";
import { dashboardService } from "../services/dashboardService";
import { getLocalDateString } from "../utils/date";

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
  unread_notifications_count: 0,
  recent_activities: [],
  today: {
    date: getLocalDateString(),
    calories_burned: 0,
    calories_consumed: 0,
    net_balance: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  },
};

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildEmptyWeeklyProgress() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      date: getLocalDateString(date),
      calories_burned: 0,
      calories_consumed: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      calories_goal: 0,
      protein_goal_g: 0,
      carbs_goal_g: 0,
      fat_goal_g: 0,
    };
  });
}

function normalizeProgress(payload) {
  const items = Array.isArray(payload?.weekly_progress) ? payload.weekly_progress : [];
  if (!items.length) {
    return buildEmptyWeeklyProgress();
  }

  return items.map((item) => ({
    date: item.date,
    calories_burned: toNumber(item.calories_burned),
    calories_consumed: toNumber(item.calories_consumed),
    protein_g: toNumber(item.protein_g),
    carbs_g: toNumber(item.carbs_g),
    fat_g: toNumber(item.fat_g),
    calories_goal: toNumber(item.calories_goal),
    protein_goal_g: toNumber(item.protein_goal_g),
    carbs_goal_g: toNumber(item.carbs_goal_g),
    fat_goal_g: toNumber(item.fat_goal_g),
  }));
}

function normalizeSummary(summary, period) {
  const source = summary || { ...EMPTY_SUMMARY, period };
  return {
    ...EMPTY_SUMMARY,
    ...source,
    period,
    calories_burned: toNumber(source.calories_burned),
    calories_consumed: toNumber(source.calories_consumed),
    net_balance: toNumber(source.net_balance),
    macros: {
      protein_g: toNumber(source.macros?.protein_g),
      carbs_g: toNumber(source.macros?.carbs_g),
      fat_g: toNumber(source.macros?.fat_g),
    },
    today: {
      ...EMPTY_SUMMARY.today,
      ...(source.today || {}),
      calories_burned: toNumber(source.today?.calories_burned),
      calories_consumed: toNumber(source.today?.calories_consumed),
      net_balance: toNumber(source.today?.net_balance),
      protein_g: toNumber(source.today?.protein_g),
      carbs_g: toNumber(source.today?.carbs_g),
      fat_g: toNumber(source.today?.fat_g),
    },
    unread_notifications_count: toNumber(source.unread_notifications_count),
    recent_activities: Array.isArray(source.recent_activities) ? source.recent_activities : [],
  };
}

function normalizeNotifications(payload) {
  const items = Array.isArray(payload?.results) ? payload.results : [];
  return items.map((item) => ({
    ...item,
    activity_log_id: toNumber(item.activity_log_id),
    is_read: Boolean(item.is_read),
  }));
}

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
  const [insight, setInsight] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [insightLoading, setInsightLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadInsight = useCallback(async () => {
    setInsightLoading(true);
    try {
      const nextInsight = await withRetry(() => dashboardService.getInsight());
      setInsight(nextInsight);
    } catch {
      setInsight(null);
    } finally {
      setInsightLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const payload = await withRetry(() => dashboardService.getNotifications({ unread: true }));
      const items = normalizeNotifications(payload);
      setNotifications(items);
      dispatchUnreadNotificationsCount(items.length);
    } catch {
      setNotifications([]);
      dispatchUnreadNotificationsCount(0);
    }
  }, []);

  const dismissNotification = useCallback(async (notificationId) => {
    await dashboardService.dismissNotification(notificationId);
    let nextCount = 0;
    setNotifications((current) => {
      const nextItems = current.filter((item) => item.id !== notificationId);
      nextCount = nextItems.length;
      return nextItems;
    });
    setSummary((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        unread_notifications_count: Math.max((current.unread_notifications_count || 0) - 1, 0),
      };
    });
    dispatchUnreadNotificationsCount(nextCount);
  }, []);

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

        setSummary(normalizeSummary(summaryResult.status === "fulfilled" ? summaryResult.value : null, period));
        setStreak(
          streakResult.status === "fulfilled" ? streakResult.value.streak || 0 : 0,
        );
        setProgress(
          progressResult.status === "fulfilled" ? normalizeProgress(progressResult.value) : buildEmptyWeeklyProgress(),
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    loadInsight();
    loadNotifications();
    return () => {
      active = false;
    };
  }, [loadInsight, loadNotifications, period]);

  return {
    summary,
    streak,
    progress,
    insight,
    notifications,
    insightLoading,
    loading,
    refreshInsight: loadInsight,
    refreshNotifications: loadNotifications,
    dismissNotification,
  };
}
