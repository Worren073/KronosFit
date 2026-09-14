"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CakeIcon,
  BeakerIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import {
  createMeal,
  updateMeal,
  deleteMeal,
  createWaterIntake,
  deleteWaterIntake,
  getMeals,
  getWaterIntakes,
  getMealSummary,
  ApiError,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";
import type { Meal, WaterIntake, MealSummary } from "@/lib/types";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function parseDate(raw: string | null): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return todayStr();
}

export default function NutritionPage() {
  return (
    <Suspense fallback={<NutritionSkeleton />}>
      <NutritionContent />
    </Suspense>
  );
}

function NutritionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ready = useMinimumSkeleton(500);

  const [date, setDate] = useState(() => parseDate(searchParams.get("date")));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [water, setWater] = useState<WaterIntake[]>([]);
  const [summary, setSummary] = useState<MealSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const [mealFormOpen, setMealFormOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [mealForm, setMealForm] = useState({ name: "", calories: "", protein_grams: "", carbs_grams: "", fat_grams: "" });
  const [mealError, setMealError] = useState("");
  const [waterForm, setWaterForm] = useState({ milliliters: "250" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getMeals({ date_from: date, date_to: date }),
      getWaterIntakes({ date_from: date, date_to: date }),
      getMealSummary(date),
    ])
      .then(([mealData, waterData, summaryData]) => {
        if (!active) return;
        setMeals(mealData);
        setWater(waterData);
        setSummary(summaryData);
        setInitialized(true);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date]);

  const handleDateChange = (value: string) => {
    setDate(value);
    router.replace(`/dashboard/nutrition?date=${value}`);
  };

  const resetMealForm = () => {
    setMealForm({ name: "", calories: "", protein_grams: "", carbs_grams: "", fat_grams: "" });
    setMealError("");
    setEditingMeal(null);
    setMealFormOpen(false);
  };

  const handleMealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMealError("");
    const data = {
      name: mealForm.name,
      date,
      calories: Number(mealForm.calories),
      protein_grams: Number(mealForm.protein_grams) || 0,
      carbs_grams: Number(mealForm.carbs_grams) || 0,
      fat_grams: Number(mealForm.fat_grams) || 0,
    };
    try {
      if (editingMeal) {
        await updateMeal(editingMeal.id, data);
      } else {
        await createMeal(data);
      }
    } catch (err) {
      if (err instanceof ApiError && typeof err.data.detail === "string") {
        setMealError(err.data.detail);
      } else if (err instanceof ApiError && typeof err.data?.protein_grams === "string") {
        setMealError(err.data.protein_grams);
      } else {
        setMealError("No se pudo guardar la comida.");
      }
      return;
    }
    resetMealForm();
    reloadDay(date);
  };

  const handleEditMeal = (m: Meal) => {
    setEditingMeal(m);
    setMealForm({
      name: m.name,
      calories: String(m.calories),
      protein_grams: String(m.protein_grams),
      carbs_grams: String(m.carbs_grams),
      fat_grams: String(m.fat_grams),
    });
    setMealFormOpen(true);
  };

  const handleDeleteMeal = async (id: number) => {
    if (!confirm("¿Eliminar esta comida?")) return;
    await deleteMeal(id);
    reloadDay(date);
  };

  const handleAddWater = async (e: React.FormEvent) => {
    e.preventDefault();
    await createWaterIntake({ date, milliliters: Number(waterForm.milliliters) });
    setWaterForm({ milliliters: "250" });
    reloadDay(date);
  };

  const handleDeleteWater = async (id: number) => {
    await deleteWaterIntake(id);
    reloadDay(date);
  };

  const reloadDay = (d: string) => {
    Promise.all([
      getMeals({ date_from: d, date_to: d }),
      getWaterIntakes({ date_from: d, date_to: d }),
      getMealSummary(d),
    ]).then(([mealData, waterData, summaryData]) => {
      setMeals(mealData);
      setWater(waterData);
      setSummary(summaryData);
    });
  };

  const totalWater = water.reduce((sum, w) => sum + w.milliliters, 0);

  if (!ready || !initialized) {
    return <NutritionSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <CakeIcon className="w-8 h-8 text-amber-400" />
          Nutrición
        </h1>
      </FadeIn>

      <FadeIn delay={0.03} className="glass rounded-3xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2 text-zinc-300">
          <CalendarDaysIcon className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-bold">Fecha</span>
        </div>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => handleDateChange(e.target.value)}
          className="input flex-1 sm:max-w-xs"
        />
        <button
          type="button"
          onClick={() => handleDateChange(todayStr())}
          className="px-4 py-2 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-white/5 text-sm"
        >
          Hoy
        </button>
        {loading && (
          <span className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        )}
      </FadeIn>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FadeIn delay={0.05} className="glass rounded-3xl p-5">
          <p className="text-zinc-400 text-sm">Calorías</p>
          <p className="text-2xl font-bold text-white mt-1">{summary?.calories || 0} <span className="text-sm font-normal text-zinc-500">kcal</span></p>
        </FadeIn>
        <FadeIn delay={0.1} className="glass rounded-3xl p-5">
          <p className="text-zinc-400 text-sm">Proteínas</p>
          <p className="text-2xl font-bold text-white mt-1">{summary?.protein || 0} <span className="text-sm font-normal text-zinc-500">g</span></p>
        </FadeIn>
        <FadeIn delay={0.15} className="glass rounded-3xl p-5">
          <p className="text-zinc-400 text-sm">Carbohidratos</p>
          <p className="text-2xl font-bold text-white mt-1">{summary?.carbs || 0} <span className="text-sm font-normal text-zinc-500">g</span></p>
        </FadeIn>
        <FadeIn delay={0.2} className="glass rounded-3xl p-5">
          <p className="text-zinc-400 text-sm">Grasas</p>
          <p className="text-2xl font-bold text-white mt-1">{summary?.fat || 0} <span className="text-sm font-normal text-zinc-500">g</span></p>
        </FadeIn>
      </div>

      <FadeIn delay={0.25} className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CakeIcon className="w-6 h-6 text-amber-400" />
            Comidas
          </h2>
          <button
            onClick={() => setMealFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90"
          >
            <PlusIcon className="w-4 h-4" />
            Agregar
          </button>
        </div>

        <AnimatePresence>
          {mealFormOpen && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ opacity: 0 }}
              onSubmit={handleMealSubmit}
              className="mb-4 space-y-3 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input placeholder="Nombre" value={mealForm.name} onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })} className="input" required />
                <input placeholder="Calorías" type="number" value={mealForm.calories} onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })} className="input" required />
                <input placeholder="Proteínas (g)" type="number" value={mealForm.protein_grams} onChange={(e) => setMealForm({ ...mealForm, protein_grams: e.target.value })} className="input" />
                <input placeholder="Carbohidratos (g)" type="number" value={mealForm.carbs_grams} onChange={(e) => setMealForm({ ...mealForm, carbs_grams: e.target.value })} className="input" />
                <input placeholder="Grasas (g)" type="number" value={mealForm.fat_grams} onChange={(e) => setMealForm({ ...mealForm, fat_grams: e.target.value })} className="input" />
              </div>
              {mealError && <p className="text-red-400 text-sm">{mealError}</p>}
              <div className="flex gap-2">
                <button type="submit" className="px-5 py-2 rounded-xl gold-gradient text-black font-bold text-sm">Guardar</button>
                <button type="button" onClick={resetMealForm} className="px-5 py-2 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-white/5 text-sm">Cancelar</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {meals.map((m, i) => (
            <FadeIn key={m.id} delay={0.2 + i * 0.03}>
              <div className="flex items-center justify-between bg-zinc-900/50 rounded-xl p-4">
                <div>
                  <p className="text-white font-medium">{m.name}</p>
                  <p className="text-zinc-400 text-sm">{m.calories} kcal · P {m.protein_grams}g · C {m.carbs_grams}g · G {m.fat_grams}g</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditMeal(m)} className="p-2 rounded-xl hover:bg-white/5 text-zinc-300">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteMeal(m.id)} className="p-2 rounded-xl hover:bg-red-500/10 text-zinc-300 hover:text-red-400">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </FadeIn>
          ))}
          {meals.length === 0 && <p className="text-zinc-500 text-center py-6">No hay comidas registradas esta fecha.</p>}
        </div>
      </FadeIn>

      <FadeIn delay={0.35} className="glass rounded-3xl p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <BeakerIcon className="w-6 h-6 text-blue-400" />
          Agua
        </h2>
        <p className="text-3xl font-bold text-white mb-4">{(totalWater / 1000).toFixed(1)} <span className="text-base font-normal text-zinc-500">L el {date}</span></p>
        <form onSubmit={handleAddWater} className="flex gap-3 mb-4">
          <input
            type="number"
            value={waterForm.milliliters}
            onChange={(e) => setWaterForm({ milliliters: e.target.value })}
            className="input w-32"
            placeholder="ml"
          />
          <button type="submit" className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm">
            + Agregar
          </button>
        </form>
        <div className="space-y-2">
          {water.map((w) => (
            <div key={w.id} className="flex items-center justify-between bg-zinc-900/50 rounded-xl p-3">
              <span className="text-zinc-300">{w.milliliters} ml</span>
              <button onClick={() => handleDeleteWater(w.id)} className="p-2 text-zinc-500 hover:text-red-400">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          {water.length === 0 && <p className="text-zinc-500 text-center py-4">No hay registros de agua en esta fecha.</p>}
        </div>
      </FadeIn>
    </div>
  );
}

function NutritionSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}