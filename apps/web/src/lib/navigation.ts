import type { ComponentType } from "react";
import {
  HomeIcon,
  FireIcon,
  CakeIcon,
  ChartBarIcon,
  UserCircleIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import type { User } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const USER_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/dashboard/nutrition", label: "Nutrición", icon: CakeIcon },
  { href: "/dashboard/workouts", label: "Rutinas", icon: FireIcon },
  { href: "/dashboard/progress", label: "Progreso", icon: ChartBarIcon },
  { href: "/dashboard/gyms", label: "Gimnasio", icon: BuildingStorefrontIcon },
  { href: "/dashboard/profile", label: "Perfil", icon: UserCircleIcon },
];

const GYM_ADMIN_ITEMS: NavItem[] = [
  { href: "/dashboard/gyms", label: "Gimnasio", icon: BuildingStorefrontIcon },
  { href: "/dashboard/gyms/athletes", label: "Atletas", icon: UserGroupIcon },
  { href: "/dashboard/gyms/events", label: "Eventos", icon: CalendarDaysIcon },
  { href: "/dashboard/profile", label: "Perfil", icon: UserCircleIcon },
];

const SUPERADMIN_SECTIONS: NavSection[] = [
  {
    title: "Dashboard",
    items: [{ href: "/dashboard/superadmin", label: "Admin", icon: ShieldCheckIcon }],
  },
  {
    title: "Usuarios",
    items: [{ href: "/dashboard/superadmin/users", label: "Usuarios", icon: UserGroupIcon }],
  },
  {
    title: "Gimnasio",
    items: [{ href: "/dashboard/superadmin/gyms", label: "Gimnasios", icon: BuildingStorefrontIcon }],
  },
  {
    title: "Cuenta",
    items: [{ href: "/dashboard/profile", label: "Perfil", icon: UserCircleIcon }],
  },
];

type RoleInfo = Pick<User, "is_superuser" | "role">;

const MAIN_SECTION_TITLE = "Principal";

export function getPortalNavSections(user: RoleInfo | null): NavSection[] {
  if (!user) return [{ title: MAIN_SECTION_TITLE, items: USER_ITEMS }];
  if (user.is_superuser) return SUPERADMIN_SECTIONS;
  if (user.role === "gym_admin") {
    return [{ title: MAIN_SECTION_TITLE, items: GYM_ADMIN_ITEMS }];
  }
  return [{ title: MAIN_SECTION_TITLE, items: USER_ITEMS }];
}

export function getPortalNavItems(user: RoleInfo | null): NavItem[] {
  return getPortalNavSections(user).flatMap((section) => section.items);
}

export function getActiveNavItem(pathname: string, items: NavItem[]): NavItem | null {
  const matches = items.filter((item) => {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  });
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.href.length - a.href.length)[0];
}

export function canAccess(pathname: string, user: RoleInfo | null): boolean {
  if (!user) return false;
  return getPortalNavItems(user).some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
  );
}