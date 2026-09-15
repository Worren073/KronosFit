"use client";

import { motion } from "framer-motion";
import type { Workout } from "@/lib/types";

export function StartSessionModal({
  activeWorkout,
  onStartNew,
  onResume,
  busy,
}: {
  activeWorkout: Workout;
  onStartNew: () => void;
  onResume: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-6 max-w-sm w-full text-center space-y-5"
      >
        <h2 className="text-xl font-bold text-white">Tenés un entrenamiento en curso</h2>
        <p className="text-zinc-400 text-sm">
          Si comenzás esta sesión se eliminará el progreso de <span className="text-white font-bold">«{activeWorkout.name}»</span>. ¿Estás seguro?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onStartNew}
            disabled={busy}
            className="w-full px-4 py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 disabled:opacity-70 transition-opacity"
          >
            {busy ? "Preparando..." : "Empezar de nuevo"}
          </button>
          <button
            onClick={onResume}
            disabled={busy}
            className="w-full px-4 py-3 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            Continuar entrenamiento activo
          </button>
        </div>
      </motion.div>
    </div>
  );
}
