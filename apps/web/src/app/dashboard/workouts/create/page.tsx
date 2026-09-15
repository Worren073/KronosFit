"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { saveRoutine, updateRoutine, getRoutine, ApiError } from "@/lib/api";
import type { Routine, RoutineDay, RoutineExercise } from "@/lib/types";

const EMPTY_EXERCISE: RoutineExercise = {
  name: "",
  sets: 3,
  reps: 10,
  rest_seconds: 60,
  notes: "",
};

const EMPTY_DAY: RoutineDay = {
  day_name: "",
  muscle_groups: "",
  exercises: [{ ...EMPTY_EXERCISE }],
};

export default function CreateRoutinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routineIdParam = searchParams.get("routineId");
  const routineId = routineIdParam ? Number(routineIdParam) : null;
  const isEdit = routineId !== null;

  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [duration, setDuration] = useState(60);
  const [days, setDays] = useState<RoutineDay[]>([{ ...EMPTY_DAY, exercises: [{ ...EMPTY_EXERCISE }] }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!routineId) return;
    getRoutine(routineId)
      .then((r) => {
        setName(r.name);
        setFocus(r.focus);
        setDaysPerWeek(r.days_per_week);
        setDuration(r.estimated_duration_minutes);
        setDays(
          r.days.length > 0
            ? r.days.map((d) => ({
                ...d,
                exercises: d.exercises.map((e) => ({ ...e })),
              }))
            : [{ ...EMPTY_DAY, exercises: [{ ...EMPTY_EXERCISE }] }]
        );
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError("No se pudo cargar la rutina.");
        }
      })
      .finally(() => setLoading(false));
  }, [routineId]);

  const updateDay = (index: number, updates: Partial<RoutineDay>) => {
    setDays((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const updateExercise = (dayIndex: number, exIndex: number, updates: Partial<RoutineExercise>) => {
    setDays((prev) => {
      const next = [...prev];
      const exercises = [...next[dayIndex].exercises];
      exercises[exIndex] = { ...exercises[exIndex], ...updates };
      next[dayIndex] = { ...next[dayIndex], exercises };
      return next;
    });
  };

  const addDay = () => {
    setDays((prev) => [...prev, { ...EMPTY_DAY, exercises: [{ ...EMPTY_EXERCISE }] }]);
  };

  const removeDay = (index: number) => {
    setDays((prev) => prev.filter((_, i) => i !== index));
  };

  const addExercise = (dayIndex: number) => {
    setDays((prev) => {
      const next = [...prev];
      next[dayIndex] = {
        ...next[dayIndex],
        exercises: [...next[dayIndex].exercises, { ...EMPTY_EXERCISE }],
      };
      return next;
    });
  };

  const removeExercise = (dayIndex: number, exIndex: number) => {
    setDays((prev) => {
      const next = [...prev];
      next[dayIndex] = {
        ...next[dayIndex],
        exercises: next[dayIndex].exercises.filter((_, i) => i !== exIndex),
      };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || days.length === 0) {
      setError("El nombre y al menos un día son obligatorios.");
      return;
    }

    const hasEmptyDay = days.some((d) => !d.day_name.trim());
    if (hasEmptyDay) {
      setError("Todos los días deben tener nombre.");
      return;
    }

    const hasEmptyExercise = days.some((d) =>
      d.exercises.some((ex) => !ex.name.trim())
    );
    if (hasEmptyExercise) {
      setError("Todos los ejercicios deben tener nombre.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Routine = {
      name: name.trim(),
      focus: focus.trim(),
      days_per_week: daysPerWeek,
      estimated_duration_minutes: duration,
      days: days.map((d, i) => ({
        ...d,
        order: i,
        exercises: d.exercises.map((ex, j) => ({
          ...ex,
          order: j,
          weight: ex.weight ?? null,
        })),
      })),
    };

    try {
      if (isEdit) {
        await updateRoutine(routineId!, payload);
      } else {
        await saveRoutine(payload);
      }
      router.push("/dashboard/workouts");
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      setError(detail || "No se pudo guardar la rutina. Verificá los datos.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/workouts")}
            className="p-2 rounded-xl hover:bg-white/5 text-zinc-300"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Rutina no encontrada</h1>
        </div>
        <div className="glass rounded-3xl p-8 text-center space-y-4">
          <p className="text-zinc-400">Esta rutina no existe o fue eliminada.</p>
          <Link
            href="/dashboard/workouts"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gold-gradient text-black font-bold"
          >
            Volver a mis planes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/workouts")}
          className="p-2 rounded-xl hover:bg-white/5 text-zinc-300"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? "Editar rutina" : "Crear rutina"}
        </h1>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 border border-red-500/30">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass rounded-3xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Datos generales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-left">
              <label className="block text-zinc-400 text-sm mb-1">Nombre</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input w-full"
                placeholder="Mi rutina"
                required
              />
            </div>
            <div className="text-left">
              <label className="block text-zinc-400 text-sm mb-1">Enfoque</label>
              <input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="input w-full"
                placeholder="Fuerza, hipertrofia..."
              />
            </div>
            <div className="text-left">
              <label className="block text-zinc-400 text-sm mb-1">Días por semana</label>
              <input
                type="number"
                min={1}
                max={7}
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="input w-full"
                required
              />
            </div>
            <div className="text-left">
              <label className="block text-zinc-400 text-sm mb-1">Duración estimada (min)</label>
              <input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="input w-full"
                required
              />
            </div>
          </div>
        </div>

        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={day.day_name}
                  onChange={(e) => updateDay(dayIndex, { day_name: e.target.value })}
                  className="input w-full"
                  placeholder="Nombre del día (ej: Lunes)"
                  required
                />
                <input
                  value={day.muscle_groups}
                  onChange={(e) => updateDay(dayIndex, { muscle_groups: e.target.value })}
                  className="input w-full"
                  placeholder="Grupos musculares"
                />
              </div>
              {days.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDay(dayIndex)}
                  className="p-2 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-white/5"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {day.exercises.map((exercise, exIndex) => (
                <div
                  key={exIndex}
                  className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center md:items-end bg-zinc-900/50 rounded-xl p-3"
                >
                  <div className="col-span-2 md:col-span-4 text-left">
                    <label className="block text-zinc-500 text-xs mb-1">Ejercicio</label>
                    <input
                      value={exercise.name}
                      onChange={(e) => updateExercise(dayIndex, exIndex, { name: e.target.value })}
                      className="input w-full"
                      required
                    />
                  </div>
                  <div className="text-left">
                    <label className="block text-zinc-500 text-xs mb-1">Series</label>
                    <input
                      type="number"
                      min={1}
                      value={exercise.sets}
                      onChange={(e) => updateExercise(dayIndex, exIndex, { sets: Number(e.target.value) })}
                      className="input w-full"
                    />
                  </div>
                  <div className="text-left">
                    <label className="block text-zinc-500 text-xs mb-1">Repeticiones</label>
                    <input
                      type="number"
                      min={1}
                      value={exercise.reps}
                      onChange={(e) => updateExercise(dayIndex, exIndex, { reps: Number(e.target.value) })}
                      className="input w-full"
                    />
                  </div>
                  <div className="text-left">
                    <label className="block text-zinc-500 text-xs mb-1">Descanso (seg)</label>
                    <input
                      type="number"
                      min={0}
                      value={exercise.rest_seconds}
                      onChange={(e) => updateExercise(dayIndex, exIndex, { rest_seconds: Number(e.target.value) })}
                      className="input w-full"
                    />
                  </div>
                  <div className="flex items-center justify-center col-span-2 md:col-span-2">
                    <button
                      type="button"
                      onClick={() => removeExercise(dayIndex, exIndex)}
                      className="p-2 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-white/5"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addExercise(dayIndex)}
                className="w-full py-2 rounded-xl border border-dashed border-zinc-600 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 text-sm flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Agregar ejercicio
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addDay}
          className="w-full py-3 rounded-xl border border-dashed border-amber-500/30 text-amber-400 hover:bg-amber-500/5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Agregar día
        </button>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 disabled:opacity-70 transition-opacity"
          >
            {saving ? (
              "Guardando..."
            ) : (
              <>
                <CheckIcon className="w-5 h-5" />
                {isEdit ? "Guardar cambios" : "Crear rutina"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
