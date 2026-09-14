"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BuildingStorefrontIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  TicketIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  TrophyIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import {
  getMyGym,
  joinGymBySlug,
  leaveGym,
  checkIn,
  getGymAthletes,
  getAthleteDashboard,
  getGymAdminDashboard,
  createGymSubscription,
  updateGymSubscription,
  kickMember,
  getGymEvents,
  createGymEvent,
  deleteGymEvent,
  getGymPlans,
  createGymPlan,
  deleteGymPlan,
  updateGymMember,
  ApiError,
} from "@/lib/api";
import { FadeIn } from "@/components/ui/FadeIn";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";
import { useDashboardStore } from "@/stores/dashboardStore";
import type {
  Gym,
  MyGymData,
  TrainerAthlete,
  AthleteDashboard,
  GymAdminDashboard,
  GymEvent,
  GymPlan,
  GymMembership,
} from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  member: "Miembro",
  trainer: "Entrenador",
  admin: "Admin",
};

const ROLE_STYLES: Record<string, string> = {
  member: "bg-zinc-800 text-zinc-300",
  trainer: "bg-blue-500/20 text-blue-400",
  admin: "bg-amber-500/20 text-amber-400",
};

export default function GymsPage() {
  const ready = useMinimumSkeleton(500);
  const { user } = useDashboardStore();
  const [data, setData] = useState<MyGymData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [joinSlug, setJoinSlug] = useState("");
  const [joining, setJoining] = useState(false);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 4000);
  }, []);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await getMyGym());
      setInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar tu gimnasio");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const join = params.get("join");
    if (join) {
      joinGymBySlug(join)
        .then(() => notify("Te uniste al gimnasio. Bienvenido."))
        .catch((err) => setError(err instanceof Error ? err.message : "No se pudo unir al gimnasio"))
        .finally(() => reload());
    } else {
      reload();
    }
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready || !initialized) {
    return <GymsSkeleton />;
  }

  const hasGym = Boolean(data?.gym && data?.membership);
  const gym = data?.gym ?? null;
  const slug = gym?.slug ?? "";
  const roles = data?.roles ?? { is_admin: false, is_trainer: false, is_member: false };
  const globalGymAdmin = user?.role === "gym_admin";

  const handleJoin = async () => {
    if (!joinSlug) return;
    setJoining(true);
    setError("");
    try {
      await joinGymBySlug(joinSlug);
      setJoinSlug("");
      notify("Te uniste al gimnasio.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir al gimnasio");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!data?.membership || !confirm("¿Salir de este gimnasio?")) return;
    await leaveGym(data.membership.id);
    notify("Saliste del gimnasio.");
    await reload();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <FadeIn className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BuildingStorefrontIcon className="w-8 h-8 text-amber-400" />
          Gimnasio
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

      {!hasGym ? (
        <JoinHero
          slug={joinSlug}
          onSlug={setJoinSlug}
          onJoin={handleJoin}
          joining={joining}
        />
      ) : roles.is_admin || globalGymAdmin ? (
        <GymAdminPortal slug={slug} notify={notify} onChanged={() => reload(true)} />
      ) : roles.is_trainer ? (
        <TrainerPortal slug={slug} notify={notify} />
      ) : (
        <MemberPortal
          data={data as MyGymData}
          onLeave={handleLeave}
          notify={notify}
        />
      )}
    </div>
  );
}

function JoinHero({
  slug,
  onSlug,
  onJoin,
  joining,
}: {
  slug: string;
  onSlug: (v: string) => void;
  onJoin: () => void;
  joining: boolean;
}) {
  return (
    <FadeIn delay={0.1} className="glass rounded-3xl p-10 md:p-14 text-center max-w-2xl mx-auto">
      <BuildingStorefrontIcon className="w-16 h-16 text-amber-400/70 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">Únete a un templo</h2>
      <p className="text-zinc-400 mb-8 max-w-md mx-auto">
        Escaneá el código QR que te compartió tu gimnasio, o ingresá el código (slug)
        que te pasó tu entrenador para unirte.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
        <input
          className="input flex-1"
          placeholder="Código del gimnasio"
          value={slug}
          onChange={(e) => onSlug(e.target.value)}
          required
        />
        <button
          onClick={onJoin}
          disabled={!slug || joining}
          className="px-6 py-2 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90 disabled:opacity-60"
        >
          {joining ? "Uniendo..." : "Unirme"}
        </button>
      </div>
      <p className="text-zinc-600 text-xs mt-6">
        Al escanear el QR se abre esta pantalla con tu unión automática.
      </p>
    </FadeIn>
  );
}

