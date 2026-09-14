"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { getCurrentUser, updateProfile, ApiError } from "@/lib/api";
import { useTypewriter } from "@/hooks/useTypewriter";
import { EXPERIENCE_LEVELS } from "@/lib/experience";
import { GENDER_OPTIONS } from "@/lib/gender";
import type { User } from "@/lib/types";

type Step = {
  key: "first_name" | "last_name" | "gender" | "age" | "weight" | "height" | "experience";
  question: string;
  placeholder: string;
  type?: string;
};

const STEPS: Step[] = [
  { key: "first_name", question: "Cuéntanos cómo te llamas", placeholder: "Tu nombre" },
  { key: "last_name", question: "¿Y tu apellido?", placeholder: "Tu apellido" },
  { key: "gender", question: "¿Cuál es tu género?", placeholder: "" },
  { key: "age", question: "¿Cuántos años tienes?", placeholder: "Edad", type: "number" },
  { key: "weight", question: "¿Cuánto pesas?", placeholder: "Peso en kg", type: "number" },
  { key: "height", question: "¿Cuánto mides?", placeholder: "Altura en cm", type: "number" },
  { key: "experience", question: "¿Cuánta experiencia tienes?", placeholder: "" },
];

export default function OnboardingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    gender: "",
    age: "",
    weight: "",
    height: "",
    experience: "",
  });
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const currentStep = STEPS[stepIndex];

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        if (u.profile?.is_complete) {
          router.push("/dashboard");
          return;
        }
        setUser(u);
        setForm({
          first_name: u.profile?.first_name || "",
          last_name: u.profile?.last_name || "",
          gender: u.profile?.gender || "",
          age: u.profile?.age ? String(u.profile.age) : "",
          weight: u.profile?.weight ? String(u.profile.weight) : "",
          height: u.profile?.height ? String(u.profile.height) : "",
          experience: u.profile?.experience || "",
        });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
        } else {
          setError(err instanceof Error ? err.message : "Error al cargar usuario");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (inputRef.current && currentStep.key !== "experience") {
      inputRef.current.focus();
    }
  }, [stepIndex, currentStep.key]);

  const { displayed: questionText, done: questionDone } = useTypewriter(
    currentStep.question,
    55,
    visited.has(stepIndex)
  );

  const value = form[currentStep.key];
  const isValid =
    currentStep.key === "experience"
      ? form.experience !== ""
      : currentStep.key === "gender"
      ? form.gender !== ""
      : String(value).trim() !== "" && (currentStep.type === "number" ? Number(value) > 0 : true);

  const handleNext = () => {
    if (!isValid) return;
    if (stepIndex < STEPS.length - 1) {
      const next = stepIndex + 1;
      setVisited((prev) => new Set(Array.from(prev).concat(next)));
      setStepIndex(next);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValid) {
      handleNext();
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      await updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender,
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        experience: form.experience,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar perfil");
    } finally {
      setSaving(false);
    }
  };

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black">
        <p className="text-amber-400 text-xl">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-black flex flex-col">
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

      {/* Back button */}
      <div className="relative z-10 p-6">
        <button
          onClick={handleBack}
          disabled={stepIndex === 0}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            stepIndex === 0 ? "text-zinc-700 cursor-not-allowed" : "text-zinc-400 hover:text-white"
          }`}
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Atrás
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-xl text-center"
          >
            <h1 className="min-h-[120px] text-3xl md:text-5xl font-bold text-white leading-tight">
              {questionText}
              {!questionDone && <span className="text-amber-400 animate-pulse">|</span>}
            </h1>

            <div className="mt-12">
              {currentStep.key === "experience" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <button
                      key={level.key}
                      onClick={() => {
                        setForm({ ...form, experience: level.key });
                      }}
                      className={`relative rounded-2xl p-5 text-left border transition-all ${
                        form.experience === level.key
                          ? "border-amber-500/60 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10"
                          : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/40"
                      }`}
                    >
                      <span className="block text-lg font-bold">{level.label}</span>
                      <span className="block text-sm text-zinc-500 mt-1">{level.range}</span>
                    </button>
                  ))}
                </div>
              ) : currentStep.key === "gender" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {GENDER_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => {
                        setForm({ ...form, gender: option.key });
                      }}
                      className={`relative rounded-2xl p-5 text-center border transition-all ${
                        form.gender === option.key
                          ? "border-amber-500/60 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10"
                          : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/40"
                      }`}
                    >
                      <span className="block text-lg font-bold">{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={currentStep.type || "text"}
                    inputMode={currentStep.type === "number" ? "decimal" : "text"}
                    placeholder={currentStep.placeholder}
                    value={value}
                    onChange={(e) => setForm({ ...form, [currentStep.key]: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent border-b-2 border-zinc-700 text-center text-3xl md:text-5xl font-medium text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500 transition-colors py-4"
                  />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Next button */}
      <div className="relative z-10 p-6 md:p-10">
        {error && (
          <p className="text-center text-red-400 text-sm mb-4">{error}</p>
        )}
        <div className="max-w-xl mx-auto">
          <button
            onClick={handleNext}
            disabled={!isValid || saving}
            className="w-full py-4 rounded-2xl gold-gradient text-black font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
          >
            {saving ? "Guardando..." : stepIndex === STEPS.length - 1 ? "Comenzar mi viaje" : "Siguiente"}
          </button>
        </div>
      </div>
    </main>
  );
}
