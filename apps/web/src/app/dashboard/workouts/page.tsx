"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FireIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  PlayIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  createWorkout,
  updateWorkout,
  deleteWorkout,
  getExercises,
  createExercise,
  deleteExercise,
  startWorkoutFromRoutineDay,
} from "@/lib/api";
import { useDashboardStore } from "@/stores/dashboardStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";
import type { Workout, Exercise, Routine, RoutineDay } from "@/lib/types";

const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
];

function normalizeDay(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

export default function WorkoutsPage() {
  const router = useRouter();
  const {
    workouts,
    workoutsInitialized,
    workoutsLoading,
    fetchWorkouts,
    routines,
    routinesInitialized,
    routinesLoading,
    fetchRoutines,
  } = useDashboardStore();
  const ready = useMinimumSkeleton(500);
  const [tab, setTab] = useState<'workouts' | 'plan'>('plan');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Workout | null>(null);
  const [form, setForm] = useState({ name: "", duration_minutes: "", calories_burned: "", notes: "" });
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!workoutsInitialized) fetchWorkouts();
  }, [workoutsInitialized, fetchWorkouts]);

  useEffect(() => {
    if (!routinesInitialized) fetchRoutines();
  }, [routinesInitialized, fetchRoutines]);

  const resetForm = () => {
    setForm({ name: "", duration_minutes: "", calories_burned: "", notes: "" });
    setEditing(null);
    setFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      duration_minutes: Number(form.duration_minutes),
      calories_burned: form.calories_burned ? Number(form.calories_burned) : null,
      notes: form.notes,
    };
    if (editing) {
      await updateWorkout(editing.id, data);
    } else {
      await createWorkout(data);
    }
    resetForm();
    fetchWorkouts();
  };

  const handleEdit = (w: Workout) => {
    setEditing(w);
    setForm({
      name: w.name,
      duration_minutes: String(w.duration_minutes),
      calories_burned: w.calories_burned ? String(w.calories_burned) : "",
      notes: w.notes,
    });
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este entrenamiento?")) return;
    await deleteWorkout(id);
    fetchWorkouts();
  };

  if (!ready || !workoutsInitialized || !routinesInitialized) {
    return <WorkoutsSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FireIcon className="w-8 h-8 text-amber-400" />
            Entrenamientos
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/workouts/generate"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <SparklesIcon className="w-5 h-5" />
              Generar con IA
            </Link>
            {tab === 'workouts' && (
              <button
                onClick={() => setFormOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
              >
                <PlusIcon className="w-5 h-5" />
                Nuevo
              </button>
            )}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="flex p-1 rounded-2xl bg-zinc-900/50 border border-zinc-800">
          <button
            onClick={() => setTab('plan')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'plan'
                ? 'gold-gradient text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ClipboardDocumentListIcon className="w-4 h-4" />
            Plan
          </button>
          <button
            onClick={() => setTab('workouts')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'workouts'
                ? 'gold-gradient text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FireIcon className="w-4 h-4" />
            Entrenamientos
          </button>
        </div>
      </FadeIn>

      <AnimatePresence mode="wait">
        {tab === 'workouts' ? (
          <motion.div
            key="workouts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <AnimatePresence>
              {formOpen && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="glass rounded-3xl p-6 space-y-4 overflow-hidden"
                >
                  <h2 className="text-xl font-bold text-amber-400">
                    {editing ? "Editar entrenamiento" : "Nuevo entrenamiento"}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      placeholder="Nombre"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input"
                      required
                    />
                    <input
                      placeholder="Duración (min)"
                      type="number"
                      value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                      className="input"
                      required
                    />
                    <input
                      placeholder="Calorías quemadas"
                      type="number"
                      value={form.calories_burned}
                      onChange={(e) => setForm({ ...form, calories_burned: e.target.value })}
                      className="input"
                    />
                    <input
                      placeholder="Notas"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="px-6 py-2 rounded-xl gold-gradient text-black font-bold">
                      Guardar
                    </button>
                    <button type="button" onClick={resetForm} className="px-6 py-2 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-white/5">
                      Cancelar
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {workoutsLoading && workouts.length > 0 && (
              <div className="flex justify-end">
                <span className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              </div>
            )}

            <div className="space-y-4">
              {workouts.map((w, i) => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  delay={i * 0.05}
                  expanded={expanded === w.id}
                  onToggle={() => setExpanded(expanded === w.id ? null : w.id)}
                  onEdit={() => handleEdit(w)}
                  onDelete={() => handleDelete(w.id)}
                />
              ))}
              {workouts.length === 0 && (
                <p className="text-zinc-500 text-center py-12">No tenes entrenamientos registrados.</p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="plan"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {routinesLoading && routines.length > 0 && (
              <div className="flex justify-end">
                <span className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              </div>
            )}
            {routines.length === 0 ? (
              <div className="glass rounded-3xl p-8 text-center space-y-4">
                <p className="text-zinc-400">No tenes un plan de entrenamiento.</p>
                <Link
                  href="/dashboard/workouts/generate"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gold-gradient text-black font-bold"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Generar con IA
                </Link>
              </div>
            ) : (
              routines.map((routine) => (
                <RoutineCard key={routine.id} routine={routine} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoutineCard({ routine }: { routine: Routine }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <FadeIn>
      <div className="glass rounded-3xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div>
            <h3 className="text-lg font-bold text-white">{routine.name}</h3>
            <p className="text-zinc-400 text-sm">
              {routine.focus} · {routine.days_per_week} días/semana · {routine.estimated_duration_minutes} min
            </p>
          </div>
          {expanded ? <ChevronUpIcon className="w-5 h-5 text-zinc-400" /> : <ChevronDownIcon className="w-5 h-5 text-zinc-400" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-zinc-800"
            >
              <div className="p-5 space-y-3">
                {routine.days.map((day) => (
                  <DayRow key={day.id} day={day} routineId={routine.id!} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FadeIn>
  );
}

function DayRow({ day, routineId }: { day: RoutineDay; routineId: number }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const todayName = DAY_NAMES[new Date().getDay()];
  const isToday = normalizeDay(day.day_name) === normalizeDay(todayName);

  const handleStart = async () => {
    if (!day.id) return;
    setStarting(true);
    try {
      const workout = await startWorkoutFromRoutineDay(routineId, day.id);
      router.push(`/dashboard/workouts/session?workoutId=${workout.id}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 ${isToday ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-zinc-900/50'}`}>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="text-white font-bold">{day.day_name}</h4>
          {isToday && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase">Hoy</span>}
        </div>
        <p className="text-zinc-400 text-sm">{day.muscle_groups}</p>
        <p className="text-zinc-500 text-xs mt-1">
          {day.exercises.length} ejercicios · <ClockIcon className="w-3 h-3 inline" /> {day.exercises.reduce((acc, ex) => acc + (ex.rest_seconds || 0) * (ex.sets || 0), 0) / 60} min aprox
        </p>
      </div>
      <button
        onClick={handleStart}
        disabled={starting}
        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90 disabled:opacity-70 transition-opacity"
      >
        <PlayIcon className="w-4 h-4" />
        {starting ? 'Preparando...' : 'Empezar'}
      </button>
    </div>
  );
}

function WorkoutCard({
  workout,
  delay,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  workout: Workout;
  delay: number;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <FadeIn delay={delay}>
      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <button onClick={onToggle} className="flex-1 text-left">
            <h3 className="text-lg font-bold text-white">{workout.name}</h3>
            <p className="text-zinc-400 text-sm">
              {new Date(workout.date).toLocaleDateString("es-ES")} · {workout.duration_minutes} min
              {workout.calories_burned ? ` · ${workout.calories_burned} kcal` : ""}
            </p>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-2 rounded-xl hover:bg-white/5 text-zinc-300">
              <PencilIcon className="w-5 h-5" />
            </button>
            <button onClick={onDelete} className="p-2 rounded-xl hover:bg-red-500/10 text-zinc-300 hover:text-red-400">
              <TrashIcon className="w-5 h-5" />
            </button>
            <button onClick={onToggle} className="p-2 rounded-xl hover:bg-white/5 text-zinc-300">
              {expanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {expanded && <ExercisesList workoutId={workout.id} />}
        </AnimatePresence>
      </div>
    </FadeIn>
  );
}

function ExercisesList({ workoutId }: { workoutId: number }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState({ name: "", sets: "", reps: "", weight: "" });

  const load = () => getExercises(workoutId).then(setExercises);

  useEffect(() => {
    load();
  }, [workoutId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createExercise(workoutId, {
      name: form.name,
      sets: Number(form.sets),
      reps: Number(form.reps),
      weight: form.weight ? Number(form.weight) : null,
    });
    setForm({ name: "", sets: "", reps: "", weight: "" });
    load();
  };

  const handleDelete = async (id: number) => {
    await deleteExercise(workoutId, id);
    load();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      style={{ opacity: 0 }}
      className="mt-4 pt-4 border-t border-amber-500/10 space-y-4"
    >
      <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">Ejercicios</h4>
      {exercises.map((ex) => (
        <div key={ex.id} className="flex items-center justify-between bg-zinc-900/50 rounded-xl p-3">
          <div>
            <p className="text-white font-medium">{ex.name}</p>
            <p className="text-zinc-400 text-sm">{ex.sets} series x {ex.reps} reps{ex.weight ? ` · ${ex.weight} kg` : ""}</p>
          </div>
          <button onClick={() => handleDelete(ex.id)} className="p-2 text-zinc-500 hover:text-red-400">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
      <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <input placeholder="Ejercicio" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input col-span-2" required />
        <input placeholder="Series" type="number" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} className="input" required />
        <input placeholder="Reps" type="number" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} className="input" required />
        <input placeholder="Peso" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="input" />
        <button type="submit" className="col-span-2 md:col-span-5 py-2 rounded-xl gold-gradient text-black font-bold text-sm">Agregar ejercicio</button>
      </form>
    </motion.div>
  );
}

function WorkoutsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
