"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useDashboardStore } from "@/stores/dashboardStore";
import { getPortalNavItems } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useDashboardStore();

  const navItems = getPortalNavItems(user);

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden md:flex fixed left-4 top-24 bottom-4 z-30 flex-col glass rounded-3xl shadow-2xl shadow-black/50 overflow-hidden"
      whileHover={{ width: 192 }}
      style={{ width: 72 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <nav className="flex flex-col gap-2 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-3 py-3 rounded-2xl transition-colors ${
                isActive
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-white hover:bg-white/5 hover:text-amber-200"
              }`}
            >
              <Icon className="w-6 h-6 flex-shrink-0" />
              <motion.span
                className="whitespace-nowrap text-sm font-medium overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {item.label}
              </motion.span>
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}