"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useDashboardStore } from "@/stores/dashboardStore";
import { getPortalNavItems } from "@/lib/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useDashboardStore();

  const navItems = getPortalNavItems(user);

  const isActiveFor = (item: { href: string }) =>
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const activeIndex = navItems.findIndex(isActiveFor);

  return (
    <nav
      className="md:hidden fixed left-4 right-4 z-40 glass rounded-3xl shadow-2xl shadow-black/50 px-2 py-3"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <ul className="relative flex items-center justify-around">
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl gold-gradient shadow-lg shadow-amber-500/30"
          initial={false}
          animate={{
            left: `${(activeIndex / navItems.length) * 100 + 100 / (navItems.length * 2)}%`,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveFor(item);
          return (
            <li key={item.href} className="relative z-10 flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2 transition-colors ${
                  isActive ? "text-black" : "text-zinc-400"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}