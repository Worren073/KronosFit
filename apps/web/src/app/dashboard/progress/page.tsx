"use client";

import { useEffect, useState } from "react";
import { ChartBarIcon, FireIcon, BeakerIcon, ScaleIcon } from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import { createWeightEntry } from "@/lib/api";
import { useDashboardStore } from "@/stores/dashboardStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";

export default function ProgressPage() {
  const { progress, progressInitialized, progressLoading, fetchProgress } = useDashboardStore();
  const ready = useMinimumSkeleton(500);
  const [weightForm, setWeightForm] = useState("");
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightError, setWeightError] = useState("");

  useEffect(() => {
    if (!progressInitialized) fetchProgress();
  }, [progressInitialized, fetchProgress]);

  if (!ready || !progressInitialized) {
    return <ProgressSkeleton />;
  }

  const totals = progress?.totals;

  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weight = Number(weightForm);
    if (!weight || weight <= 0) return;
    setWeightSaving(true);
    setWeightError("");
    try {
      const today = new Date().toISOString().split("T")[0];
      await createWeightEntry(today, weight);
      setWeightForm("");
      await fetchProgress();
    } catch {
      setWeightError("No se pudo registrar el peso.");
    } finally {
      setWeightSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ChartBarIcon className="w-8 h-8 text-amber-400" />
          Progreso
        </h1>
      </FadeIn>

      {progressLoading && progress && (
        <div className="flex justify-end">
          <span className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FireIcon} label="Rutinas" value={totals?.total_workouts || 0} delay={0} />
        <StatCard icon={FireIcon} label="Minutos" value={totals?.total_minutes || 0} delay={0.1} />
        <StatCard icon={BeakerIcon} label="Agua total" value={`${((totals?.total_water_ml || 0) / 1000).toFixed(1)} L`} delay={0.2} />
        <StatCard icon={ScaleIcon} label="Comidas" value={totals?.total_meals || 0} delay={0.3} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Minutos de entrenamiento" delay={0.4}>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={progress?.workouts || []}>
              <defs>
                <linearGradient id="progDuration" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#D4AF37" }}
              />
              <Area type="monotone" dataKey="duration" stroke="#D4AF37" fill="url(#progDuration)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Calorías diarias" delay={0.5}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={progress?.nutrition || []}>
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#D4AF37" }}
              />
              <Bar dataKey="calories" fill="#D4AF37" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Agua diaria" delay={0.6}>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={progress?.nutrition || []}>
              <defs>
                <linearGradient id="progWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#3b82f6" }}
              />
              <Area type="monotone" dataKey="water" stroke="#3b82f6" fill="url(#progWater)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Macronutrientes" delay={0.7}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={progress?.nutrition || []}>
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Line type="monotone" dataKey="protein" stroke="#D4AF37" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="carbs" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="fat" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <FadeIn delay={0.8} className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-300">Evolución del peso</h3>
        </div>
        <form onSubmit={handleWeightSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <input
              type="number"
              step="0.1"
              min="1"
              value={weightForm}
              onChange={(e) => setWeightForm(e.target.value)}
              placeholder="Peso hoy (kg)"
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={weightSaving}
            className="px-5 py-2 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {weightSaving ? "Guardando..." : "Registrar peso"}
          </button>
          {weightError && <p className="text-red-400 text-sm">{weightError}</p>}
        </form>
        {progress?.weight && progress.weight.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={progress.weight}>
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#D4AF37" }}
              />
              <Line type="monotone" dataKey="weight" stroke="#D4AF37" strokeWidth={2} connectNulls dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-zinc-500 text-center py-6">Registrá tu peso para ver la evolución.</p>
        )}
      </FadeIn>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  delay: number;
}) {
  return (
    <FadeIn delay={delay} className="glass rounded-3xl p-5 text-center">
      <Icon className="w-6 h-6 text-amber-400 mx-auto mb-2" />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-zinc-400 text-sm">{label}</p>
    </FadeIn>
  );
}

function ChartCard({ title, children, delay }: { title: string; children: React.ReactNode; delay: number }) {
  return (
    <FadeIn delay={delay} className="glass rounded-3xl p-5">
      <h3 className="text-sm font-bold text-zinc-300 mb-4">{title}</h3>
      {children}
    </FadeIn>
  );
}

function ProgressSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-10 w-40" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}
