"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import type { GymAdminDashboard } from "@/lib/types";

export default function GymStats({ dashboard }: { dashboard: GymAdminDashboard }) {
  const stats = [
    { label: "Mensualidades activas", value: dashboard.active_subscriptions },
    { label: "Vencidas", value: dashboard.expired_subscriptions },
    { label: "Asistencias hoy", value: dashboard.today_attendance },
    { label: "Nuevos del mes", value: dashboard.new_members_month },
    { label: "Atletas", value: dashboard.athletes_count },
    { label: "Entrenadores", value: dashboard.trainers_count },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, i) => (
        <FadeIn key={stat.label} delay={i * 0.05} className="glass rounded-2xl p-4">
          <p className="text-3xl font-black text-white">{stat.value}</p>
          <p className="text-xs text-zinc-400 mt-1">{stat.label}</p>
        </FadeIn>
      ))}
    </div>
  );
}