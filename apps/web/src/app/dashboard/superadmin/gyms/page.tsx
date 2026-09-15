"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BuildingStorefrontIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  getAdminGyms,
  updateAdminGym,
  deleteAdminGym,
  ApiError,
} from "@/lib/api";
import { FadeIn } from "@/components/ui/FadeIn";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";
import { useDashboardStore } from "@/stores/dashboardStore";
import type { AdminGym } from "@/lib/types";
import CreateGymModal from "./CreateGymModal";

interface PendingAction {
  title: string;
  message: React.ReactNode;
  action: () => Promise<void>;
}

export default function SuperAdminGymsPage() {
  const ready = useMinimumSkeleton(500);
  const router = useRouter();
  const { user, userInitialized, fetchUser } = useDashboardStore();

  const [gyms, setGyms] = useState<AdminGym[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<PendingAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

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
    getAdminGyms()
      .then((g) => {
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

  const toggleGymActive = async (gym: AdminGym) => {
    try {
      const updated = await updateAdminGym(gym.slug, { is_active: !gym.is_active });
      setGyms((prev) => prev.map((g) => (g.slug === updated.slug ? updated : g)));
      notify(`Gimnasio ${updated.name} ${updated.is_active ? "reactivado" : "desactivado"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el gimnasio");
    }
  };

  const handleCreated = useCallback(async () => {
    setCreateOpen(false);
    try {
      setGyms(await getAdminGyms());
      notify("Gimnasio creado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo refrescar la lista");
    }
  }, [notify]);

  const requestDelete = (gym: AdminGym) => {
    const admins = gym.managed_admins.length;
    const extras = admins > 0
      ? ` Además, ${admins} ${admins === 1 ? "encargado pasa" : "encargados pasan"} a ser ${admins === 1 ? "un usuario" : "usuarios"} de la plataforma (sin gimnasio asignado).`
      : "";
    setConfirm({
      title: "Eliminar gimnasio",
      message: (
        <>
          ¿Eliminar el gimnasio <span className="font-bold text-white">«{gym.name}»</span>? Los
          usuarios ligados quedarán sin gimnasio{extras} Esta acción no se puede deshacer.
        </>
      ),
      action: async () => {
        setConfirmBusy(true);
        try {
          await deleteAdminGym(gym.slug);
          setGyms((prev) => prev.filter((g) => g.slug !== gym.slug));
          notify(`Gimnasio ${gym.name} eliminado.`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo eliminar el gimnasio");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    await confirm.action();
    setConfirm(null);
  };

  if (!ready || !userInitialized) {
    return <GymsSkeleton />;
  }
  if (!user || !user.is_superuser || !initialized) {
    return <GymsSkeleton />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BuildingStorefrontIcon className="w-8 h-8 text-amber-400" />
          Gimnasios
        </h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Crear gimnasio
        </button>
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

      <FadeIn className="glass rounded-3xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Gestión</h2>
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
                <button
                  onClick={() => requestDelete(gym)}
                  className="px-3 py-2 rounded-xl border border-red-600/40 text-red-400 hover:bg-red-500/10 text-xs"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {gyms.length === 0 && (
            <p className="text-zinc-500 text-center py-6 text-sm">No hay gimnasios registrados.</p>
          )}
        </div>
      </FadeIn>

      <CreateGymModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />

      <ConfirmModal
        open={confirm !== null}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        busy={confirmBusy}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function GymsSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}