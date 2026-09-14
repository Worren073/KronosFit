"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheckIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  getAdminStats,
  getAdminUsers,
  updateAdminUser,
  getAdminGyms,
  updateAdminGym,
  ApiError,
} from "@/lib/api";
import { FadeIn } from "@/components/ui/FadeIn";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";
import { useDashboardStore } from "@/stores/dashboardStore";
import type { AdminStats, AdminUser, AdminGym } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  user: "Usuario",
  trainer: "Entrenador",
  gym_admin: "Admin de gym",
  admin: "Admin",
};

export default function SuperAdminPage() {
  const ready = useMinimumSkeleton(500);
  const router = useRouter();
  const { user, userInitialized, fetchUser } = useDashboardStore();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [gyms, setGyms] = useState<AdminGym[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [initialized, setInitialized] = useState(false);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 4000);
  }, []);

  useEffect(() => {
    if (!userInitialized) {
      fetchUser().catch(() => {});
    }
  }, [userInitialized, fetchUser]);

  useEffect(() => {
    if (!userInitialized || !user) return;
    Promise.all([getAdminStats(), getAdminUsers(), getAdminGyms()])
      .then(([s, u, g]) => {
        setStats(s);
        setUsers(u);
        setGyms(g);
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

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await getAdminUsers({
        role: roleFilter || undefined,
        search: search || undefined,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios");
    }
  }, [roleFilter, search]);

  useEffect(() => {
    if (user?.is_superuser) loadUsers();
  }, [loadUsers, user]);

  const toggleUserActive = async (target: AdminUser) => {
    if (target.is_superuser) return;
    try {
      const updated = await updateAdminUser(target.id, { is_active: !target.is_active });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      notify(`Usuario ${target.username} ${updated.is_active ? "activado" : "desactivado"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el usuario");
    }
  };

  const setUserRole = async (target: AdminUser, role: string) => {
    try {
      const updated = role === "gym_admin"
        ? await updateAdminUser(target.id, { role, managed_gym: gyms[0]?.id ?? null })
        : await updateAdminUser(target.id, { role });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      notify(`Rol de ${target.username} actualizado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el rol");
    }
  };

  const toggleGymActive = async (gym: AdminGym) => {
    try {
      const updated = await updateAdminGym(gym.slug, { is_active: !gym.is_active });
      setGyms((prev) => prev.map((g) => (g.slug === updated.slug ? updated : g)));
      notify(`Gimnasio ${updated.name} ${updated.is_active ? "reactivado" : "desactivado"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el gimnasio");
    }
  };

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
          Portal de administración
        </h1>
      </FadeIn>

      {error && (
        <FadeIn className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </FadeIn>
      )}
      {toast && (
        <FadeIn className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {toast}
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserGroupIcon className="w-6 h-6 text-amber-400" />
            Usuarios
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="input !pl-9 !py-2 text-sm"
                placeholder="Buscar usuario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="input !py-2 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Todos los roles</option>
              {Object.entries(ROLE_LABELS).filter(([key]) => key !== "admin").map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${u.is_active ? "bg-green-500" : "bg-red-500"}`} />
                <div>
                  <p className="font-semibold text-white">
                    {u.username}
                    {u.is_superuser && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">
                        Superadmin
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  className="input !py-1.5 !w-auto text-sm"
                  value={u.role}
                  disabled={u.is_superuser}
                  onChange={(e) => setUserRole(u, e.target.value)}
                >
                  {Object.entries(ROLE_LABELS).filter(([key]) => key !== "admin").map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                {u.role === "gym_admin" && (
                  <span className="text-xs text-zinc-400">
                    {gyms.find((g) => g.id === u.managed_gym)?.name || "Gimnasio N/A"}
                  </span>
                )}
                {!u.is_superuser && (
                  <button
                    onClick={() => toggleUserActive(u)}
                    className={`px-3 py-2 rounded-xl border text-xs ${
                      u.is_active
                        ? "border-zinc-600 text-zinc-400 hover:text-red-400"
                        : "border-green-600/40 text-green-400 hover:text-green-300"
                    }`}
                  >
                    {u.is_active ? "Desactivar" : "Activar"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-zinc-500 text-center py-6 text-sm">No hay usuarios que coincidan.</p>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.15} className="glass rounded-3xl p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          <BuildingStorefrontIcon className="w-6 h-6 text-amber-400" />
          Gimnasios
        </h2>
        <div className="space-y-2">
          {gyms.map((gym) => (
            <div key={gym.slug} className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/50 rounded-xl p-4">
              <div>
                <p className="font-semibold text-white">{gym.name}</p>
                <p className="text-xs text-zinc-500">
                  Código: {gym.slug} · {gym.address || "sin dirección"} · Admins: {gym.managed_admins.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleGymActive(gym)}
                  className={`px-3 py-2 rounded-xl border text-xs ${
                    gym.is_active
                      ? "border-zinc-600 text-zinc-400 hover:text-red-400"
                      : "border-green-600/40 text-green-400 hover:text-green-300"
                  }`}
                >
                  {gym.is_active ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
          {gyms.length === 0 && (
            <p className="text-zinc-500 text-center py-6 text-sm">No hay gimnasios registrados.</p>
          )}
        </div>
      </FadeIn>
    </div>
  );
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
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}