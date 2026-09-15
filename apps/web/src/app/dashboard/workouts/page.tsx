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
  UserIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  PlayIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  deleteRoutine,
  getExercises,
  startWorkoutFromRoutineDay,
} from "@/lib/api";
import { useDashboardStore } from "@/stores/dashboardStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";
import { useActiveWorkout } from "@/hooks/useActiveWorkout";
import { ResumeWorkoutCard } from "@/components/workouts/ResumeWorkoutCard";
import { StartSessionModal } from "@/components/workouts/StartSessionModal";
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
  const [expanded, setExpanded] = useState<number | null>(null);
  const { activeWorkout, refresh: refreshActive } = useActiveWorkout();
  const [pendingStart, setPendingStart] = useState<{ routineId: number; dayId: number } | null>(null);
  const [starting, setStarting] = useState(false);

  const startSession = async (routineId: number, dayId: number, force = false) => {
    setStarting(true);
    try {
      const workout = await startWorkoutFromRoutineDay(routineId, dayId, force);
      router.push(`/dashboard/workouts/session?workoutId=${workout.id}`);
    } catch {
      alert("No se pudo iniciar la sesión. La rutina o el día ya no existen.");
      fetchRoutines();
    } finally {
      setStarting(false);
      setPendingStart(null);
    }
  };

  const requestStart = (routineId: number, dayId: number, dayPk?: number) => {
    if (!dayPk) return;
    if (activeWorkout) {
      setPendingStart({ routineId, dayId: dayPk });
    } else {
      startSession(routineId, dayPk);
    }
  };

  useEffect(() => {
    if (!workoutsInitialized) fetchWorkouts();
  }, [workoutsInitialized, fetchWorkouts]);

  useEffect(() => {
    if (!routinesInitialized) fetchRoutines();
  }, [routinesInitialized, fetchRoutines]);

  const routinesMaxed = routines.length >= 5;

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
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{routines.length}/5</span>
            {routinesMaxed ? (
              <>
                <button
                  disabled
                  title="Alcanzaste el límite de 5 rutinas"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl gold-gradient text-black font-bold opacity-50 cursor-not-allowed"
                >
                  <PlusIcon className="w-5 h-5" />
                  Crear plan
                </button>
                <button
                  disabled
                  title="Alcanzaste el límite de 5 rutinas"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/30 text-amber-400 opacity-50 cursor-not-allowed"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Generar con IA
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard/workouts/create"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
                >
                  <PlusIcon className="w-5 h-5" />
                  Crear plan
                </Link>
                <Link
                  href="/dashboard/workouts/generate"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Generar con IA
                </Link>
              </>
            )}
          </div>
        </div>
      </FadeIn>

      {activeWorkout && (
        <FadeIn delay={0.02}>
          <ResumeWorkoutCard workout={activeWorkout} />
        </FadeIn>
      )}

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
              {workoutsLoading && workouts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-end"
                >
                  <span className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {workouts.filter((w) => w.status === 'finished').map((w, i) => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  delay={i * 0.05}
                  expanded={expanded === w.id}
                  onToggle={() => setExpanded(expanded === w.id ? null : w.id)}
                />
              ))}
              {workouts.filter((w) => w.status === 'finished').length === 0 && (
                <p className="text-zinc-500 text-center py-12">No tenes entrenamientos completados.</p>
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
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/dashboard/workouts/create"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gold-gradient text-black font-bold"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Crear plan manual
                  </Link>
                  <Link
                    href="/dashboard/workouts/generate"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    <SparklesIcon className="w-5 h-5" />
                    Generar con IA
                  </Link>
                </div>
              </div>
            ) : (
              routines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onStartDay={requestStart}
                  busy={starting}
                  onDeleted={() => fetchRoutines()}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {pendingStart && activeWorkout && (
        <StartSessionModal
          activeWorkout={activeWorkout}
          busy={starting}
          onStartNew={() => startSession(pendingStart.routineId, pendingStart.dayId, true)}
          onResume={() => router.push(`/dashboard/workouts/session?workoutId=${activeWorkout.id}`)}
        />
      )}
    </div>
  );
}

function RoutineCard({
  routine,
  onStartDay,
  busy,
  onDeleted,
}: {
  routine: Routine;
  onStartDay: (routineId: number, dayId: number) => void;
  busy: boolean;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(false);
    try {
      await deleteRoutine(routine.id!);
      onDeleted();
    } catch {
      setDeleteError(true);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  const sourceBadge = () => {
    switch (routine.source) {
      case "ai":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold">
            <SparklesIcon className="w-3 h-3" />
            IA
          </span>
        );
      case "trainer":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
            <AcademicCapIcon className="w-3 h-3" />
            Entrenador
          </span>
        );
      case "self":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
            <UserIcon className="w-3 h-3" />
            Tú
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <FadeIn>
      <div className="glass rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{routine.name}</h3>
              {sourceBadge()}
            </div>
            <p className="text-zinc-400 text-sm">
              {routine.focus} · {routine.days_per_week} días/semana · {routine.estimated_duration_minutes} min
            </p>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/dashboard/workouts/create?routineId=${routine.id}`)}
              className="p-2 rounded-xl hover:bg-white/5 text-zinc-300"
              title="Editar"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              className="p-2 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-red-400 disabled:opacity-50"
              title="Eliminar"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-xl hover:bg-white/5 text-zinc-400"
            >
              {expanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {deleteError && (
          <div className="px-5 pb-3">
            <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-3 py-2">
              No se pudo eliminar. Probablemente ya no exista.
            </p>
          </div>
        )}
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
                  <DayRow key={day.id} day={day} routineId={routine.id!} onStart={onStartDay} busy={busy} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Eliminar rutina"
        message={
          <>
            ¿Eliminar <span className="font-bold text-white">«{routine.name}»</span>? Esta acción no
            se puede deshacer.
          </>
        }
        busy={deleting}
        onConfirm={() => {
          handleDelete();
          setConfirmOpen(false);
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </FadeIn>
  );
}

function DayRow({
  day,
  routineId,
  onStart,
  busy,
}: {
  day: RoutineDay;
  routineId: number;
  onStart: (routineId: number, dayId: number) => void;
  busy: boolean;
}) {
  const todayName = DAY_NAMES[new Date().getDay()];
  const isToday = normalizeDay(day.day_name) === normalizeDay(todayName);

  const handleStart = () => {
    if (!day.id) return;
    onStart(routineId, day.id);
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
        disabled={busy}
        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90 disabled:opacity-70 transition-opacity"
      >
        <PlayIcon className="w-4 h-4" />
        {busy ? 'Preparando...' : 'Empezar'}
      </button>
    </div>
  );
}

function WorkoutCard({
  workout,
  delay,
  expanded,
  onToggle,
}: {
  workout: Workout;
  delay: number;
  expanded: boolean;
  onToggle: () => void;
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
          <button onClick={onToggle} className="p-2 rounded-xl hover:bg-white/5 text-zinc-300">
            {expanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
          </button>
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

  useEffect(() => {
    getExercises(workoutId).then(setExercises);
  }, [workoutId]);

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
            {ex.set_logs && ex.set_logs.length > 0 && ex.set_logs.some(l => l.completed_at) && (
              <p className="text-zinc-500 text-xs mt-1">
                {ex.set_logs.filter(l => l.completed_at).map(l =>
                  `S${l.set_number}: ${l.reps ?? 0} reps${l.weight != null ? ` × ${l.weight} kg` : ""}`
                ).join(' · ')}
              </p>
            )}
          </div>
        </div>
      ))}
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
