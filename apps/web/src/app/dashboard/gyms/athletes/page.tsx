"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserGroupIcon,
  ChevronDownIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  getMyGym,
  getGymAdminDashboard,
  getGymPlans,
  createGymSubscription,
  updateGymSubscription,
  kickMember,
  updateGymMember,
  createGymPlan,
  deleteGymPlan,
  ApiError,
} from "@/lib/api";
import { FadeIn } from "@/components/ui/FadeIn";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";
import { useDashboardStore } from "@/stores/dashboardStore";
import GymStats from "@/components/dashboard/gyms/GymStats";
import { RenewSubModal } from "@/components/dashboard/gyms/RenewSubModal";
import type { GymAdminDashboard, GymMembership, GymPlan, MemberSummary } from "@/lib/types";

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

interface PendingAction {
  title: string;
  message: React.ReactNode;
  action: () => Promise<void>;
  danger?: boolean;
  confirmLabel?: string;
}

export default function GymAthletesPage() {
  const ready = useMinimumSkeleton(500);
  const router = useRouter();
  const { user, userInitialized, fetchUser } = useDashboardStore();

  const [slug, setSlug] = useState("");
  const [dashboard, setDashboard] = useState<GymAdminDashboard | null>(null);
  const [plans, setPlans] = useState<GymPlan[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [initialized, setInitialized] = useState(false);

  const [openSub, setOpenSub] = useState(false);
  const [subForm, setSubForm] = useState({ user: "", plan: "" });
  const [planForm, setPlanForm] = useState({ name: "", price: "", duration_days: "30" });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<PendingAction | null>(null);
  const [renewMember, setRenewMember] = useState<MemberSummary | null>(null);

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
        return Promise.all([getGymAdminDashboard(data.gym.slug), getGymPlans(data.gym.slug)]);
      })
      .then(([d, p]) => {
        setDashboard(d);
        setPlans(p);
        setInitialized(true);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/dashboard/gyms");
        } else {
          setError(err instanceof Error ? err.message : "No se pudo cargar el panel de atletas");
        }
      });
  }, [user, userInitialized, router]);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 4000);
  };

  const refreshDashboard = async () => {
    if (!slug) return;
    const d = await getGymAdminDashboard(slug);
    setDashboard(d);
  };

  const createSubscription = async () => {
    if (!subForm.user || !slug) return;
    setBusy(true);
    setError("");
    try {
      await createGymSubscription(slug, {
        user: Number(subForm.user),
        ...(subForm.plan ? { plan: Number(subForm.plan) } : {}),
      });
      notify("Mensualidad creada.");
      setSubForm({ user: "", plan: "" });
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la mensualidad");
    } finally {
      setBusy(false);
    }
  };

  const handleRenewMember = async () => {
    if (!slug || !renewMember?.subscription) return;
    notify("Mensualidad renovada.");
    setRenewMember(null);
    try {
      await refreshDashboard();
    } catch {
      // el error se muestra en la página
    }
  };

