"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
  BoltIcon,
  FireIcon,
  ScaleIcon,
  HeartIcon,
  ClockIcon,
  HomeIcon,
  BuildingOfficeIcon,
  BeakerIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useDashboardStore } from "@/stores/dashboardStore";
import type { RoutineWizardAnswers, User } from "@/lib/types";

interface RoutineGeneratorWizardProps {
  onSubmit: (answers: RoutineWizardAnswers) => void;
  onCancel: () => void;
}

const GOALS = [
  { value: "Perder peso", icon: ScaleIcon },
  { value: "Ganar músculo", icon: FireIcon },
  { value: "Ganar fuerza", icon: BoltIcon },
  { value: "Ganar explosividad/reacción", icon: SparklesIcon },
  { value: "Mantenerme en forma", icon: HeartIcon },
  { value: "Mejorar resistencia", icon: ClockIcon },
];

const DAYS = [2, 3, 4, 5, 6, 7];

const TIME_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 75, label: "1h 15m" },
  { value: 90, label: "1h 30m" },
  { value: 105, label: "1h 45m" },
  { value: 120, label: "2h" },
  { value: 150, label: "2h 30m" },
  { value: 180, label: "3h" },
  { value: 240, label: "Más de 3h" },
];

const EQUIPMENT = [
  { value: "Gimnasio completo", icon: BuildingOfficeIcon },
  { value: "Casa con mancuernas", icon: HomeIcon },
  { value: "Casa sin equipo (peso corporal)", icon: HomeIcon },
  { value: "Bandas elásticas", icon: BeakerIcon },
  { value: "Kettlebells", icon: BeakerIcon },
];

const SPLITS = [
  {
    value: "Full body",
    title: "Full body",
    description: "Entrenas todo el cuerpo en cada sesión. Ideal si eres principiante o tienes pocos días.",
  },
  {
    value: "Upper/Lower",
    title: "Upper / Lower",
    description: "Parte superior un día y parte inferior el otro. También se conoce como torso/pierna. Buen balance entre frecuencia y recuperación.",
  },
  {
    value: "Push/Pull/Legs",
    title: "Push / Pull / Legs",
    description: "Separás empujes (pecho, hombros, tríceps), tracciones (espalda, bíceps) y piernas. Muy popular para entrenar más días.",
  },
  {
    value: "Bro split",
    title: "Bro split",
    description: "Un grupo muscular por día, clásico del culturismo. Menos frecuencia semanal por grupo, pero alto volumen por sesión.",
  },
  {
    value: "Personalizado",
    title: "Personalizado",
    description: "Dejas que el asistente elija el split que mejor se adapte a tus respuestas.",
  },
];

const STEPS = [
  { key: "goal", question: "¿Cuál es tu objetivo principal?" },
  { key: "days_per_week", question: "¿Cuántos días a la semana puedes entrenar?" },
  { key: "minutes_per_session", question: "¿Cuánto tiempo dispones por sesión de entrenamiento?" },
  { key: "equipment", question: "¿Con qué equipamiento cuentas?" },
  { key: "split_style", question: "¿Qué estilo de split prefieres?" },
  { key: "injuries", question: "¿Tienes lesiones o limitaciones físicas?" },
  { key: "notes", question: "¿Algo más que debas considerar?" },
];

