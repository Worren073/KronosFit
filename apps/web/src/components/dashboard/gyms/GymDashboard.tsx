"use client";

import { useEffect, useState } from "react";
import { BuildingStorefrontIcon } from "@heroicons/react/24/outline";
import { getGymAdminDashboard } from "@/lib/api";
import { FadeIn } from "@/components/ui/FadeIn";
import { Skeleton } from "@/components/ui/Skeleton";
import GymStats from "./GymStats";
import type { Gym, GymAdminDashboard } from "@/lib/types";

export default function GymDashboard({ gym }: { gym: Gym }) {
  const [dashboard, setDashboard] = useState<GymAdminDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getGymAdminDashboard(gym.slug)
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el panel"));
  }, [gym.slug]);

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <FadeIn className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </FadeIn>
      )}

      <GymStats dashboard={dashboard} />

      <FadeIn delay={0.1} className="glass rounded-3xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <BuildingStorefrontIcon className="w-6 h-6 text-amber-400" />
              {gym.name}
            </h2>
            {gym.address && <p className="text-zinc-400 text-sm mt-2">{gym.address}</p>}
            {gym.phone && <p className="text-zinc-500 text-sm">{gym.phone}</p>}
            <div className="mt-4 inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-900/60 border border-zinc-700">
              <span className="text-xs text-zinc-500">Código de acceso</span>
              <span className="font-mono font-bold text-amber-400">{gym.slug}</span>
            </div>
            <p className="text-xs text-zinc-600 mt-3">
              Compartí este código o el QR con tus atletas para que se unan al gimnasio.
            </p>
          </div>
          {gym.qr_url && (
            <div className="bg-white rounded-2xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gym.qr_url} alt={`Código QR de ${gym.name}`} className="w-44 h-44 object-contain" />
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}