"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  getAdminStats,
  getAdminUsers,
  getAdminGyms,
  ApiError,
} from "@/lib/api";
import { FadeIn } from "@/components/ui/FadeIn";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";
import { useDashboardStore } from "@/stores/dashboardStore";
import type { AdminStats, AdminUser, AdminGym } from "@/lib/types";

interface AlertItem {
  text: string;
  level: "warning" | "info";
}

export default function SuperAdminPage() {
  const ready = useMinimumSkeleton(500);
  const router = useRouter();
  const { user, userInitialized, fetchUser } = useDashboardStore();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!userInitialized) {
      fetchUser().catch(() => {});
    }
  }, [userInitialized, fetchUser]);

  useEffect(() => {
    if (!userInitialized || !user) return;
    Promise.all([getAdminStats(), getAdminUsers(), getAdminGyms()])
      .then(([s, users, gyms]) => {
        setStats(s);
        setAlerts(buildAlerts(s, users, gyms));
        setInitialized(true);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/dashboard");
        } else {
          setError(err instanceof Error ? err.message : "No se pudo cargar el portal");
        }
      });
  }, [userInitialized, user, router]);

  if (!ready || !userInitialized) {
    return <SuperAdminSkeleton />;
  }
  if (!user || !user.is_superuser || !initialized) {
    return <SuperAdminSkeleton />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShieldCheckIcon className="w-8 h-8 text-amber-400" />
          Panel de administración
        </h1>
      </FadeIn>

      {error && (
        <FadeIn className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </FadeIn>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Gimnasios", value: stats?.gyms ?? "—" },
          { label: "Usuarios", value: stats?.users ?? "—" },
          { label: "Membresías activas", value: stats?.memberships ?? "—" },
          { label: "Planes", value: stats?.plans ?? "—" },
          { label: "Mensualidades activas", value: stats?.active_subscriptions ?? "—" },
          { label: "Vencidas", value: stats?.expired_subscriptions ?? "—" },
          { label: "Asistencias hoy", value: stats?.today_attendance ?? "—" },
          { label: "Eventos", value: stats?.events ?? "—" },
        ].map((stat, i) => (
          <FadeIn key={stat.label} delay={i * 0.04} className="glass rounded-2xl p-4">
            <p className="text-3xl font-black text-white">{stat.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{stat.label}</p>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.1} className="glass rounded-3xl p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          <ExclamationTriangleIcon className="w-6 h-6 text-amber-400" />
          Avisos
        </h2>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 rounded-xl p-4">
            <CheckCircleIcon className="w-5 h-5" />
            <p className="text-sm">Todo en orden. No hay avisos pendientes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 text-sm ${
                  alert.level === "warning"
                    ? "bg-red-500/10 text-red-300"
                    : "bg-amber-500/10 text-amber-300"
                }`}
              >
                {alert.text}
              </div>
            ))}
          </div>
        )}
      </FadeIn>
    </div>
  );
}

function buildAlerts(stats: AdminStats, users: AdminUser[], gyms: AdminGym[]): AlertItem[] {
  const alerts: AlertItem[] = [];

  if ((stats.expired_subscriptions ?? 0) > 0) {
    alerts.push({
      text: `${stats.expired_subscriptions} suscripciones vencidas necesitan atención.`,
      level: "warning",
    });
  }

  const inactiveGyms = gyms.filter((g) => !g.is_active).length;
  if (inactiveGyms > 0) {
    alerts.push({
      text: `${inactiveGyms} gimnasio${inactiveGyms === 1 ? "" : "s"} desactivado${inactiveGyms === 1 ? "" : "s"}.`,
      level: "info",
    });
  }

  const inactiveUsers = users.filter((u) => !u.is_active && !u.is_superuser).length;
  if (inactiveUsers > 0) {
    alerts.push({
      text: `${inactiveUsers} usuario${inactiveUsers === 1 ? "" : "s"} desactivado${inactiveUsers === 1 ? "" : "s"}.`,
      level: "info",
    });
  }

  return alerts;
}

function SuperAdminSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}