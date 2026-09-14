"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SparklesIcon, ExclamationTriangleIcon, ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface LoadingScreenProps {
  message?: string;
  status?: string;
  error?: string;
  minDuration?: number;
  isLoading: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

export function LoadingScreen({
  message = "Cargando...",
  status,
  error,
  minDuration = 1500,
  isLoading,
  onRetry,
  onCancel,
  children,
}: LoadingScreenProps) {
  const [visible, setVisible] = useState(isLoading || !!error);
  const [minDurationMet, setMinDurationMet] = useState(false);

  useEffect(() => {
    if (isLoading || error) {
      setVisible(true);
      setMinDurationMet(false);
      const timer = setTimeout(() => setMinDurationMet(true), minDuration);
      return () => clearTimeout(timer);
    }
  }, [isLoading, error, minDuration]);

  useEffect(() => {
    if (!isLoading && !error && minDurationMet) {
      setVisible(false);
    }
  }, [isLoading, error, minDurationMet]);

  if (!visible) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.15),transparent_60%)]" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex flex-col items-center gap-6 text-center max-w-md"
      >
        {error ? (
          <ErrorContent error={error} onRetry={onRetry} onCancel={onCancel} />
        ) : (
          <LoadingContent message={message} status={status} />
        )}
      </motion.div>

      {!error && onCancel && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onCancel}
          className="absolute bottom-8 z-10 flex items-center gap-2 px-5 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
          Cancelar
        </motion.button>
      )}
    </div>
  );
}

function LoadingContent({ message, status }: { message: string; status?: string }) {
  return (
    <>
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full gold-gradient opacity-20 animate-pulse-glow" />
        <div className="absolute inset-2 rounded-full gold-gradient flex items-center justify-center">
          <SparklesIcon className="w-10 h-10 text-black animate-pulse" />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold text-white">{message}</h2>
        {status && <p className="text-zinc-400 text-sm md:text-base">{status}</p>}
        <div className="flex items-center justify-center gap-2 text-amber-400 pt-1">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.15s]" />
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.3s]" />
        </div>
      </div>
    </>
  );
}

function ErrorContent({
  error,
  onRetry,
  onCancel,
}: {
  error: string;
  onRetry?: () => void;
  onCancel?: () => void;
}) {
  return (
    <>
      <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-400" />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl md:text-3xl font-bold text-white">Algo salió mal</h2>
        <p className="text-zinc-400 text-sm md:text-base leading-relaxed">{error}</p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Reintentar
          </button>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </>
  );
}
