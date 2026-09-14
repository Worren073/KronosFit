"use client";

import { useEffect, useRef, useState } from "react";

export function PwaRegister() {
  const [update, setUpdate] = useState(false);
  const updateRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const onControllerChange = () => {
      window.location.reload();
    };

    const onStateChange = () => {
      if (
        registration?.installing?.state === "installed" &&
        navigator.serviceWorker.controller &&
        registration.waiting &&
        !updateRef.current
      ) {
        updateRef.current = true;
        setUpdate(true);
      }
    };

    const onUpdateFound = () => {
      registration?.installing?.addEventListener("statechange", onStateChange);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((reg) => {
      registration = reg;
      reg.addEventListener("updatefound", onUpdateFound);
      intervalId = setInterval(
        () => {
          if (navigator.onLine) reg.update();
        },
        60 * 60 * 1000
      );
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      registration?.removeEventListener("updatefound", onUpdateFound);
      registration?.installing?.removeEventListener("statechange", onStateChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const applyUpdate = () => {
    navigator.serviceWorker.ready.then((registration) => {
      registration.waiting?.postMessage("SKIP_WAITING");
    });
  };

  if (!update) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl shadow-black/50">
      <p className="text-sm text-zinc-200">Nueva versión disponible</p>
      <button
        onClick={applyUpdate}
        className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs hover:bg-amber-500/30 transition-colors"
      >
        Actualizar
      </button>
    </div>
  );
}