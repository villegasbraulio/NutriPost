import { useEffect, useState } from "react";

import { activityService } from "../services/activityService";

export function useActivities(filters = {}) {
  const [activityTypes, setActivityTypes] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const parsedFilters = JSON.parse(filtersKey);
        const [types, logs] = await Promise.all([
          activityService.getActivityTypes(),
          activityService.getLogs(parsedFilters),
        ]);
        if (!active) {
          return;
        }
        setActivityTypes(types);
        setActivityLogs(logs.results || []);
        setPagination(logs);
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
  }, [filtersKey]);

  return { activityTypes, activityLogs, pagination, loading };
}
