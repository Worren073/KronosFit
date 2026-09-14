"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoutineGeneratorWizard } from "@/components/ai/RoutineGeneratorWizard";
import { RoutineResultView } from "@/components/ai/RoutineResultView";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { generateRoutine } from "@/lib/api";
import type { RoutineWizardAnswers, GeneratedRoutineResponse } from "@/lib/types";

const STATUS_MESSAGES = [
  { delay: 2000, text: "Ajustando la rutina a tus datos..." },
  { delay: 5000, text: "Ajustando los detalles finales..." },
];

export default function GenerateRoutinePage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<RoutineWizardAnswers | null>(null);
  const [response, setResponse] = useState<GeneratedRoutineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setStatus(undefined);
      return;
    }

    setStatus(undefined);
    const timers = STATUS_MESSAGES.map(({ delay, text }) =>
      setTimeout(() => setStatus(text), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [isLoading]);

  const runGeneration = async (generationAnswers: RoutineWizardAnswers) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateRoutine(generationAnswers);
      setResponse(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error generando la rutina";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (wizardAnswers: RoutineWizardAnswers) => {
    setAnswers(wizardAnswers);
    await runGeneration(wizardAnswers);
  };

  const handleRetry = () => {
    if (!answers) return;
    runGeneration(answers);
  };

  const handleRegenerate = async (feedback: string) => {
    if (!answers) return;
    const updatedAnswers: RoutineWizardAnswers = {
      ...answers,
      notes: answers.notes
        ? `${answers.notes}\n\nCambios solicitados: ${feedback}`
        : `Cambios solicitados: ${feedback}`,
    };
    setAnswers(updatedAnswers);
    setResponse(null);
    await runGeneration(updatedAnswers);
  };

  const handleConfirm = async () => {
    if (!response) return;
    setConfirming(true);
    try {
      router.push("/dashboard/workouts");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error confirmando la rutina";
      setError(message);
      setConfirming(false);
    }
  };

  return (
    <>
      {!response ? (
        <RoutineGeneratorWizard onSubmit={handleSubmit} onCancel={() => router.push("/dashboard/workouts")} />
      ) : (
        <RoutineResultView
          message={response.message}
          routine={response.routine}
          onConfirm={handleConfirm}
          onRegenerate={handleRegenerate}
          onExit={() => router.push("/dashboard/workouts")}
          confirming={confirming}
        />
      )}
      <LoadingScreen
        isLoading={isLoading}
        error={error || undefined}
        status={status}
        message="Estamos terminando de preparar todo para ti"
        onRetry={handleRetry}
        onCancel={() => router.push("/dashboard/workouts")}
        minDuration={1500}
      />
    </>
  );
}
