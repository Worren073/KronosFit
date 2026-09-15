"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useDashboardStore } from "@/stores/dashboardStore";
import { getPortalNavItems, getActiveNavItem } from "@/lib/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useDashboardStore();

  const navItems = getPortalNavItems(user);
  const activeHref = getActiveNavItem(pathname, navItems)?.href ?? null;

  return (
    <nav
      className="md:hidden fixed left-4 right-4 z-40 glass rounded-3xl shadow-2xl shadow-black/50 px-2 py-3"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <ul className="relative flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref === item.href;
          return (
            <li key={item.href} className="relative flex-1">
              <Link
                href={item.href}
                className={`relative flex flex-col items-center gap-1 py-2 rounded-2xl transition-colors ${
                  isActive ? "text-black" : "text-zinc-400"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active-bottombar"
                    className="absolute inset-0 rounded-2xl gold-gradient shadow-lg shadow-amber-500/30"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="w-6 h-6 relative z-10" />
                <span className="text-[10px] font-medium relative z-10">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}