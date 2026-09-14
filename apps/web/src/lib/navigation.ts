import type { ComponentType } from "react";
import {
  HomeIcon,
  FireIcon,
  CakeIcon,
  ChartBarIcon,
  UserCircleIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import type { User } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
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
  { href: "/dashboard/profile", label: "Perfil", icon: UserCircleIcon },
];

const SUPERADMIN_ITEMS: NavItem[] = [
  { href: "/dashboard/superadmin", label: "Admin", icon: ShieldCheckIcon },
  { href: "/dashboard/profile", label: "Perfil", icon: UserCircleIcon },
];

type RoleInfo = Pick<User, "is_superuser" | "role">;

export function getPortalNavItems(user: RoleInfo | null): NavItem[] {
  if (!user) return USER_ITEMS;
  if (user.is_superuser) return SUPERADMIN_ITEMS;
  if (user.role === "gym_admin") return GYM_ADMIN_ITEMS;
  return USER_ITEMS;
}

export function canAccess(pathname: string, user: RoleInfo | null): boolean {
  if (!user) return false;
  return getPortalNavItems(user).some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
  );
}