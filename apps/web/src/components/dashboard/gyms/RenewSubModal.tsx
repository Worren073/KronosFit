"use client";

import { useEffect, useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { updateGymSubscription } from "@/lib/api";
import { FadeIn } from "@/components/ui/FadeIn";
import type { GymPlan, MemberSummary } from "@/lib/types";

interface RenewSubModalProps {
  open: boolean;
  slug: string;
  plans: GymPlan[];
  member: MemberSummary;
  onClose: () => void;
  onRenewed: () => void;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export function RenewSubModal({
  open,
  slug,
  plans,
  member,
  onClose,
  onRenewed,
}: RenewSubModalProps) {
  const currentPlan = member.subscription?.plan ?? null;

  const [selectedPlan, setSelectedPlan] = useState<string>(() =>
    currentPlan ? String(currentPlan.id) : "free"
  );
  const [months, setMonths] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedPlan(currentPlan ? String(currentPlan.id) : "free");
    setMonths(1);
    setError("");
    setBusy(false);
  }, [open, currentPlan]);

  if (!open || !member.subscription) return null;

  const resolvedPlan = selectedPlan === "free"
    ? null
    : plans.find((p) => String(p.id) === selectedPlan) ?? null;

  const daysPerMonth = resolvedPlan?.duration_days ?? 30;
  const pricePerMonth = resolvedPlan ? Number(resolvedPlan.price) : 0;
  const totalDays = daysPerMonth * months;
  const totalPrice = pricePerMonth * months;

  const handleRenew = async () => {
    setBusy(true);
    setError("");
    try {
      await updateGymSubscription(
        slug,
        member.subscription!.id,
        "renew",
        totalDays,
        selectedPlan === "free" ? null : Number(selectedPlan)
      );
      onRenewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo renovar");
    } finally {
      setBusy(false);
    }
  };

  const activePlans = plans.filter(
    (p) => p.is_active && String(p.id) !== (currentPlan ? String(currentPlan.id) : "__none__")
  );

  const fmt = (n: number) =>
    n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

  return (
    <FadeIn className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass rounded-3xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-white mb-1">
          Renovar mensualidad
        </h2>
        <p className="text-sm text-zinc-400 mb-5">
          {member.user.first_name || member.user.username}{" "}
          {member.user.last_name || ""}
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="text-left">
            <label className="block text-zinc-400 text-sm mb-1">Plan</label>
            <select
              className="input w-full"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
            >
              {!currentPlan && (
                <option value="free">Plan libre (30 días, $0)</option>
              )}
              {currentPlan && (
                <option value={String(currentPlan.id)}>
                  Actual: {currentPlan.name} ({currentPlan.duration_days}d) — ${currentPlan.price}
                </option>
              )}
              {activePlans.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name} ({p.duration_days}d) — ${p.price}
                </option>
              ))}
            </select>
          </div>

          <div className="text-left">
            <label className="block text-zinc-400 text-sm mb-1">Meses</label>
            <select
              className="input w-full"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} {m === 1 ? "mes" : "meses"} — {m * daysPerMonth} días
                </option>
              ))}
            </select>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-zinc-400">Precio por mes</span>
              <span className="text-white font-semibold">{fmt(pricePerMonth)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-zinc-400">Meses</span>
              <span className="text-white font-semibold">{months}</span>
            </div>
            <div className="border-t border-zinc-800 mt-2 pt-2 flex items-center justify-between">
              <span className="text-zinc-300 font-semibold text-sm">Total a pagar</span>
              <span className="text-amber-400 font-black text-lg">{fmt(totalPrice)}</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 text-right">
              {totalDays} días de acceso
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-white/5 text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRenew}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90 disabled:opacity-70"
            >
              <ArrowPathIcon className="w-4 h-4" />
              {busy ? "Renovando..." : `Renovar · ${fmt(totalPrice)}`}
            </button>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}