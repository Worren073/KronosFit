import { useEffect, useState } from "react";

export function useMinimumSkeleton(ms = 500) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);

  return ready;
}
