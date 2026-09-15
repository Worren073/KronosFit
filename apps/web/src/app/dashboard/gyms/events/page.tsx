"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import {
  getMyGym,
  getGymEvents,
  createGymEvent,
  deleteGymEvent,
  ApiError,
} from "@/lib/api";
import { FadeIn } from "@/components/ui/FadeIn";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";
import { useDashboardStore } from "@/stores/dashboardStore";
import type { GymEvent } from "@/lib/types";

interface PendingAction {
  title: string;
  message: React.ReactNode;
  action: () => Promise<void>;
}

export default function GymEventsPage() {
  const ready = useMinimumSkeleton(500);
  const router = useRouter();
  const { user, userInitialized, fetchUser } = useDashboardStore();

  const [slug, setSlug] = useState("");
  const [events, setEvents] = useState<GymEvent[]>([]);
  const [form, setForm] = useState({ title: "", description: "", starts_at: "" });
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [confirm, setConfirm] = useState<PendingAction | null>(null);

  useEffect(() => {
    if (!userInitialized) fetchUser().catch(() => {});
  }, [userInitialized, fetchUser]);

  useEffect(() => {
    if (!userInitialized || !user) return;
    if (user.role !== "gym_admin") {
      router.replace("/dashboard/gyms");
      return;
    }
    getMyGym()
      .then((data) => {
        if (!data.gym) throw new Error("Sin gimnasio");
        setSlug(data.gym.slug);
        return getGymEvents(data.gym.slug);
      })
      .then((e) => {
        setEvents(e);
        setInitialized(true);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/dashboard/gyms");
        } else {
          setError(err instanceof Error ? err.message : "No se pudo cargar los eventos");
        }
      });
  }, [user, userInitialized, router]);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 4000);
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !form.title || !form.starts_at) return;
    setBusy(true);
    setError("");
    try {
      await createGymEvent(slug, {
        title: form.title,
        description: form.description,
        starts_at: new Date(form.starts_at).toISOString(),
      });
      setForm({ title: "", description: "", starts_at: "" });
      notify("Evento creado.");
      setEvents(await getGymEvents(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el evento");
    } finally {
      setBusy(false);
    }
  };

  const removeEvent = async (id: number) => {
    if (!slug) return;
    try {
      await deleteGymEvent(slug, id);
      notify("Evento eliminado.");
      setEvents(await getGymEvents(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el evento");
    }
  };

  const requestRemoveEvent = (id: number) => {
    if (!slug) return;
    setConfirm({
      title: "Eliminar evento",
      message: "¿Eliminar este evento? Esta acción no se puede deshacer.",
      action: () => removeEvent(id),
    });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    await confirm.action();
    setConfirm(null);
  };

  if (!ready || !userInitialized) return <EventsSkeleton />;
  if (!user || user.role !== "gym_admin" || !initialized) return <EventsSkeleton />;

  const upcoming = events
    .filter((ev) => new Date(ev.starts_at) >= new Date())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const past = events
    .filter((ev) => new Date(ev.starts_at) < new Date())
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <CalendarDaysIcon className="w-8 h-8 text-amber-400" />
          Eventos
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

      <FadeIn className="glass rounded-3xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Nuevo evento</h2>
        <form onSubmit={createEvent} className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <input
              className="input"
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              required
            />
          </div>
          <input
            className="input w-full"
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-sm hover:bg-amber-500/30 disabled:opacity-50"
          >
            Crear evento
          </button>
        </form>
      </FadeIn>

      <FadeIn delay={0.1} className="glass rounded-3xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Próximos</h2>
        {upcoming.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">No hay eventos próximos.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-3 bg-zinc-900/50 rounded-xl p-4">
                <div>
                  <p className="font-semibold text-white">{event.title}</p>
                  {event.description && <p className="text-sm text-zinc-400 mt-1">{event.description}</p>}
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(event.starts_at).toLocaleDateString()} ·{" "}
                    {new Date(event.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button onClick={() => requestRemoveEvent(event.id)} className="text-xs text-zinc-400 hover:text-red-400 whitespace-nowrap">
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </FadeIn>

      {past.length > 0 && (
        <FadeIn delay={0.15} className="glass rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Pasados</h2>
          <div className="space-y-2">
            {past.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-3 bg-zinc-900/50 rounded-xl p-4 opacity-70">
                <div>
                  <p className="font-semibold text-white">{event.title}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(event.starts_at).toLocaleDateString()} ·{" "}
                    {new Date(event.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button onClick={() => requestRemoveEvent(event.id)} className="text-xs text-zinc-400 hover:text-red-400 whitespace-nowrap">
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      <ConfirmModal
        open={confirm !== null}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        busy={busy}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}