export function RoutineGeneratorWizard({ onSubmit, onCancel }: RoutineGeneratorWizardProps) {
  const { user } = useDashboardStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<RoutineWizardAnswers>({
    goal: "",
    days_per_week: 0,
    minutes_per_session: 0,
    equipment: "",
    split_style: "",
    injuries: "",
    notes: "",
  });
  const [showSummary, setShowSummary] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;
  const currentStep = STEPS[step];
  const { displayed } = useTypewriter(currentStep?.question || "", 30, !showSummary);

  const update = (key: keyof RoutineWizardAnswers, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    const key = STEPS[step].key as keyof RoutineWizardAnswers;
    const value = answers[key];
    if (key === "injuries" || key === "notes") return true;
    return Boolean(value);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleBack = () => {
    if (showSummary) {
      setShowSummary(false);
    } else {
      setStep((s) => Math.max(0, s - 1));
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-black flex flex-col">
      {/* Ambient golden glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-40">
        <div className="absolute inset-0 bg-amber-500 blur-[160px] animate-pulse-glow" />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-full h-1 bg-zinc-800">
        <motion.div
          className="h-full gold-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-amber-400" />
          <span className="font-bold text-white">Generador de rutinas</span>
        </div>
        <button onClick={onCancel} className="p-2 rounded-xl hover:bg-white/5 text-zinc-300" aria-label="Salir">
          <XMarkIcon className="w-6 h-6" />
        </button>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-y-auto px-6 py-8">
        <div className="w-full max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="w-full space-y-8 pb-24"
            >
              <div className="text-center space-y-2">
                <p className="text-amber-400 text-sm font-semibold uppercase tracking-wider">
                  Paso {step + 1} de {STEPS.length}
                </p>
                <h2 className="text-2xl md:text-5xl font-bold text-white min-h-[3rem] md:min-h-[4rem]">{displayed}</h2>
              </div>

              <div className="min-h-[260px] flex items-center justify-center">
                <StepContent step={currentStep.key} answers={answers} onSelect={update} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer actions */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={step === 0 && !showSummary}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-zinc-300 hover:bg-white/5 disabled:opacity-30 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Atrás
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-8 py-3 rounded-xl gold-gradient text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {step === STEPS.length - 1 ? "Revisar" : "Siguiente"}
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {showSummary && (
          <ConfirmationModal
            answers={answers}
            user={user}
            onBack={handleBack}
            onGenerate={() => onSubmit(answers)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StepContent({
  step,
  answers,
  onSelect,
}: {
  step: string;
  answers: RoutineWizardAnswers;
  onSelect: (key: keyof RoutineWizardAnswers, value: string | number) => void;
}) {
  switch (step) {
    case "goal":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {GOALS.map(({ value, icon: Icon }) => (
            <OptionCard key={value} selected={answers.goal === value} onClick={() => onSelect("goal", value)}>
              <Icon className="w-6 h-6 text-amber-400" />
              <span>{value}</span>
            </OptionCard>
          ))}
        </div>
      );
    case "days_per_week":
      return (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 w-full">
          {DAYS.map((day) => (
            <NumberCard key={day} value={day} selected={answers.days_per_week === day} onClick={() => onSelect("days_per_week", day)} />
          ))}
        </div>
      );
    case "minutes_per_session":
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 w-full">
          {TIME_OPTIONS.map(({ value, label }) => (
            <OptionCard key={value} selected={answers.minutes_per_session === value} onClick={() => onSelect("minutes_per_session", value)}>
              <ClockIcon className="w-6 h-6 text-amber-400" />
              <span>{label}</span>
            </OptionCard>
          ))}
        </div>
      );
    case "equipment":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {EQUIPMENT.map(({ value, icon: Icon }) => (
            <OptionCard key={value} selected={answers.equipment === value} onClick={() => onSelect("equipment", value)}>
              <Icon className="w-6 h-6 text-amber-400" />
              <span>{value}</span>
            </OptionCard>
          ))}
        </div>
      );
    case "split_style":
      return (
        <div className="grid grid-cols-1 gap-4 w-full">
          {SPLITS.map(({ value, title, description }) => (
            <SplitCard
              key={value}
              title={title}
              description={description}
              selected={answers.split_style === value}
              onClick={() => onSelect("split_style", value)}
            />
          ))}
        </div>
      );
    case "injuries":
      return (
        <textarea
          value={answers.injuries}
          onChange={(e) => onSelect("injuries", e.target.value)}
          placeholder="Ej: dolor de rodilla, hombro sensible..."
          className="input w-full h-40"
        />
      );
    case "notes":
      return (
        <textarea
          value={answers.notes}
          onChange={(e) => onSelect("notes", e.target.value)}
          placeholder="Me gustaría tener piernas más grandes. O brazos más grandes. Gusto por mancuernas, o barras, etc."
          className="input w-full h-40"
        />
      );
    default:
      return null;
  }
}

function OptionCard({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
        selected
          ? "bg-amber-500/10 border-amber-400 text-white shadow-[0_0_20px_rgba(212,175,55,0.15)]"
          : "bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-amber-500/30"
      }`}
    >
      {children}
    </button>
  );
}

function NumberCard({
  value,
  selected,
  onClick,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`aspect-square flex flex-col items-center justify-center rounded-2xl border text-lg font-bold transition-all ${
        selected
          ? "bg-amber-500/10 border-amber-400 text-white shadow-[0_0_20px_rgba(212,175,55,0.15)]"
          : "bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-amber-500/30"
      }`}
    >
      {value}
    </button>
  );
}

function SplitCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-5 rounded-2xl border text-left transition-all ${
        selected
          ? "bg-amber-500/10 border-amber-400 text-white shadow-[0_0_20px_rgba(212,175,55,0.15)]"
          : "bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-amber-500/30"
      }`}
    >
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
    </button>
  );
}

function ConfirmationModal({
  answers,
  user,
  onBack,
  onGenerate,
}: {
  answers: RoutineWizardAnswers;
  user: User | null;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const profile = user?.profile;
  const items = [
    { label: "Objetivo", value: answers.goal },
    { label: "Días/semana", value: answers.days_per_week },
    { label: "Tiempo/sesión", value: TIME_OPTIONS.find((t) => t.value === answers.minutes_per_session)?.label || answers.minutes_per_session },
    { label: "Equipamiento", value: answers.equipment },
    { label: "Split", value: answers.split_style },
    { label: "Lesiones", value: answers.injuries || "Ninguna" },
    { label: "Notas", value: answers.notes || "Ninguna" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl glass rounded-3xl border border-amber-500/20 p-6 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">Revisa tu solicitud</h2>

        <div className="glass rounded-3xl p-6 space-y-4 mb-6">
          <h3 className="text-amber-400 font-bold">Tus datos</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <SummaryItem label="Edad" value={profile?.age || "No especificada"} />
            <SummaryItem label="Peso" value={profile?.weight ? `${profile.weight} kg` : "No especificado"} />
            <SummaryItem label="Altura" value={profile?.height ? `${profile.height} cm` : "No especificada"} />
            <SummaryItem label="Experiencia" value={profile?.experience || "No especificada"} />
          </div>
        </div>

        <div className="glass rounded-3xl p-6 space-y-4 mb-8">
          <h3 className="text-amber-400 font-bold">Tus preferencias</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {items.map((item) => (
              <SummaryItem key={item.label} label={item.label} value={String(item.value)} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-xl text-zinc-300 hover:bg-white/5">
            <ArrowLeftIcon className="w-5 h-5" />
            Atrás
          </button>
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 px-8 py-3 rounded-xl gold-gradient text-black font-bold"
          >
            <SparklesIcon className="w-5 h-5" />
            Generar rutina
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-zinc-500 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}
