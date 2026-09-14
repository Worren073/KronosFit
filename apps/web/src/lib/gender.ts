export const GENDER_OPTIONS = [
  { key: "male", label: "Masculino" },
  { key: "female", label: "Femenino" },
  { key: "other", label: "Otro" },
  { key: "prefer_not_to_say", label: "Prefiero no decirlo" },
];

export const GENDER_LABELS = Object.fromEntries(GENDER_OPTIONS.map((g) => [g.key, g.label]));
