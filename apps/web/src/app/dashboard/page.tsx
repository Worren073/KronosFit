"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  UserCircleIcon,
  FireIcon,
  BeakerIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useDashboardStore } from "@/stores/dashboardStore";
import { startWorkoutFromRoutineDay } from "@/lib/api";
import { todayCalories, todayWater, getDaysInMonth, getFirstDayOfMonth } from "@/lib/dashboard";
import { EXPERIENCE_LEVELS } from "@/lib/experience";
import { GENDER_LABELS } from "@/lib/gender";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";
import type { User, Routine } from "@/lib/types";

const EXPERIENCE_LABELS = Object.fromEntries(EXPERIENCE_LEVELS.map((e) => [e.key, e.label]));

const calendarVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -40 : 40 }),
};

export default function DashboardHome() {
  const {
    user,
    progress,
    progressInitialized,
    fetchProgress,
    calendar,
    calendarInitialized,
    calendarLoading,
    calendarKey,
    fetchCalendar,
    routines,
    routinesInitialized,
    routinesLoading,
    fetchRoutines,
  } = useDashboardStore();

  const [date, setDate] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const ready = useMinimumSkeleton(500);
  const isLoading = !progressInitialized || !calendarInitialized;

  useEffect(() => {
    if (!progressInitialized) fetchProgress();
  }, [progressInitialized, fetchProgress]);

  useEffect(() => {
    if (!routinesInitialized) fetchRoutines();
  }, [routinesInitialized, fetchRoutines]);

  useEffect(() => {
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (calendarKey !== key) {
      fetchCalendar(date.getFullYear(), date.getMonth() + 1);
    }
  }, [date, calendarKey, fetchCalendar]);

  const monthName = date.toLocaleString("es-ES", { month: "long", year: "numeric" });
  const daysInMonth = getDaysInMonth(date.getFullYear(), date.getMonth());
  const firstDay = getFirstDayOfMonth(date.getFullYear(), date.getMonth());
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const changeMonth = (delta: number) => {
    setDirection(delta);
    setDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
    setSelectedDay(null);
  };

  if (!ready || isLoading) {
    return <DashboardHomeSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Hero user={user} />

      <TrainingPlanCard
        routines={routines}
        loading={routinesLoading || !routinesInitialized}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={0.1} className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => changeMonth(-1)}
              disabled={calendarLoading}
              className="p-2 rounded-xl hover:bg-white/5 text-zinc-300 disabled:opacity-50"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white capitalize">{monthName}</h2>
              {calendarLoading && (
                <span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              )}
            </div>
            <button
              onClick={() => changeMonth(1)}
              disabled={calendarLoading}
              className="p-2 rounded-xl hover:bg-white/5 text-zinc-300 disabled:opacity-50"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-zinc-500 mb-2">
            {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="relative overflow-hidden min-h-[240px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={date.toISOString()}
                custom={direction}
                variants={calendarVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="grid grid-cols-7 gap-2"
              >
                {blanks.map((b) => (
                  <div key={`blank-${b}`} />
                ))}
                {days.map((day) => {
                  const workouts = calendar?.days[day] || [];
                  const hasWorkout = workouts.length > 0;
                  const isSelected = selectedDay === day;
                  return (
                    <button
                      key={day}
                      onClick={() => hasWorkout && setSelectedDay(isSelected ? null : day)}
                      className={`aspect-square rounded-xl text-sm font-medium transition-all flex items-center justify-center ${
                        hasWorkout
                          ? "gold-gradient text-black"
                          : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800"
                      } ${isSelected ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-black" : ""}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {selectedDay && calendar?.days[selectedDay] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-2"
              >
                <p className="text-sm text-zinc-400">Entrenamientos del {selectedDay}:</p>
                {calendar.days[selectedDay].map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-xl bg-zinc-900/50 p-3">
                    <span className="text-white font-medium">{w.name}</span>
                    <span className="text-amber-400 text-sm">{w.duration_minutes} min</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </FadeIn>

        <div className="grid grid-cols-2 gap-4">
          <MetricCard icon={FireIcon} label="Calorías hoy" value={`${todayCalories(progress)} kcal`} delay={0.2} />
          <MetricCard icon={BeakerIcon} label="Agua hoy" value={`${todayWater(progress)} L`} delay={0.3} />
          <MetricCard icon={ScaleIcon} label="Peso" value={`${user?.profile?.weight || "--"} kg`} delay={0.4} />
          <MetricCard icon={ArrowTrendingUpIcon} label="Altura" value={`${user?.profile?.height || "--"} cm`} delay={0.5} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Duración de entrenamientos" delay={0.6}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={progress?.workouts || []}>
              <defs>
                <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#D4AF37" }}
              />
              <Area type="monotone" dataKey="duration" stroke="#D4AF37" fillOpacity={1} fill="url(#colorDuration)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Calorías diarias" delay={0.7}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progress?.nutrition || []}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#D4AF37" }}
              />
              <Line type="monotone" dataKey="calories" stroke="#D4AF37" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Agua diaria" delay={0.8}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={progress?.nutrition || []}>
              <defs>
                <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#3b82f6" }}
              />
              <Area type="monotone" dataKey="water" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWater)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Peso" delay={0.9}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progress?.weight || []}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#D4AF37" }}
              />
              <Line type="monotone" dataKey="weight" stroke="#D4AF37" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function DashboardHomeSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Skeleton className="h-32 w-full" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-full min-h-[7rem] w-full" />
          <Skeleton className="h-full min-h-[7rem] w-full" />
          <Skeleton className="h-full min-h-[7rem] w-full" />
          <Skeleton className="h-full min-h-[7rem] w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

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

function TrainingPlanCard({ routines, loading }: { routines: Routine[]; loading: boolean }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  if (loading) {
    return <Skeleton className="h-24 w-full rounded-3xl" />;
  }

  if (routines.length === 0) {
    return (
      <FadeIn>
        <div className="glass rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-400 uppercase">Plan de entrenamiento</p>
              <h2 className="text-lg font-bold text-white">No tenes un plan activo</h2>
            </div>
          </div>
          <Link
            href="/dashboard/workouts/generate"
            className="px-5 py-2.5 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Generar con IA
          </Link>
        </div>
      </FadeIn>
    );
  }

  const routine = routines[0];
  const todayName = DAY_NAMES[new Date().getDay()];
  const todayDay = routine.days.find(
    (d) => normalizeDay(d.day_name) === normalizeDay(todayName)
  );

  if (!todayDay) {
    return (
      <FadeIn>
        <div className="glass rounded-3xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
            <BoltIcon className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-400 uppercase">Plan de hoy</p>
            <h2 className="text-lg font-bold text-white">Hoy es {todayName} — descanso activo</h2>
          </div>
        </div>
      </FadeIn>
    );
  }

  const handleStart = async () => {
    if (!routine.id || !todayDay.id) return;
    setStarting(true);
    try {
      const workout = await startWorkoutFromRoutineDay(routine.id, todayDay.id);
      router.push(`/dashboard/workouts/session?workoutId=${workout.id}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <FadeIn>
      <div className="glass rounded-3xl p-6 gold-gradient text-black flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 md:w-12 md:h-12 rounded-full bg-black/20 flex items-center justify-center">
            <BoltIcon className="w-8 h-8 md:w-7 md:h-7" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase opacity-80">Plan de hoy</p>
            <h2 className="text-xl md:text-2xl font-bold">
              Hoy es {todayDay.day_name} — {todayDay.muscle_groups}
            </h2>
          </div>
        </div>
        <button
          onClick={handleStart}
          disabled={starting}
          className="px-6 py-3 rounded-xl bg-black text-white font-bold text-sm hover:bg-zinc-900 disabled:opacity-70 transition-colors"
        >
          {starting ? 'Preparando...' : 'Empezar entrenamiento'}
        </button>
      </div>
    </FadeIn>
  );
}

function Hero({ user }: { user: User | null }) {
  return (
    <FadeIn direction="down">
      <div className="glass rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full gold-gradient flex items-center justify-center shadow-lg shadow-amber-500/20">
            <UserCircleIcon className="w-14 h-14 text-black" />
          </div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {user?.profile?.first_name || user?.username} {user?.profile?.last_name}
          </h1>
          <p className="text-zinc-400 mt-1">
            {user?.profile?.age ? `${user.profile.age} años` : ""}
            {user?.profile?.gym_name ? ` · ${user.profile.gym_name}` : ""}
            {user?.profile?.trainer_name ? ` · Entrenador: ${user.profile.trainer_name}` : ""}
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase">
              {user?.role}
            </span>
            <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-bold uppercase">
              {GENDER_LABELS[user?.profile?.gender as keyof typeof GENDER_LABELS] || "Sin género"}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase">
              {EXPERIENCE_LABELS[user?.profile?.experience as keyof typeof EXPERIENCE_LABELS] || "Sin experiencia"}
            </span>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <FadeIn delay={delay} className="glass rounded-3xl p-5 flex flex-col justify-between h-full">
      <Icon className="w-6 h-6 text-amber-400 mb-3" />
      <div>
        <p className="text-zinc-400 text-sm">{label}</p>
        <p className="text-xl font-bold text-white mt-1">{value}</p>
      </div>
    </FadeIn>
  );
}

function ChartCard({ title, children, delay }: { title: string; children: React.ReactNode; delay: number }) {
  return (
    <FadeIn delay={delay} className="glass rounded-3xl p-5">
      <h3 className="text-sm font-bold text-zinc-300 mb-4">{title}</h3>
      {children}
    </FadeIn>
  );
}