function MemberPortal({
  data,
  onLeave,
  notify,
}: {
  data: MyGymData;
  onLeave: () => void;
  notify: (msg: string) => void;
}) {
  const gym = data.gym as Gym;
  const [checking, setChecking] = useState(false);
  const [checkedToday, setCheckedToday] = useState(false);

  const handleCheckIn = async () => {
    setChecking(true);
    try {
      await checkIn(gym.slug);
      setCheckedToday(true);
      notify("Entrada registrada. Buenas energías, guerrero.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setCheckedToday(true);
        notify(err.message);
      } else {
        notify(err instanceof Error ? err.message : "No se pudo registrar la entrada");
      }
    } finally {
      setChecking(false);
    }
  };

  const sub = data.subscription;
  const totalDays = sub && sub.plan ? sub.plan.duration_days : 30;
  const progress = sub && data.days_remaining !== null
    ? Math.max(0, Math.min(100, (data.days_remaining / totalDays) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <FadeIn delay={0.05} className="glass rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{gym.name}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${ROLE_STYLES[data.membership?.role || "member"]}`}>
                {ROLE_LABELS[data.membership?.role || "member"]}
              </span>
            </div>
            {gym.address && <p className="text-zinc-400 text-sm mt-1">{gym.address}</p>}
            {gym.phone && <p className="text-zinc-500 text-sm">{gym.phone}</p>}
            <p className="text-zinc-600 text-xs mt-1">Código: {gym.slug}</p>
          </div>
          <button
            onClick={onLeave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-600 text-zinc-400 hover:text-red-400 hover:border-red-500/40 text-sm self-start md:self-auto"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Salir
          </button>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FadeIn delay={0.1} className="glass rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <TrophyIcon className="w-5 h-5 text-amber-400" />
            Tu membresía
          </h3>
          {sub ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm">{sub.plan?.name || "Plan"}</span>
                <span className="text-sm font-bold text-amber-400">
                  {data.days_remaining} días restantes
                </span>
              </div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full gold-gradient rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Vence el {new Date(sub.end_date).toLocaleDateString()}</span>
                <span>{sub.status === "active" ? "Activa" : sub.status}</span>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Aún no tenés una mensualidad activa.</p>
          )}
        </FadeIn>

        <FadeIn delay={0.15} className="glass rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <FireIcon className="w-5 h-5 text-amber-400" />
            Asistencias
          </h3>
          <div className="text-4xl font-black text-white mb-4">
            {data.attendance_count}
            <span className="text-lg font-semibold text-zinc-500 ml-2">entradas</span>
          </div>
          <button
            onClick={handleCheckIn}
            disabled={checking || checkedToday}
            className="w-full py-3 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkedToday ? "Entrada registrada hoy" : checking ? "Registrando..." : "Registrar mi entrada de hoy"}
          </button>
        </FadeIn>
      </div>

      <FadeIn delay={0.2} className="glass rounded-3xl p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <CalendarDaysIcon className="w-5 h-5 text-amber-400" />
          Próximos eventos
        </h3>
        {data.events.length === 0 ? (
          <p className="text-zinc-500 text-sm">No hay eventos próximos.</p>
        ) : (
          <div className="space-y-3">
            {data.events.map((event) => (
              <div key={event.id} className="flex items-start justify-between bg-zinc-900/50 rounded-xl p-4">
                <div>
                  <p className="font-semibold text-white">{event.title}</p>
                  {event.description && <p className="text-sm text-zinc-400 mt-1">{event.description}</p>}
                </div>
                <span className="text-xs text-zinc-500 whitespace-nowrap ml-3">
                  {new Date(event.starts_at).toLocaleDateString()} · {new Date(event.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </FadeIn>
    </div>
  );
}

function TrainerPortal({ slug, notify }: { slug: string; notify: (msg: string) => void }) {
  const [athletes, setAthletes] = useState<TrainerAthlete[] | null>(null);
  const [openAthlete, setOpenAthlete] = useState<Record<number, AthleteDashboard | "loading">>({});
  const [error, setError] = useState("");

  useEffect(() => {
    getGymAthletes(slug)
      .then(setAthletes)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los atletas"));
  }, [slug]);

  const toggleAthlete = async (membershipId: number) => {
    if (openAthlete[membershipId]) {
      setOpenAthlete((s) => {
        const next = { ...s };
        delete next[membershipId];
        return next;
      });
      return;
    }
    setOpenAthlete((s) => ({ ...s, [membershipId]: "loading" }));
    try {
      const dashboard = await getAthleteDashboard(slug, membershipId);
      setOpenAthlete((s) => ({ ...s, [membershipId]: dashboard }));
    } catch (err) {
      setOpenAthlete((s) => {
        const next = { ...s };
        delete next[membershipId];
        return next;
      });
      setError(err instanceof Error ? err.message : "No se pudo cargar el atleta");
    }
  };

  const registerAttendance = async (membershipId: number, name: string) => {
    try {
      await checkIn(slug, membershipId);
      notify(`Entrada registrada para ${name}.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo registrar la entrada");
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <FadeIn className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </FadeIn>
      )}
      <FadeIn className="glass rounded-3xl p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          <UserGroupIcon className="w-6 h-6 text-amber-400" />
          Mis atletas
        </h2>
        {athletes === null ? (
          <p className="text-zinc-500 text-sm text-center py-6">Cargando atletas...</p>
        ) : athletes.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-6">Todavía no tenés atletas asignados.</p>
        ) : (
          <div className="space-y-3">
            {athletes.map((athlete) => (
              <div key={athlete.membership_id} className="bg-zinc-900/50 rounded-2xl">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-white">
                      {athlete.user.first_name || athlete.user.username}{" "}
                      {athlete.user.last_name || ""}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {athlete.attendance_count} entradas
                      {athlete.subscription
                        ? ` · ${athlete.subscription.status === "active" ? "mensualidad activa" : athlete.subscription.status} · ${athlete.subscription.days_remaining} días`
                        : " · sin mensualidad"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => registerAttendance(athlete.membership_id, athlete.user.first_name || athlete.user.username)}
                      className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs hover:bg-amber-500/30"
                    >
                      Marcar asistencia
                    </button>
                    <button
                      onClick={() => toggleAthlete(athlete.membership_id)}
                      className="p-2 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-white/5"
                    >
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${openAthlete[athlete.membership_id] ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>
                {openAthlete[athlete.membership_id] === "loading" && (
                  <div className="p-4 border-t border-zinc-800 text-zinc-500 text-sm">Cargando detalle...</div>
                )}
                {openAthlete[athlete.membership_id] && openAthlete[athlete.membership_id] !== "loading" && (
                  <AthleteDetail data={openAthlete[athlete.membership_id] as AthleteDashboard} />
                )}
              </div>
            ))}
          </div>
        )}
      </FadeIn>
    </div>
  );
}

function AthleteDetail({ data }: { data: AthleteDashboard }) {
  const cards = [
    { label: "Último peso", value: data.last_weight ? `${data.last_weight.weight} kg` : "Sin datos" },
    { label: "Entrenos 30 días", value: `${data.workouts_30d}` },
    { label: "Calorías hoy", value: `${data.nutrition_today.calories}` },
    { label: "Agua hoy", value: `${data.nutrition_today.water_ml} ml` },
    { label: "Asistencias", value: `${data.attendance_count}` },
    { label: "Mensualidad", value: data.subscription ? `${data.subscription.days_remaining} días` : "Sin plan" },
  ];
  return (
    <div className="p-4 border-t border-zinc-800 grid grid-cols-2 md:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-black/30 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">{card.label}</p>
          <p className="text-lg font-bold text-white mt-1">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function GymAdminPortal({
  slug,
  notify,
  onChanged,
}: {
  slug: string;
  notify: (msg: string) => void;
  onChanged: () => void;
}) {
  const [dashboard, setDashboard] = useState<GymAdminDashboard | null>(null);
  const [events, setEvents] = useState<GymEvent[] | null>(null);
  const [plans, setPlans] = useState<GymPlan[] | null>(null);
  const [error, setError] = useState("");
  const [openManage, setOpenManage] = useState(false);

  const [eventForm, setEventForm] = useState({ title: "", description: "", starts_at: "" });
  const [planForm, setPlanForm] = useState({ name: "", price: "", duration_days: "30" });
  const [subForm, setSubForm] = useState<{ user: string; plan: string }>({ user: "", plan: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([getGymAdminDashboard(slug), getGymEvents(slug), getGymPlans(slug)])
      .then(([d, e, p]) => {
        setDashboard(d);
        setEvents(e);
        setPlans(p);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el panel de gestión"));
  }, [slug]);

  const createSubscription = async () => {
    if (!subForm.user) return;
    setBusy(true);
    setError("");
    try {
      await createGymSubscription(slug, {
        user: Number(subForm.user),
        ...(subForm.plan ? { plan: Number(subForm.plan) } : {}),
      });
      notify("Mensualidad creada.");
      setSubForm({ user: "", plan: "" });
      onChanged();
      const d = await getGymAdminDashboard(slug);
      setDashboard(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la mensualidad");
    } finally {
      setBusy(false);
    }
  };

  const renewSub = async (id: number, hasPlan: boolean) => {
    setBusy(true);
    setError("");
    try {
      await updateGymSubscription(slug, id, "renew", hasPlan ? undefined : 30);
      notify("Mensualidad renovada.");
      onChanged();
      const d = await getGymAdminDashboard(slug);
      setDashboard(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo renovar");
    } finally {
      setBusy(false);
    }
  };

  const cancelSub = async (id: number) => {
    setBusy(true);
    setError("");
    try {
      await updateGymSubscription(slug, id, "cancel");
      notify("Mensualidad cancelada.");
      onChanged();
      const d = await getGymAdminDashboard(slug);
      setDashboard(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar");
    } finally {
      setBusy(false);
    }
  };

  const kick = async (membershipId: number) => {
    if (!confirm("¿Expulsar a este atleta del gimnasio?")) return;
    setBusy(true);
    setError("");
    try {
      await kickMember(slug, membershipId);
      notify("Atleta expulsado.");
      onChanged();
      const d = await getGymAdminDashboard(slug);
      setDashboard(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo expulsar");
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (membershipId: number, role: GymMembership["role"]) => {
    try {
      await updateGymMember(slug, membershipId, { role });
      notify("Rol actualizado.");
      onChanged();
      const d = await getGymAdminDashboard(slug);
      setDashboard(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el rol");
    }
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.starts_at) return;
    setBusy(true);
    setError("");
    try {
      await createGymEvent(slug, {
        title: eventForm.title,
        description: eventForm.description,
        starts_at: new Date(eventForm.starts_at).toISOString(),
      });
      setEventForm({ title: "", description: "", starts_at: "" });
      notify("Evento creado.");
      setEvents(await getGymEvents(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el evento");
    } finally {
      setBusy(false);
    }
  };

  const removeEvent = async (id: number) => {
    if (!confirm("¿Eliminar este evento?")) return;
    await deleteGymEvent(slug, id);
    notify("Evento eliminado.");
    setEvents(await getGymEvents(slug));
  };

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name) return;
    setBusy(true);
    setError("");
    try {
      await createGymPlan(slug, {
        name: planForm.name,
        price: planForm.price || "0.00",
        duration_days: Number(planForm.duration_days),
      });
      setPlanForm({ name: "", price: "", duration_days: "30" });
      notify("Plan creado.");
      setPlans(await getGymPlans(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el plan");
    } finally {
      setBusy(false);
    }
  };

  const removePlan = async (id: number) => {
    if (!confirm("¿Eliminar este plan?")) return;
    try {
      await deleteGymPlan(slug, id);
      notify("Plan eliminado.");
      setPlans(await getGymPlans(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el plan");
    }
  };

  if (!dashboard) {
    return (
      <FadeIn className="glass rounded-3xl p-10 text-center text-zinc-400">
        {error || "Cargando panel de gestión..."}
      </FadeIn>
    );
  }

  const stats = [
    { label: "Mensualidades activas", value: dashboard.active_subscriptions },
    { label: "Vencidas", value: dashboard.expired_subscriptions },
    { label: "Asistencias hoy", value: dashboard.today_attendance },
    { label: "Nuevos del mes", value: dashboard.new_members_month },
    { label: "Atletas", value: dashboard.athletes_count },
    { label: "Entrenadores", value: dashboard.trainers_count },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <FadeIn className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </FadeIn>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <FadeIn key={stat.label} delay={i * 0.05} className="glass rounded-2xl p-4">
            <p className="text-3xl font-black text-white">{stat.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{stat.label}</p>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.1} className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserGroupIcon className="w-6 h-6 text-amber-400" />
            Gestión de atletas
          </h2>
          <button
            onClick={() => setOpenManage(!openManage)}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-white/5 text-sm"
          >
            Nueva mensualidad
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${openManage ? "rotate-180" : ""}`} />
          </button>
        </div>

        {openManage && (
          <form onSubmit={(e) => { e.preventDefault(); createSubscription(); }} className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-900/40 rounded-2xl p-4">
            <select
              className="input"
              value={subForm.user}
              onChange={(e) => setSubForm({ ...subForm, user: e.target.value })}
              required
            >
              <option value="">Seleccionar atleta</option>
              {dashboard.members.filter((m) => m.role === "member").map((m) => (
                <option key={m.membership_id} value={m.user.id}>
                  {m.user.first_name || m.user.username}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={subForm.plan}
              onChange={(e) => setSubForm({ ...subForm, plan: e.target.value })}
            >
              <option value="">Duración: 30 días</option>
              {(plans || []).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.duration_days} días - ${plan.price})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-sm hover:bg-amber-500/30 disabled:opacity-50"
            >
              Crear
            </button>
          </form>
        )}

        <div className="space-y-2">
          {dashboard.members.map((member) => (
            <div key={member.membership_id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/50 rounded-xl p-4">
              <div>
                <p className="font-semibold text-white">
                  {member.user.first_name || member.user.username}{" "}
                  {member.user.last_name || ""}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ROLE_STYLES[member.role] || ROLE_STYLES.member}`}>
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {member.subscription
                    ? `${member.subscription.status === "active" ? "Activa" : "No activa"} · vence ${new Date(member.subscription.end_date).toLocaleDateString()} · ${member.subscription.days_remaining} días restantes`
                    : "Sin mensualidad"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={member.role}
                  onChange={(e) => changeRole(member.membership_id, e.target.value as GymMembership["role"])}
                  className="input !py-1.5 !w-auto text-sm"
                >
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                {member.role === "member" && member.subscription?.status === "active" && (
                  <>
                    <button onClick={() => cancelSub(member.subscription!.id)} className="px-3 py-2 rounded-xl border border-zinc-600 text-zinc-300 text-xs hover:text-yellow-400">
                      Cancelar
                    </button>
                    <button onClick={() => renewSub(member.subscription!.id, Boolean(member.subscription?.plan))} className="px-3 py-2 rounded-xl border border-zinc-600 text-zinc-300 text-xs hover:text-green-400">
                      Renovar
                    </button>
                  </>
                )}
                <button onClick={() => kick(member.membership_id)} className="px-3 py-2 rounded-xl border border-zinc-600 text-zinc-400 text-xs hover:text-red-400">
                  Expulsar
                </button>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FadeIn delay={0.15} className="glass rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <CalendarDaysIcon className="w-5 h-5 text-amber-400" />
            Planes
          </h2>
          <form onSubmit={createPlan} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <input className="input" placeholder="Nombre" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required />
            <input className="input" placeholder="Precio ARS" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} />
            <input className="input" type="number" min={1} placeholder="Días" value={planForm.duration_days} onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })} required />
            <button type="submit" disabled={busy} className="sm:col-span-3 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-sm hover:bg-amber-500/30 disabled:opacity-50">
              Crear plan
            </button>
          </form>
          <div className="space-y-2">
            {(plans || []).map((plan) => (
              <div key={plan.id} className="flex items-center justify-between bg-zinc-900/50 rounded-xl p-3">
                <div>
                  <p className="text-sm font-semibold text-white">{plan.name}</p>
                  <p className="text-xs text-zinc-500">{plan.duration_days} días · ${plan.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className={`w-4 h-4 ${plan.is_active ? "text-green-500" : "text-zinc-600"}`} />
                  <button onClick={() => removePlan(plan.id)} className="text-xs text-zinc-400 hover:text-red-400">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.2} className="glass rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <TicketIcon className="w-5 h-5 text-amber-400" />
            Eventos
          </h2>
          <form onSubmit={createEvent} className="space-y-2 mb-4">
            <input className="input" placeholder="Título" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
            <input className="input" placeholder="Descripción" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
            <input className="input" type="datetime-local" value={eventForm.starts_at} onChange={(e) => setEventForm({ ...eventForm, starts_at: e.target.value })} required />
            <button type="submit" disabled={busy} className="w-full px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-sm hover:bg-amber-500/30 disabled:opacity-50">
              Crear evento
            </button>
          </form>
          <div className="space-y-2">
            {(events || []).slice(0, 12).map((event) => (
              <div key={event.id} className="flex items-start justify-between bg-zinc-900/50 rounded-xl p-3">
                <div>
                  <p className="text-sm font-semibold text-white">{event.title}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(event.starts_at).toLocaleDateString()} ·{" "}
                    {new Date(event.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button onClick={() => removeEvent(event.id)} className="text-xs text-zinc-400 hover:text-red-400">
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

function GymsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}