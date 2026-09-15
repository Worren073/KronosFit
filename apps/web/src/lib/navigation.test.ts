import { describe, expect, it } from "vitest";
import { getPortalNavItems, canAccess } from "./navigation";

function makeUser(role: string, is_superuser = false) {
  return { role, is_superuser };
}

const hrefs = (role: string, isSuper = false) =>
  getPortalNavItems(makeUser(role, isSuper)).map((i) => i.href);

describe("getPortalNavItems", () => {
  it("devuelve el menú completo de usuario para rol user", () => {
    expect(hrefs("user")).toEqual([
      "/dashboard",
      "/dashboard/nutrition",
      "/dashboard/workouts",
      "/dashboard/progress",
      "/dashboard/gyms",
      "/dashboard/profile",
    ]);
  });

  it("devuelve el menú completo para trainer", () => {
    expect(hrefs("trainer")).toContain("/dashboard/workouts");
    expect(hrefs("trainer")).toContain("/dashboard/gyms");
  });

  it("gym_admin ve Gimnasio, Atletas, Eventos y Perfil", () => {
    expect(hrefs("gym_admin")).toEqual([
      "/dashboard/gyms",
      "/dashboard/gyms/athletes",
      "/dashboard/gyms/events",
      "/dashboard/profile",
    ]);
  });

  it("superadmin ve los 3 módulos del portal y Perfil", () => {
    expect(hrefs("user", true)).toEqual([
      "/dashboard/superadmin",
      "/dashboard/superadmin/users",
      "/dashboard/superadmin/gyms",
      "/dashboard/profile",
    ]);
  });
});

describe("canAccess", () => {
  it("usuario tiene acceso al portal principal y no a superadmin", () => {
    const user = makeUser("user");
    expect(canAccess("/dashboard", user)).toBe(true);
    expect(canAccess("/dashboard/workouts/generate", user)).toBe(true);
    expect(canAccess("/dashboard/gyms", user)).toBe(true);
    expect(canAccess("/dashboard/superadmin", user)).toBe(false);
  });

  it("gym_admin no accede al dashboard principal ni superadmin", () => {
    const admin = makeUser("gym_admin");
    expect(canAccess("/dashboard/gyms", admin)).toBe(true);
    expect(canAccess("/dashboard/gyms/whatever", admin)).toBe(true);
    expect(canAccess("/dashboard/profile", admin)).toBe(true);
    expect(canAccess("/dashboard", admin)).toBe(false);
    expect(canAccess("/dashboard/workouts", admin)).toBe(false);
    expect(canAccess("/dashboard/progress", admin)).toBe(false);
    expect(canAccess("/dashboard/superadmin", admin)).toBe(false);
  });

  it("superadmin solo accede a su portal y perfil", () => {
    const superuser = makeUser("user", true);
    expect(canAccess("/dashboard/superadmin", superuser)).toBe(true);
    expect(canAccess("/dashboard/superadmin/users", superuser)).toBe(true);
    expect(canAccess("/dashboard/superadmin/gyms", superuser)).toBe(true);
    expect(canAccess("/dashboard/profile", superuser)).toBe(true);
    expect(canAccess("/dashboard", superuser)).toBe(false);
    expect(canAccess("/dashboard/gyms", superuser)).toBe(false);
    expect(canAccess("/dashboard/workouts", superuser)).toBe(false);
  });

  it("sin usuario no hay acceso", () => {
    expect(canAccess("/dashboard", null)).toBe(false);
  });
});