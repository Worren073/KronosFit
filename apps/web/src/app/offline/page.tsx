"use client";

import { SignalSlashIcon } from "@heroicons/react/24/outline";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-6">
      <div className="glass rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full gold-gradient flex items-center justify-center">
          <SignalSlashIcon className="w-8 h-8 text-black" />
        </div>
        <h1 className="text-2xl font-bold text-amber-400">Sin conexión</h1>
        <p className="text-zinc-400 text-sm">
          KronosFit funciona mejor con conexión. Reconectá tu red e intentá de nuevo.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-2xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}