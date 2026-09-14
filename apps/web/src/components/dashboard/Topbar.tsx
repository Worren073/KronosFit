"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightStartOnRectangleIcon, CloudArrowDownIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { logout } from "@/lib/api";
import { useDashboardStore } from "@/stores/dashboardStore";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function Topbar() {
  const router = useRouter();
  const resetStore = useDashboardStore((state) => state.reset);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
    );
    setIsIOS(/iP(hone|od|ad)/.test(navigator.userAgent));

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    resetStore();
    router.push("/login");
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  return (
    <header
      className="sticky top-0 z-40 glass border-b border-amber-500/10 px-4 md:px-8 flex items-center justify-between"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)", paddingBottom: "1rem" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-amber-400 tracking-tight">KronosFit</span>
      </div>
      <div className="flex items-center gap-2">
        {!isStandalone && installPrompt && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-semibold hover:bg-amber-500/30 transition-colors"
          >
            <CloudArrowDownIcon className="w-4 h-4" />
            <span className="hidden md:inline">Instalar app</span>
          </button>
        )}
        {!isStandalone && isIOS && !installPrompt && (
          <>
            <button
              onClick={() => setShowIosHint((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-amber-500/10 transition-colors"
            >
              <InformationCircleIcon className="w-5 h-5" />
              <span className="hidden md:inline text-sm font-medium">Instalar app</span>
            </button>
            {showIosHint && (
              <div className="absolute top-[calc(env(safe-area-inset-top)+4.5rem)] right-4 glass rounded-2xl p-4 max-w-xs text-xs text-zinc-300 shadow-2xl shadow-black/50 z-50">
                Abrí Compartir <span className="text-amber-400">(icono cuadrado con flecha)</span> y elegí{" "}
                <span className="text-amber-400">Añadir a pantalla de inicio</span>.
              </div>
            )}
          </>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-amber-500/10 transition-colors"
        >
          <span className="hidden md:inline text-sm font-medium">Salir</span>
          <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}