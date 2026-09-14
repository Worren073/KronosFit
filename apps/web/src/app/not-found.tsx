"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <p className="text-7xl font-black text-white/10">404</p>
        <h1 className="text-2xl font-bold text-white">Página no encontrada</h1>
        <p className="text-zinc-500 text-sm">Esta página no existe o fue movida.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 px-6 py-3 rounded-2xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}