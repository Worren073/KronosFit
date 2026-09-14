"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, type Transition } from "framer-motion";
import { apiFetch, getCurrentUser, ApiError } from "@/lib/api";
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateLoginUsername,
  validateLoginPassword,
} from "@/lib/validation";

const slideTransition: Transition = { duration: 0.7, ease: [0.4, 0, 0.2, 1] };
const fadeTransition = "transition-opacity duration-500 ease-in-out";

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-black">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #D4AF37 0%, transparent 60%)" }} />

      {/* Desktop split panel */}
      <div className="hidden md:relative md:flex w-full max-w-5xl h-[560px] glass rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/10 z-10">
        {/* Left messaging panel */}
        <div
          className={`w-1/2 h-full flex items-center justify-center p-8 absolute left-0 top-0 ${fadeTransition} ${
            mounted && isRegister ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="text-center max-w-xs">
            <h2 className="text-4xl font-bold text-amber-400 mb-4">Ingresa a tu santuario</h2>
            <p className="text-zinc-300 mb-8">Ya formas parte de nuestras filas. Reclama tu lugar entre los elegidos.</p>
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className="px-8 py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
            >
              Iniciar sesión
            </button>
          </div>
        </div>

        {/* Right messaging panel */}
        <div
          className={`w-1/2 h-full flex items-center justify-center p-8 absolute right-0 top-0 ${fadeTransition} ${
            mounted && isRegister ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="text-center max-w-xs">
            <h2 className="text-4xl font-bold text-amber-400 mb-4">Únete a nuestras tropas</h2>
            <p className="text-zinc-300 mb-8">Forja tu leyenda junto a los dioses del Olimpo. Tu viaje comienza hoy.</p>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className="px-8 py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
            >
              Registrarme
            </button>
          </div>
        </div>

        {/* Sliding form panel */}
        <motion.div
          className="absolute top-0 h-full w-1/2 bg-black/70 backdrop-blur-2xl border-x border-amber-500/20 flex items-center justify-center p-8 overflow-hidden"
          initial={false}
          animate={{ left: isRegister ? "50%" : "0%" }}
          transition={slideTransition}
        >
          <div className={`absolute inset-0 flex items-center justify-center p-8 ${fadeTransition} ${isRegister ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
            <div className="w-full max-w-sm">
              <LoginForm />
            </div>
          </div>
          <div className={`absolute inset-0 flex items-center justify-center p-8 ${fadeTransition} ${isRegister ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <div className="w-full max-w-sm">
              <RegisterForm onToggle={() => setIsRegister(false)} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden w-full max-w-md flex flex-col gap-4 z-10">
        <div className="glass rounded-2xl p-6 text-center">
          <h2 className="text-2xl font-bold text-amber-400 mb-2">
            {isRegister ? "Ingresa a tu santuario" : "Únete a nuestras tropas"}
          </h2>
          <p className="text-zinc-300 text-sm mb-4">
            {isRegister
              ? "Ya formas parte de nuestras filas. Reclama tu lugar."
              : "Forja tu leyenda junto a los dioses del Olimpo."}
          </p>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="px-6 py-2 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90 transition-opacity"
          >
            {isRegister ? "Iniciar sesión" : "Registrarme"}
          </button>
        </div>

        <div className="glass rounded-2xl p-8 relative overflow-hidden min-h-[380px]">
          <div className={`${fadeTransition} ${isRegister ? "opacity-0 pointer-events-none absolute inset-0 p-8" : "opacity-100"}`}>
            <LoginForm />
          </div>
          <div className={`${fadeTransition} ${isRegister ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0 p-8"}`}>
            <RegisterForm onToggle={() => setIsRegister(false)} />
          </div>
        </div>
      </div>
    </main>
  );
}

function Alert({ message, onClose }: { message: string; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <span>{message}</span>
        {onClose && (
          <button type="button" onClick={onClose} className="text-red-300 hover:text-red-100">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  const checks = [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    { label: "Al menos una mayúscula", met: /[A-Z]/.test(password) },
    { label: "Al menos una minúscula", met: /[a-z]/.test(password) },
    { label: "Al menos un número", met: /\d/.test(password) },
  ];

  return (
    <div className="space-y-1.5">
      {checks.map((check) => (
        <div key={check.label} className="flex items-center gap-2 text-xs">
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold ${
              check.met
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                : "border-zinc-600 text-zinc-600"
            }`}
          >
            {check.met ? "✓" : "•"}
          </span>
          <span className={check.met ? "text-emerald-400" : "text-zinc-400"}>{check.label}</span>
        </div>
      ))}
    </div>
  );
}

function LoginForm() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [touched, setTouched] = useState({ username: false, password: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const errors = {
    username: touched.username ? validateLoginUsername(form.username).message : "",
    password: touched.password ? validateLoginPassword(form.password).message : "",
  };

  const isValid = !errors.username && !errors.password && form.username && form.password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, password: true });
    if (!isValid) return;

    setLoading(true);
    setError("");
    try {
      await apiFetch("auth/login/", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const user = await getCurrentUser();
      if (user.is_superuser) {
        router.push("/dashboard/superadmin");
      } else if (user.role === "gym_admin") {
        router.push("/dashboard/gyms");
      } else {
        router.push(user.profile?.is_complete ? "/dashboard" : "/onboarding");
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Usuario o contraseña incorrectos";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-amber-400 mb-2 text-center">Bienvenido, guerrero</h1>
      <p className="text-zinc-400 text-sm text-center mb-4">Ingresa a tu santuario</p>
      <Alert message={error} onClose={() => setError("")} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <InputField
          type="text"
          placeholder="Usuario"
          value={form.username}
          onChange={(value) => setForm({ ...form, username: value })}
          onBlur={() => setTouched({ ...touched, username: true })}
          error={errors.username}
        />
        <InputField
          type="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={(value) => setForm({ ...form, password: value })}
          onBlur={() => setTouched({ ...touched, password: true })}
          error={errors.password}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </>
  );
}

function RegisterForm({ onToggle }: { onToggle: () => void }) {
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [touched, setTouched] = useState({ username: false, email: false, password: false, confirmPassword: false });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const syncErrors = {
    username: touched.username ? validateUsername(form.username).message : "",
    email: touched.email ? validateEmail(form.email).message : "",
    password: touched.password ? validatePassword(form.password).message : "",
    confirmPassword: touched.confirmPassword ? validateConfirmPassword(form.password, form.confirmPassword).message : "",
  };

  const debouncedCheckUsername = useCallback(
    debounce(async (username: string) => {
      const validation = validateUsername(username);
      if (!validation.valid) {
        setUsernameAvailable(null);
        return;
      }
      setCheckingUsername(true);
      try {
        const data = await apiFetch(`auth/check-username/?username=${encodeURIComponent(username)}`);
        setUsernameAvailable(data.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (form.username.trim()) {
      debouncedCheckUsername(form.username);
    } else {
      setUsernameAvailable(null);
    }
  }, [form.username, debouncedCheckUsername]);

  const usernameStatusMessage =
    touched.username && usernameAvailable === false && !syncErrors.username
      ? "Este usuario ya está en uso."
      : "";

  const isValid =
    !syncErrors.username &&
    !syncErrors.email &&
    !syncErrors.password &&
    !syncErrors.confirmPassword &&
    !usernameStatusMessage &&
    form.username &&
    form.email &&
    form.password &&
    form.confirmPassword &&
    usernameAvailable !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true, confirmPassword: true });
    if (!isValid) return;

    setLoading(true);
    setError("");
    setFieldErrors({});
    try {
      const data = await apiFetch("auth/register/", {
        method: "POST",
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });
      router.push(data.user?.profile?.is_complete ? "/dashboard" : "/onboarding");
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        const data = err.data;
        const messages: string[] = [];
        const newFieldErrors: Record<string, string> = {};
        Object.entries(data).forEach(([key, value]) => {
          if (key === "detail") {
            messages.push(Array.isArray(value) ? value[0] : (value as string));
          } else if (key !== "status") {
            const msg = Array.isArray(value) ? value[0] : (value as string);
            if (typeof msg === "string") {
              newFieldErrors[key] = msg;
              messages.push(msg);
            }
          }
        });
        setFieldErrors(newFieldErrors);
        setError(messages.join(" ") || err.message);
        return;
      }
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  const getUsernameHint = () => {
    if (syncErrors.username) return syncErrors.username;
    if (usernameStatusMessage) return usernameStatusMessage;
    if (checkingUsername) return "Verificando disponibilidad...";
    if (usernameAvailable === true) return "Usuario disponible";
    return "";
  };

  const usernameHintColor =
    usernameAvailable === true && !syncErrors.username
      ? "text-emerald-400"
      : syncErrors.username || usernameStatusMessage
      ? "text-red-400"
      : "text-zinc-400";

  return (
    <>
      <h1 className="text-3xl font-bold text-amber-400 mb-2 text-center">Únete al ejército</h1>
      <p className="text-zinc-400 text-sm text-center mb-4">Forja tu leyenda desde el primer día</p>
      <Alert message={error} onClose={() => setError("")} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <InputField
          type="text"
          placeholder="Usuario"
          value={form.username}
          onChange={(value) => setForm({ ...form, username: value })}
          onBlur={() => setTouched({ ...touched, username: true })}
          error={fieldErrors.username || syncErrors.username || usernameStatusMessage}
          hint={getUsernameHint()}
          hintColor={usernameHintColor}
        />
        <InputField
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(value) => setForm({ ...form, email: value })}
          onBlur={() => setTouched({ ...touched, email: true })}
          error={fieldErrors.email || syncErrors.email}
        />
        <InputField
          type="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={(value) => setForm({ ...form, password: value })}
          onBlur={() => setTouched({ ...touched, password: true })}
        />
        <PasswordChecklist password={form.password} />
        <InputField
          type="password"
          placeholder="Confirmar contraseña"
          value={form.confirmPassword}
          onChange={(value) => setForm({ ...form, confirmPassword: value })}
          onBlur={() => setTouched({ ...touched, confirmPassword: true })}
          error={fieldErrors.confirmPassword || syncErrors.confirmPassword}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Registrando..." : "Registrarme"}
        </button>
      </form>
    </>
  );
}

interface InputFieldProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  hintColor?: string;
}

function InputField({ type, placeholder, value, onChange, onBlur, error, hint, hintColor = "text-zinc-400" }: InputFieldProps) {
  return (
    <div>
      <input
        type={type}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl bg-zinc-900/80 border text-white focus:outline-none transition-colors ${
          error ? "border-red-500 focus:border-red-400" : "border-zinc-700 focus:border-amber-500"
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {(error || hint) && (
        <p className={`mt-1.5 text-xs ${error ? "text-red-400" : hintColor}`}>{error || hint}</p>
      )}
    </div>
  );
}

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
