export interface ValidationResult {
  valid: boolean;
  message: string;
}

export function validateUsername(username: string): ValidationResult {
  const value = username.trim();
  if (!value) {
    return { valid: false, message: "El usuario es requerido." };
  }
  if (value.length < 3) {
    return { valid: false, message: "El usuario debe tener al menos 3 caracteres." };
  }
  if (value.length > 30) {
    return { valid: false, message: "El usuario no puede tener más de 30 caracteres." };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return { valid: false, message: "Solo letras, números y guiones bajos." };
  }
  return { valid: true, message: "" };
}

export function validateEmail(email: string): ValidationResult {
  const value = email.trim();
  if (!value) {
    return { valid: false, message: "El email es requerido." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { valid: false, message: "Ingresa un email válido." };
  }
  return { valid: true, message: "" };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, message: "La contraseña es requerida." };
  }
  if (password.length < 8) {
    return { valid: false, message: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: "Debe contener al menos una minúscula." };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: "Debe contener al menos una mayúscula." };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: "Debe contener al menos un número." };
  }
  return { valid: true, message: "" };
}

export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return { valid: false, message: "Confirma tu contraseña." };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: "Las contraseñas no coinciden." };
  }
  return { valid: true, message: "" };
}

export function validateLoginUsername(username: string): ValidationResult {
  const value = username.trim();
  if (!value) {
    return { valid: false, message: "El usuario es requerido." };
  }
  return { valid: true, message: "" };
}

export function validateLoginPassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, message: "La contraseña es requerida." };
  }
  return { valid: true, message: "" };
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;