const doCancelSub = async (id: number) => {
    if (!slug) return;
    setBusy(true);
    setError("");
    try {
      await updateGymSubscription(slug, id, "cancel");
      notify("Mensualidad revocada.");
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revocar la mensualidad");
    } finally {
      setBusy(false);
    }
  };

  const requestCancelSub = (id: number) => {
    setConfirm({
      title: "Revocar plan",
      message: "¿Está seguro de revocar el plan de este atleta? Perderá el acceso inmediatamente.",
      danger: true,
      confirmLabel: "Revocar",
      action: () => doCancelSub(id),
    });
  };

  const kick = async (membershipId: number) => {
    if (!slug) return;
    setBusy(true);
    setError("");
    try {
      await kickMember(slug, membershipId);
      notify("Miembro expulsado.");
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo expulsar");
    } finally {
      setBusy(false);
    }
  };

  const requestKick = (membershipId: number) => {
    if (!slug) return;
    setConfirm({
      title: "Expulsar miembro",
      message: "¿Expulsar a este miembro del gimnasio? Perderá su membresía y no podrá volver sin un código.",
      action: () => kick(membershipId),
    });
  };

  const changeRole = async (membershipId: number, m: MemberSummary, role: string) => {
    if (!slug || m.user.id === user?.id) return;
    setBusy(true);
    setError("");
    try {
      await updateGymMember(slug, membershipId, { role: role as GymMembership["role"] });
      notify("Rol actualizado.");
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el rol");
    } finally {
      setBusy(false);
    }
  };

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name || !slug) return;
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
    if (!slug) return;
    try {
      await deleteGymPlan(slug, id);
      notify("Plan eliminado.");
      setPlans(await getGymPlans(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el plan");
    }
  };

  const requestRemovePlan = (id: number) => {
    if (!slug) return;
    setConfirm({
      title: "Eliminar plan",
      message: "¿Eliminar este plan? Los atletas con este plan activo se mantendrán hasta su vencimiento.",
      action: () => removePlan(id),
    });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    await confirm.action();
    setConfirm(null);
  };

  if (!ready || !userInitialized) return <AthletesSkeleton />;
  if (!user || user.role !== "gym_admin" || !initialized) return <AthletesSkeleton />;

  const members = dashboard?.members ?? [];
  const trainers = members.filter((m) => m.role === "trainer");
  const athletes = members.filter((m) => m.role === "member");
  const eligibleForSub = athletes.filter(
    (a) =>
      !a.subscription ||
      (a.subscription.status !== "active" && a.subscription.status !== "expired")
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <UserGroupIcon className="w-8 h-8 text-amber-400" />
          Atletas
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

      {dashboard && <GymStats dashboard={dashboard} />}

      <FadeIn delay={0.1} className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Entrenadores</h2>
        </div>
        <div className="space-y-2">
          {trainers.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">No hay entrenadores.</p>
          ) : (
            trainers.map((trainer) => {
              const assigned = members.filter((m) => m.trainer && m.trainer.id === trainer.membership_id).length;
              return (
                <div key={trainer.membership_id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/50 rounded-xl p-4">
                  <div>
                    <p className="font-semibold text-white">
                      {trainer.user.first_name || trainer.user.username} {trainer.user.last_name || ""}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {assigned} {assigned === 1 ? "atleta asignado" : "atletas asignados"} · Sin plan
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {trainer.user.id !== user.id && (
                      <select
                        value={trainer.role}
                        onChange={(e) => changeRole(trainer.membership_id, trainer, e.target.value)}
                        className="input !py-1.5 !w-auto text-sm"
                      >
                        {Object.entries(ROLE_LABELS).filter(([key]) => key !== "admin").map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    )}
                    <button onClick={() => requestKick(trainer.membership_id)} className="px-3 py-2 rounded-xl border border-zinc-600 text-zinc-400 text-xs hover:text-red-400">
                      Expulsar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.15} className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Atletas</h2>
          <button
            onClick={() => setOpenSub(!openSub)}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-white/5 text-sm"
          >
            Nueva mensualidad
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${openSub ? "rotate-180" : ""}`} />
          </button>
        </div>

        {openSub && (
          <form onSubmit={(e) => { e.preventDefault(); createSubscription(); }} className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-900/40 rounded-2xl p-4">
            <select
              className="input"
              value={subForm.user}
              onChange={(e) => setSubForm({ ...subForm, user: e.target.value })}
              required
            >
              <option value="">Seleccionar atleta</option>
              {eligibleForSub.map((m) => (
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
              {plans.map((plan) => (
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
          {athletes.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">No hay atletas.</p>
          ) : (
            athletes.map((member) => {
              const sub = member.subscription;
              const totalDays = sub && sub.plan ? sub.plan.duration_days : 30;
              const progress = sub
                ? Math.max(0, Math.min(100, (sub.days_remaining / totalDays) * 100))
                : 0;
              return (
                <div key={member.membership_id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-zinc-900/50 rounded-xl p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">
                      {member.user.first_name || member.user.username} {member.user.last_name || ""}
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ROLE_STYLES[member.role] || ROLE_STYLES.member}`}>
                        {ROLE_LABELS[member.role] || member.role}
                      </span>
                    </p>
                  {sub?.status === "active" ? (
                    <div className="mt-2 max-w-xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-400">{sub.plan?.name || "Plan libre"}</span>
                        <span className="text-amber-400 font-bold">{sub.days_remaining} días</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full gold-gradient rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Vence el {new Date(sub.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  ) : sub?.status === "expired" ? (
                    <div className="mt-2 max-w-xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-400 line-through">{sub.plan?.name || "Plan libre"}</span>
                        <span className="text-red-400 font-bold">Vencido</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500/80 rounded-full" />
                      </div>
                      <p className="text-[11px] text-red-400/70 mt-1">
                        Venció el {new Date(sub.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 mt-1">Sin plan</p>
                  )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {member.user.id !== user.id && (
                      <select
                        value={member.role}
                        onChange={(e) => changeRole(member.membership_id, member, e.target.value)}
                        className="input !py-1.5 !w-auto text-sm"
                      >
                        {Object.entries(ROLE_LABELS).filter(([key]) => key !== "admin").map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    )}
                    {(sub?.status === "active" || sub?.status === "expired") && (
                      <>
                        <button
                          onClick={() => requestCancelSub(sub.id)}
                          className="px-3 py-2 rounded-xl border border-zinc-600 text-zinc-300 text-xs hover:text-yellow-400"
                        >
                          Revocar
                        </button>
                        <button onClick={() => setRenewMember(member)} className="px-3 py-2 rounded-xl border border-zinc-600 text-zinc-300 text-xs hover:text-green-400">
                          Renovar
                        </button>
                      </>
                    )}
                    <button onClick={() => requestKick(member.membership_id)} className="px-3 py-2 rounded-xl border border-zinc-600 text-zinc-400 text-xs hover:text-red-400">
                      Expulsar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.2} className="glass rounded-3xl p-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <CheckCircleIcon className="w-5 h-5 text-amber-400" />
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
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between bg-zinc-900/50 rounded-xl p-3">
              <div>
                <p className="text-sm font-semibold text-white">{plan.name}</p>
                <p className="text-xs text-zinc-500">{plan.duration_days} días · ${plan.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className={`w-4 h-4 ${plan.is_active ? "text-green-500" : "text-zinc-600"}`} />
                <button onClick={() => requestRemovePlan(plan.id)} className="text-xs text-zinc-400 hover:text-red-400">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-2">No hay planes todavía.</p>
          )}
        </div>
      </FadeIn>

      <ConfirmModal
        open={confirm !== null}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        busy={busy}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />

      {renewMember?.subscription && (
        <RenewSubModal
          open={renewMember !== null}
          slug={slug}
          plans={plans}
          member={renewMember}
          onClose={() => setRenewMember(null)}
          onRenewed={handleRenewMember}
        />
      )}
    </div>
  );
}

function AthletesSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Skeleton className="h-10 w-40" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}