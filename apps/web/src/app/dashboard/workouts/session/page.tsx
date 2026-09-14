"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftIcon, TrophyIcon, BeakerIcon } from "@heroicons/react/24/outline";
import { getWorkout, completeSet, finishWorkout, createWaterIntake, deleteWorkout } from "@/lib/api";
import type { Workout, Exercise } from "@/lib/types";

const MIN_WORK_SECONDS = 30;

export default function SessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workoutIdParam = searchParams.get("workoutId");
  const workoutId = workoutIdParam ? Number(workoutIdParam) : null;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "intro" | "work" | "input" | "rest" | "finished">("loading");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [workSeconds, setWorkSeconds] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [completedSets, setCompletedSets] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [waterLogged, setWaterLogged] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [startTime] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!workoutId) {
      setError("No se encontro el entrenamiento.");
      return;
    }
    getWorkout(workoutId)
      .then((w) => {
        setWorkout(w);
        setPhase("intro");
      })
      .catch(() => setError("No se pudo cargar el entrenamiento."));
  }, [workoutId]);

  useEffect(() => {
    if (phase !== "work") return;
    const interval = setInterval(() => setWorkSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "rest") return;
    if (restSeconds <= 0) {
      advanceSet();
      return;
    }
    const interval = setInterval(() => setRestSeconds((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [phase, restSeconds]);

  const totalSets = useMemo(() => {
    return workout?.exercises.reduce((acc, ex) => acc + (ex.sets || 0), 0) || 0;
  }, [workout]);

  const currentExercise: Exercise | undefined = workout?.exercises[exerciseIndex];
  const currentSet = currentExercise?.set_logs?.[setIndex];

  function advanceSet() {
    if (!currentExercise || !workout) return;
    if (setIndex + 1 < currentExercise.sets) {
      setSetIndex((i) => i + 1);
      setPhase("intro");
    } else if (exerciseIndex + 1 < workout.exercises.length) {
      setExerciseIndex((i) => i + 1);
      setSetIndex(0);
      setPhase("intro");
    } else {
      setPhase("finished");
    }
  }

  function handleStartSet() {
    setWorkSeconds(0);
    setPhase("work");
  }

  function handleReady() {
    if (!currentExercise) return;
    setReps(String(currentExercise.reps || ""));
    setWeight(currentExercise.weight ? String(currentExercise.weight) : "");
    setPhase("input");
  }

  async function handleSaveSet(e: React.FormEvent) {
    e.preventDefault();
    if (!workout || !currentExercise || !currentSet) return;
    await completeSet(workout.id, currentExercise.id, currentSet.id, {
      reps: Number(reps),
      weight: weight ? Number(weight) : null,
    });
    setCompletedSets((c) => c + 1);
    setRestSeconds(currentExercise.rest_seconds);
    setWaterLogged(false);
    setPhase("rest");
  }

  async function handleFinish() {
    if (!workout) return;
    setFinishing(true);
    const duration = Math.max(1, Math.round((Date.now() - startTime) / 60000));
    try {
      await finishWorkout(workout.id, { duration_minutes: duration });
      router.push("/dashboard/workouts");
    } catch {
      setFinishing(false);
    }
  }

  async function handleExitConfirm() {
    if (!workout) return;
    setExiting(true);
    try {
      await deleteWorkout(workout.id);
    } catch {
      // Continue to redirect even if delete fails
    }
    router.push("/dashboard/workouts");
  }

  async function handleLogWater() {
    const today = new Date().toISOString().split('T')[0];
    try {
      await createWaterIntake({ date: today, milliliters: 250 });
      setWaterLogged(true);
    } catch {
      // silently ignore to avoid interrupting rest
    }
  }

  const progress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => router.push("/dashboard/workouts")} className="px-6 py-2 rounded-xl gold-gradient text-black font-bold">
          Volver
        </button>
      </div>
    );
  }

  if (phase === "loading" || !workout || !currentExercise) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-amber-500 blur-[160px] animate-pulse-glow opacity-30 pointer-events-none" />

      <div className="fixed top-0 left-0 right-0 h-2 bg-zinc-900 z-50">
        <motion.div
          className="h-full gold-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="fixed top-2 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between text-zinc-300 text-sm">
        <button onClick={() => setShowExitModal(true)} className="flex items-center gap-1 hover:text-white transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
          Salir
        </button>
        <span>
          Serie {completedSets + 1} de {totalSets}
        </span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-12 pt-32">
        <div className="w-full max-w-2xl">
          {phase === "intro" && (
            <IntroPhase exercise={currentExercise} setNumber={setIndex + 1} onStart={handleStartSet} />
          )}
          {phase === "work" && (
            <WorkPhase seconds={workSeconds} onReady={handleReady} />
          )}
          {phase === "input" && (
            <InputPhase
              reps={reps}
              weight={weight}
              onRepsChange={setReps}
              onWeightChange={setWeight}
              onSubmit={handleSaveSet}
            />
          )}
          {phase === "rest" && (
            <RestPhase
              seconds={restSeconds}
              onLogWater={handleLogWater}
              waterLogged={waterLogged}
            />
          )}
          {phase === "finished" && (
            <FinishedPhase onFinish={handleFinish} finishing={finishing} />
          )}
        </div>
      </div>

      {showExitModal && (
        <ExitModal
          onCancel={() => setShowExitModal(false)}
          onConfirm={handleExitConfirm}
          exiting={exiting}
        />
      )}
    </div>
  );
}

