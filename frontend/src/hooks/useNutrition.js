import { useEffect, useState } from "react";

import { nutritionService } from "../services/nutritionService";

export function useNutrition(date) {
  const [foodLogs, setFoodLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const payload = await nutritionService.getFoodLogs(date ? { date, page_size: 100 } : { page_size: 100 });
        if (active) {
          setFoodLogs(payload.results || []);
        }
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
  }, [date]);

  return { foodLogs, loading, setFoodLogs };
}
