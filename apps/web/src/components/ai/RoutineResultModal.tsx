"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { saveRoutine } from "@/lib/api";
import type { Routine, RoutineDay, RoutineExercise } from "@/lib/types";

interface RoutineResultModalProps {
  routine: Routine | null;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}

export function RoutineResultModal({ routine, isOpen, onClose, onRegenerate }: RoutineResultModalProps) {
  const [editable, setEditable] = useState<Routine | null>(routine);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEditable(routine);
  }, [routine]);

  if (!isOpen || !editable) return null;

  const updateRoutine = (updates: Partial<Routine>) => {
    setEditable((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const updateDay = (index: number, updates: Partial<RoutineDay>) => {
    setEditable((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      days[index] = { ...days[index], ...updates };
      return { ...prev, days };
    });
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, updates: Partial<RoutineExercise>) => {
    setEditable((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      const exercises = [...days[dayIndex].exercises];
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], ...updates };
      days[dayIndex] = { ...days[dayIndex], exercises };
      return { ...prev, days };
    });
  };

  const addExercise = (dayIndex: number) => {
    setEditable((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      days[dayIndex].exercises = [
        ...days[dayIndex].exercises,
        { name: "Nuevo ejercicio", sets: 3, reps: 10, rest_seconds: 60, notes: "" },
      ];
      return { ...prev, days };
    });
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    setEditable((prev) => {
      if (!prev) return prev;
      const days = [...prev.days];
      days[dayIndex].exercises = days[dayIndex].exercises.filter((_, i) => i !== exerciseIndex);
      return { ...prev, days };
    });
  };

  const addDay = () => {
    setEditable((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: [
          ...prev.days,
          { day_name: "Nuevo día", muscle_groups: "", exercises: [{ name: "Nuevo ejercicio", sets: 3, reps: 10, rest_seconds: 60, notes: "" }] },
        ],
      };
    });
  };

  const removeDay = (index: number) => {
    setEditable((prev) => {
      if (!prev) return prev;
      return { ...prev, days: prev.days.filter((_, i) => i !== index) };
    });
  };

  const handleSave = async () => {
    if (!editable) return;
    setSaving(true);
    try {
      await saveRoutine(editable);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error guardando la rutina");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-auto my-8 max-w-4xl w-[calc(100%-2rem)] glass rounded-3xl border border-amber-500/20 p-6"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/5 text-zinc-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl gold-gradient">
                  <SparklesIcon className="w-6 h-6 text-black" />
                </div>
                <div className="flex-1">
                  <input
                    value={editable.name}
                    onChange={(e) => updateRoutine({ name: e.target.value })}
                    className="text-2xl md:text-3xl font-bold bg-transparent border-b border-transparent hover:border-amber-500/30 focus:border-amber-400 focus:outline-none text-white w-full"
                  />
                  <input
                    value={editable.focus}
                    onChange={(e) => updateRoutine({ focus: e.target.value })}
                    className="text-zinc-400 bg-transparent border-b border-transparent hover:border-amber-500/30 focus:border-amber-400 focus:outline-none w-full mt-1"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                <span className="glass px-3 py-1 rounded-full">{editable.days_per_week} días/semana</span>
                <span className="glass px-3 py-1 rounded-full">~{editable.estimated_duration_minutes} min/sesión</span>
              </div>

              <div className="space-y-6">
                {editable.days.map((day, dayIndex) => (
                  <div key={dayIndex} className="glass rounded-2xl p-5 border border-amber-500/10">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                      <input
                        value={day.day_name}
                        onChange={(e) => updateDay(dayIndex, { day_name: e.target.value })}
                        className="text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-amber-500/30 focus:border-amber-400 focus:outline-none"
                      />
                      <input
                        value={day.muscle_groups}
                        onChange={(e) => updateDay(dayIndex, { muscle_groups: e.target.value })}
                        placeholder="Grupos musculares"
                        className="text-sm text-amber-400 bg-transparent border-b border-transparent hover:border-amber-500/30 focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        onClick={() => removeDay(dayIndex)}
                        className="md:ml-auto p-2 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-white/5"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {day.exercises.map((exercise, exerciseIndex) => (
                        <div
                          key={exerciseIndex}
                          className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-zinc-900/50 rounded-xl p-3"
                        >
                          <input
                            value={exercise.name}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, { name: e.target.value })}
                            className="md:col-span-4 input py-2"
                            placeholder="Ejercicio"
                          />
                          <input
                            type="number"
                            value={exercise.sets}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, { sets: Number(e.target.value) })}
                            className="md:col-span-2 input py-2"
                            placeholder="Series"
                          />
                          <input
                            type="number"
                            value={exercise.reps}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, { reps: Number(e.target.value) })}
                            className="md:col-span-2 input py-2"
                            placeholder="Reps"
                          />
                          <input
                            type="number"
                            value={exercise.rest_seconds}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, { rest_seconds: Number(e.target.value) })}
                            className="md:col-span-2 input py-2"
                            placeholder="Descanso (s)"
                          />
                          <button
                            onClick={() => removeExercise(dayIndex, exerciseIndex)}
                            className="md:col-span-2 p-2 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-white/5"
                          >
                            <TrashIcon className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      ))}
                      <button
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
                  onClick={addDay}
                  className="w-full py-3 rounded-xl border border-dashed border-amber-500/30 text-amber-400 hover:bg-amber-500/5 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Agregar día
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-amber-500/10">
                <button
                  onClick={onRegenerate}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-white/5"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Regenerar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-xl gold-gradient text-black font-bold disabled:opacity-70"
                >
                  {saved ? <CheckIcon className="w-5 h-5" /> : <PencilIcon className="w-5 h-5" />}
                  {saved ? "Guardada" : saving ? "Guardando..." : "Guardar rutina"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