function IntroPhase({ exercise, setNumber, onStart }: { exercise: Exercise; setNumber: number; onStart: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center">
      <div>
        <p className="text-zinc-400 text-sm uppercase tracking-wide mb-2">Serie {setNumber} de {exercise.sets}</p>
        <h1 className="text-3xl md:text-5xl font-bold text-white">{exercise.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div className="aspect-square rounded-3xl gold-gradient flex items-center justify-center">
          <DumbbellIcon />
        </div>
        <div className="aspect-square rounded-3xl gold-gradient flex items-center justify-center">
          <DumbbellIcon />
        </div>
      </div>

      <p className="text-zinc-300 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
        {exercise.description || "Mantene la tecnica y el control durante todo el movimiento."}
      </p>

      <div className="flex items-center justify-center gap-6 text-zinc-400 text-sm">
        <span>{exercise.sets} series</span>
        <span>{exercise.reps} reps</span>
        <span>{exercise.rest_seconds}s descanso</span>
      </div>

      <button onClick={onStart} className="px-10 py-4 rounded-2xl gold-gradient text-black font-bold text-lg hover:opacity-90 transition-opacity">
        Comenzar serie
      </button>
    </motion.div>
  );
}

function WorkPhase({ seconds, onReady }: { seconds: number; onReady: () => void }) {
  const canFinish = seconds >= MIN_WORK_SECONDS;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8">
      <div>
        <p className="text-zinc-400 text-sm uppercase tracking-wide mb-2">Tiempo de trabajo</p>
        <div className="text-7xl md:text-9xl font-bold text-white tabular-nums">{formatTime(seconds)}</div>
      </div>
      <button
        onClick={onReady}
        disabled={!canFinish}
        className="px-10 py-4 rounded-2xl bg-white text-black font-bold text-lg hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
      >
        Listo
      </button>
      {!canFinish && <p className="text-zinc-500 text-sm">Faltan {MIN_WORK_SECONDS - seconds}s para habilitar el boton</p>}
    </motion.div>
  );
}

function InputPhase({
  reps,
  weight,
  onRepsChange,
  onWeightChange,
  onSubmit,
}: {
  reps: string;
  weight: string;
  onRepsChange: (v: string) => void;
  onWeightChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">Registra la serie</h2>
      <form onSubmit={onSubmit} className="max-w-sm mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-left">
            <label className="block text-zinc-400 text-sm mb-1">Reps</label>
            <input
              type="number"
              value={reps}
              onChange={(e) => onRepsChange(e.target.value)}
              className="input w-full"
              required
              min={0}
            />
          </div>
          <div className="text-left">
            <label className="block text-zinc-400 text-sm mb-1">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
              className="input w-full"
            />
          </div>
        </div>
        <button type="submit" className="w-full px-6 py-3 rounded-2xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity">
          Guardar serie y descansar
        </button>
      </form>
    </motion.div>
  );
}

function RestPhase({
  seconds,
  onLogWater,
  waterLogged,
}: {
  seconds: number;
  onLogWater: () => void;
  waterLogged: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-8">
      <div>
        <p className="text-amber-400 text-sm uppercase tracking-wide mb-2">Descanso</p>
        <div className="text-7xl md:text-9xl font-bold text-white tabular-nums">{formatTime(seconds)}</div>
      </div>
      <p className="text-zinc-300">Preparate para la siguiente serie...</p>

      <div className="space-y-3">
        <p className="text-zinc-400 text-sm">Toma agua si lo necesitas</p>
        <button
          onClick={onLogWater}
          disabled={waterLogged}
          className="flex items-center justify-center gap-2 mx-auto px-6 py-3 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
        >
          <BeakerIcon className="w-5 h-5" />
          {waterLogged ? '250 ml registrados' : 'Registrar 250 ml'}
        </button>
      </div>
    </motion.div>
  );
}

function FinishedPhase({ onFinish, finishing }: { onFinish: () => void; finishing: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8">
      <div className="w-24 h-24 mx-auto rounded-full gold-gradient flex items-center justify-center">
        <TrophyIcon className="w-12 h-12 text-black" />
      </div>
      <div>
        <h2 className="text-3xl md:text-4xl font-bold text-white">Entrenamiento completado</h2>
        <p className="text-zinc-400 mt-2">Buen trabajo. Tu progreso quedo registrado.</p>
      </div>
      <button
        onClick={onFinish}
        disabled={finishing}
        className="px-10 py-4 rounded-2xl gold-gradient text-black font-bold text-lg hover:opacity-90 disabled:opacity-70 transition-opacity"
      >
        {finishing ? "Guardando..." : "Finalizar"}
      </button>
    </motion.div>
  );
}

function ExitModal({
  onCancel,
  onConfirm,
  exiting,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  exiting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-6 max-w-sm w-full text-center space-y-5"
      >
        <h2 className="text-xl font-bold text-white">¿Seguro que quieres salir?</h2>
        <p className="text-zinc-400">Si sales ahora, el progreso de esta sesión no se guardará.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={exiting}
            className="flex-1 px-4 py-3 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={exiting}
            className="flex-1 px-4 py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 disabled:opacity-70 transition-opacity"
          >
            {exiting ? "Saliendo..." : "Salir"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function DumbbellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14 text-black opacity-80">
      <path d="M4 10h16v4H4z" />
      <path d="M6 6h2v12H6z" />
      <path d="M16 6h2v12h-2z" />
    </svg>
  );
}
