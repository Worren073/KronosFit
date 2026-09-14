"use client";

import { SparklesIcon } from "@heroicons/react/24/solid";

interface AssistantButtonProps {
  onClick: () => void;
}

export function AssistantButton({ onClick }: AssistantButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Abrir asistente"
      className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 w-14 h-14 rounded-full gold-gradient shadow-lg shadow-amber-500/30 flex items-center justify-center hover:scale-105 transition-transform"
    >
      <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-pulse-glow" />
      <SparklesIcon className="w-7 h-7 text-black relative z-10" />
    </button>
  );
}
