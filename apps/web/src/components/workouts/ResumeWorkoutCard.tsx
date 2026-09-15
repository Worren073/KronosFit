"use client";

import Link from "next/link";
import { PlayIcon } from "@heroicons/react/24/outline";
import type { Workout } from "@/lib/types";

export function ResumeWorkoutCard({ workout }: { workout: Workout }) {
  const totalSets = workout.exercises.reduce((acc, ex) => acc + (ex.sets || 0), 0);
  const completedSets = workout.exercises.reduce(
    (acc, ex) => acc + (ex.set_logs ?? []).filter((l) => l.completed_at).length,
    0
  );

  return (
    <div className="glass rounded-3xl p-5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-amber-400 uppercase">Entrenamiento en curso</p>
        <h3 className="text-lg font-bold text-white">{workout.name}</h3>
        <p className="text-zinc-400 text-sm">
          {completedSets} de {totalSets} series completadas
        </p>
      </div>
      <Link
        href={`/dashboard/workouts/session?workoutId=${workout.id}`}
        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90 transition-opacity"
      >
        <PlayIcon className="w-4 h-4" />
        Reanudar entrenamiento
      </Link>
    </div>
  );
}
