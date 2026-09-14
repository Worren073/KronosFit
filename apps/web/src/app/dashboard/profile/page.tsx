"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserCircleIcon,
  KeyIcon,
  ArrowRightStartOnRectangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { updateProfile, changePassword, logout, ApiError } from "@/lib/api";
import { useDashboardStore } from "@/stores/dashboardStore";
import { GENDER_OPTIONS } from "@/lib/gender";
import { EXPERIENCE_LEVELS } from "@/lib/experience";
import { FadeIn } from "@/components/ui/FadeIn";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMinimumSkeleton } from "@/hooks/useMinimumSkeleton";

export default function ProfilePage() {
  const { user, fetchUser, reset } = useDashboardStore();
  const router = useRouter();
  const ready = useMinimumSkeleton(500);

  const [form, setForm] = useState(() => ({
    first_name: user?.profile?.first_name || "",
    last_name: user?.profile?.last_name || "",
    gender: user?.profile?.gender || "",
    age: user?.profile?.age != null ? String(user.profile.age) : "",
    weight: user?.profile?.weight != null ? String(user.profile.weight) : "",
    height: user?.profile?.height != null ? String(user.profile.height) : "",
    gym_name: user?.profile?.gym_name || "",
    trainer_name: user?.profile?.trainer_name || "",
    profile_picture: user?.profile?.profile_picture || "",
    experience: user?.profile?.experience || "",
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [password, setPassword] = useState({ old_password: "", new_password: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [logoutSaving, setLogoutSaving] = useState(false);

  if (!user) {
    return <ProfileSkeleton />;
  }

  if (!ready) {
    return <ProfileSkeleton />;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender,
        age: form.age ? Number(form.age) : null,
        weight: form.weight ? Number(form.weight) : null,
        height: form.height ? Number(form.height) : null,
        gym_name: form.gym_name,
        trainer_name: form.trainer_name,
        profile_picture: form.profile_picture,
        experience: form.experience,
      });
      await fetchUser();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage("");
    setPasswordError("");
    if (password.new_password !== password.confirm) {
      setPasswordError("Las contraseñas no coinciden.");
      setPasswordSaving(false);
      return;
    }
    try {
      await changePassword(password.old_password, password.new_password);
      setPasswordMessage("Contraseña actualizada correctamente.");
      setPassword({ old_password: "", new_password: "", confirm: "" });
    } catch (err) {
      if (err instanceof ApiError && typeof err.data.old_password === "string") {
        setPasswordError(err.data.old_password);
      } else if (err instanceof ApiError && Array.isArray(err.data.new_password)) {
        setPasswordError(err.data.new_password.join(" "));
      } else {
        setPasswordError(err instanceof Error ? err.message : "Error al cambiar la contraseña");
      }
      setPasswordMessage("");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    setLogoutSaving(true);
    try {
      await logout();
    } catch {
      // ignore
    }
    reset();
    router.push("/login");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <UserCircleIcon className="w-8 h-8 text-amber-400" />
          Mi perfil
        </h1>
      </FadeIn>

      <FadeIn delay={0.05} className="glass rounded-3xl p-6">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full gold-gradient flex items-center justify-center shadow-lg shadow-amber-500/20">
              <UserCircleIcon className="w-12 h-12 text-black" />
            </div>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-xl font-bold text-white">
              {user.profile?.first_name || user.username} {user.profile?.last_name}
            </h2>
            <p className="text-zinc-400 text-sm">@{user.username}</p>
            <span className="inline-block mt-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase">
              {user.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Nombre</label>
              <input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Tu nombre" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Apellido</label>
              <input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Tu apellido" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Género</label>
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Seleccionar</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Edad</label>
              <input className="input" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="Edad" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Peso (kg)</label>
              <input className="input" type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="Peso en kg" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Altura (cm)</label>
              <input className="input" type="number" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder="Altura en cm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Experiencia</label>
              <select className="input" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })}>
                <option value="">Seleccionar</option>
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl.key} value={lvl.key}>{lvl.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Foto de perfil (URL)</label>
              <input className="input" value={form.profile_picture} onChange={(e) => setForm({ ...form, profile_picture: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Gimnasio</label>
              <input className="input" value={form.gym_name} onChange={(e) => setForm({ ...form, gym_name: e.target.value })} placeholder="Nombre del gimnasio" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Entrenador</label>
              <input className="input" value={form.trainer_name} onChange={(e) => setForm({ ...form, trainer_name: e.target.value })} placeholder="Nombre del entrenador" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {saved && (
            <p className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircleIcon className="w-5 h-5" />
              Perfil guardado. Tu nuevo peso quedó registrado en el historial.
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </FadeIn>

      <FadeIn delay={0.15} className="glass rounded-3xl p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          <KeyIcon className="w-6 h-6 text-amber-400" />
          Cambiar contraseña
        </h2>
        <form onSubmit={handlePassword} className="space-y-3 max-w-md">
          <input className="input" type="password" placeholder="Contraseña actual" value={password.old_password} onChange={(e) => setPassword({ ...password, old_password: e.target.value })} required />
          <input className="input" type="password" placeholder="Nueva contraseña" value={password.new_password} onChange={(e) => setPassword({ ...password, new_password: e.target.value })} required />
          <input className="input" type="password" placeholder="Confirmar nueva contraseña" value={password.confirm} onChange={(e) => setPassword({ ...password, confirm: e.target.value })} required />
          {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
          {passwordMessage && (
            <p className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircleIcon className="w-5 h-5" />
              {passwordMessage}
            </p>
          )}
          <button type="submit" disabled={passwordSaving} className="px-6 py-3 rounded-xl border border-amber-500/40 text-amber-400 font-bold text-sm hover:bg-amber-500/10 transition-colors disabled:opacity-40">
            {passwordSaving ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>
      </FadeIn>

      <FadeIn delay={0.25} className="glass rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Cerrar sesión</h2>
          <p className="text-zinc-400 text-sm">Terminarás tu sesión en este dispositivo.</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={logoutSaving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-red-500/40 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors disabled:opacity-40"
        >
          <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
          {logoutSaving ? "Saliendo..." : "Salir"}
        </button>
      </FadeIn>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}