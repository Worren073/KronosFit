"use client";

import { useCallback, useEffect, useState } from "react";
import { getActiveWorkout } from "@/lib/api";
import type { Workout } from "@/lib/types";

export function useActiveWorkout() {
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    return getActiveWorkout()
      .then(setActiveWorkout)
      .catch(() => setActiveWorkout(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activeWorkout, refresh, loading };
}
