import { useCallback, useEffect, useState } from "react";

import { dashboardService } from "../services/dashboardService";

const NOTIFICATIONS_CHANGED_EVENT = "dashboard-notifications:changed";

function toCount(payload) {
  const value = Number(payload?.count ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function dispatchUnreadNotificationsCount(count) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, {
      detail: { count },
    }),
  );
}

export function useUnreadNotificationsCount() {
  const [count, setCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const payload = await dashboardService.getNotifications({ unread: true });
      const nextCount = toCount(payload);
      setCount(nextCount);
      dispatchUnreadNotificationsCount(nextCount);
      return nextCount;
    } catch {
      return 0;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const syncFromServer = async () => {
      const nextCount = await refreshCount();
      if (!active) {
        return;
      }
      setCount(nextCount);
    };

    const handleChange = (event) => {
      const nextCount = Number(event.detail?.count);
      if (Number.isFinite(nextCount)) {
        setCount(nextCount);
      }
    };

    syncFromServer();
    const intervalId = window.setInterval(syncFromServer, 60_000);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChange);
    };
  }, [refreshCount]);

  return { count, refreshCount };
}
