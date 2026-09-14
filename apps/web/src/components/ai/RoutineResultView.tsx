"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  SparklesIcon,
  CheckIcon,
  ArrowPathIcon,
  ClockIcon,
  CalendarIcon,
  FireIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import type { Routine, RoutineDay, RoutineExercise } from "@/lib/types";

interface RoutineResultViewProps {
  message: string;
  routine: Routine;
  onConfirm: () => void;
  onRegenerate: (feedback: string) => void;
  onExit: () => void;
  confirming?: boolean;
}

export function RoutineResultView({
  message,
  routine,
  onConfirm,
  onRegenerate,
  onExit,
  confirming = false,
}: RoutineResultViewProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleRegenerateSubmit = () => {
    onRegenerate(feedback.trim());
    setFeedback("");
    setShowFeedback(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-black flex flex-col">
      {/* Ambient golden glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-40">
        <div className="absolute inset-0 bg-amber-500 blur-[160px] animate-pulse-glow" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-amber-500/10">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-amber-400" />
          <span className="font-bold text-white">Rutina generada</span>
        </div>
        <button
          onClick={onExit}
          className="p-2 rounded-xl hover:bg-white/5 text-zinc-300"
          aria-label="Salir"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-y-auto px-6 py-8">
        <div className="w-full max-w-4xl mx-auto space-y-6 pb-28">
          {/* AI Message */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-6 border border-amber-500/10"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl gold-gradient shrink-0">
                <SparklesIcon className="w-6 h-6 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-2">Mensaje de tu entrenador</h2>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-line">{message}</p>
              </div>
            </div>
          </motion.div>

          {/* Routine summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-3"
          >
            <SummaryBadge icon={FireIcon} text={routine.focus} />
            <SummaryBadge icon={CalendarIcon} text={`${routine.days_per_week} días/semana`} />
            <SummaryBadge icon={ClockIcon} text={`~${routine.estimated_duration_minutes} min/sesión`} />
          </motion.div>

          {/* Days */}
          <div className="space-y-4">
            {routine.days.map((day, index) => (
              <DayCard key={index} day={day} index={index} />
            ))}
          </div>
        </div>
      </main>

      {/* Footer actions */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-white/5 transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Regenerar
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="flex items-center gap-2 px-8 py-3 rounded-xl gold-gradient text-black font-bold disabled:opacity-70 transition-opacity"
          >
            {confirming ? (
              <>
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5" />
                Confirmar rutina
              </>
            )}
          </button>
        </div>
      </footer>

      {/* Feedback modal */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowFeedback(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass rounded-3xl border border-amber-500/20 p-6 space-y-4"
            >
              <h3 className="text-xl font-bold text-white">¿Qué querés cambiar?</h3>
              <p className="text-sm text-zinc-400">
                Escribí las indicaciones para que el entrenador las tenga en cuenta al regenerar la rutina.
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ej: quiero más énfasis en piernas, menos ejercicios con mancuernas, etc."
                className="input w-full h-32 resize-none"
              />
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowFeedback(false)}
                  className="px-5 py-2 rounded-xl text-zinc-300 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegenerateSubmit}
                  disabled={!feedback.trim()}
                  className="px-6 py-2 rounded-xl gold-gradient text-black font-bold disabled:opacity-50"
                >
                  Regenerar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryBadge({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-zinc-300">
      <Icon className="w-4 h-4 text-amber-400" />
      {text}
    </div>
  );
}

function DayCard({ day, index }: { day: RoutineDay; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.05 }}
      className="glass rounded-3xl p-6 border border-amber-500/10"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{day.day_name}</h3>
          <p className="text-amber-400 text-sm">{day.muscle_groups}</p>
        </div>
        <span className="text-xs text-zinc-500 uppercase tracking-wide">
          {day.exercises.length} ejercicios
        </span>
      </div>

      <div className="space-y-3">
        {day.exercises.map((exercise, i) => (
          <ExerciseRow key={i} exercise={exercise} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

function ExerciseRow({ exercise, index }: { exercise: RoutineExercise; index: number }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-900/50 rounded-2xl p-4">
      <div className="flex items-center gap-3 flex-1">
        <span className="w-7 h-7 rounded-full gold-gradient text-black text-xs font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <div>
          <p className="text-white font-medium">{exercise.name}</p>
          {exercise.notes && <p className="text-xs text-zinc-500">{exercise.notes}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge icon={ListBulletIcon} text={`${exercise.sets} series`} />
        <Badge text={`${exercise.reps} reps`} />
        <Badge icon={ClockIcon} text={`${exercise.rest_seconds}s descanso`} />
      </div>
    </div>
  );
}

function Badge({ icon: Icon, text }: { icon?: React.ElementType; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 glass px-2 py-1 rounded-lg text-zinc-300 text-xs">
      {Icon && <Icon className="w-3 h-3 text-amber-400" />}
      {text}
    </span>
  );
}
