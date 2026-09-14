"use client";

import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/stores/dashboardStore";

export default function DashboardNotFound() {
  const router = useRouter();
  const { user } = useDashboardStore();

  const home = user?.is_superuser
    ? "/dashboard/superadmin"
    : user?.role === "gym_admin"
      ? "/dashboard/gyms"
      : "/dashboard";

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <p className="text-7xl font-black text-white/10">404</p>
      <h1 className="text-2xl font-bold text-white mt-4">Página no encontrada</h1>
      <p className="text-zinc-500 text-sm mt-2">Esta página no existe o no tenés acceso a ella.</p>
      <button
        onClick={() => router.push(home)}
        className="mt-6 px-6 py-3 rounded-2xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
      >
        Volver al inicio
      </button>
    </div>
  );
}