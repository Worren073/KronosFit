"use client";

import { useEffect, useState } from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createAdminGym, getAdminUsers, ApiError, type AdminGymCreatePayload } from "@/lib/api";
import type { AdminUser } from "@/lib/types";

type EncargadoMode = "none" | "assign" | "create";

function flattenErrors(data: Record<string, unknown>): string[] {
  const out: string[] = [];
  const walk = (value: unknown, prefix = ""): void => {
    if (Array.isArray(value)) {
      value.forEach((v) => walk(v, prefix));
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([k, v]) => {
        walk(v, prefix ? `${prefix} ${k}` : k);
      });
    } else if (typeof value === "string") {
      out.push(prefix ? `${prefix}: ${value}` : value);
    }
  };
  walk(data);
  return out;
}

interface CreateGymModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateGymModal({ open, onClose, onCreated }: CreateGymModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<EncargadoMode>("none");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [assignedId, setAssignedId] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setName("");
    setAddress("");
    setPhone("");
    setMode("none");
    setAssignedId("");
    setUsername("");
    setEmail("");
    setPassword("");
    setErrors([]);
    getAdminUsers()
      .then((u) => setUsers(u.filter((item) => !item.is_superuser)))
      .catch(() => setUsers([]));
  }, [open]);

  if (!open) return null;

  const isValid = () => {
    if (!name.trim()) return false;
    if (mode === "assign" && !assignedId) return false;
    if (mode === "create") {
      return username.trim() && email.trim() && password;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid()) {
      setErrors(["Completá los campos obligatorios."]);
      return;
    }
    setSaving(true);
    setErrors([]);
    const payload: AdminGymCreatePayload = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
    };
    if (mode === "assign" && assignedId) payload.gym_admin_id = Number(assignedId);
    if (mode === "create") {
      payload.new_gym_admin = {
        username: username.trim(),
        email: email.trim(),
        password,
      };
    }
    try {
      await createAdminGym(payload);
      onCreated();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrors(flattenErrors(err.data));
      } else {
        setErrors(["No se pudo crear el gimnasio. Verificá los datos."]);
      }
    } finally {
      setSaving(false);
    }
  };

  const modeButton = (value: EncargadoMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
        mode === value
          ? "border-amber-500/60 text-amber-400 bg-amber-500/10"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto">
      <div className="glass rounded-3xl p-6 w-full max-w-lg my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Crear gimnasio</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-zinc-400"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 space-y-1">
            {errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-zinc-400 text-sm mb-1">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="Templo Nuevo"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-left">
              <label className="block text-zinc-400 text-sm mb-1">Dirección</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input w-full"
                placeholder="Opcional"
              />
            </div>
            <div className="text-left">
              <label className="block text-zinc-400 text-sm mb-1">Teléfono</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input w-full"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div>
            <p className="text-zinc-400 text-sm mb-2">Encargado de gimnasio</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {modeButton("none", "Sin encargado")}
              {modeButton("assign", "Asignar existente")}
              {modeButton("create", "Crear cuenta")}
            </div>

            {mode === "assign" && (
              <div className="text-left">
                <label className="block text-zinc-400 text-sm mb-1">Usuario</label>
                <select
                  className="input w-full"
                  value={assignedId}
                  onChange={(e) => setAssignedId(e.target.value)}
                >
                  <option value="">Seleccioná un usuario...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} · {u.email || "sin email"}
                    </option>
                  ))}
                </select>
                {users.length === 0 && (
                  <p className="text-xs text-zinc-500 mt-1">No hay usuarios disponibles.</p>
                )}
              </div>
            )}

            {mode === "create" && (
              <div className="space-y-3 bg-zinc-900/50 rounded-xl p-4">
                <div className="text-left">
                  <label className="block text-zinc-400 text-sm mb-1">Nombre de usuario</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input w-full"
                    placeholder="encargado"
                    required
                  />
                </div>
                <div className="text-left">
                  <label className="block text-zinc-400 text-sm mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input w-full"
                    placeholder="encargado@gimnasio.com"
                    required
                  />
                </div>
                <div className="text-left">
                  <label className="block text-zinc-400 text-sm mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input w-full"
                    placeholder="Mínimo 8 caracteres, mayúscula, minúscula y número"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-white/5 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl gold-gradient text-black font-bold hover:opacity-90 disabled:opacity-70 transition-opacity text-sm"
            >
              <CheckIcon className="w-4 h-4" />
              {saving ? "Creando..." : "Crear gimnasio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}