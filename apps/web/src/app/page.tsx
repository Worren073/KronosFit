import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black" />
      <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 50% 50%, #D4AF37 0%, transparent 60%)'}} />

      {/* Content */}
      <div className="relative z-10 text-center">
        <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
          KronosFit
        </h1>
        <p className="text-xl text-zinc-400 mb-8 max-w-md">
          Tu asistente inteligente de entrenamiento, nutrición y seguimiento de progreso
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl glass text-amber-400 font-semibold hover:bg-amber-500/10 transition-all hover:scale-105"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl gold-gradient text-black font-semibold hover:opacity-90 transition-all hover:scale-105"
          >
            Crear Cuenta
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="relative z-10 mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        {[
          { title: "Rutinas", desc: "Entrenamientos personalizados" },
          { title: "Nutrición", desc: "Seguimiento de comidas y macros" },
          { title: "Progreso", desc: "Rachas y estadísticas diarias" },
        ].map((f) => (
          <div key={f.title} className="glass rounded-xl p-6 text-center hover:border-amber-500/40 transition-all">
            <h3 className="text-amber-400 font-bold mb-2">{f.title}</h3>
            <p className="text-zinc-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}