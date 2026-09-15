"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useDashboardStore } from "@/stores/dashboardStore";
import { getPortalNavSections, getPortalNavItems, getActiveNavItem } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useDashboardStore();

  const sections = getPortalNavSections(user);
  const activeHref = getActiveNavItem(pathname, getPortalNavItems(user))?.href ?? null;

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden md:flex fixed left-4 top-24 bottom-4 z-30 flex-col glass rounded-3xl shadow-2xl shadow-black/50 overflow-hidden"
      whileHover={{ width: 192 }}
      style={{ width: 72 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <nav className="flex flex-col gap-4 p-3">
        {sections.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? "pt-3 border-t border-amber-500/10" : ""}>
            <div className="flex flex-col gap-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeHref === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-4 px-3 py-3 rounded-2xl transition-colors ${
                      isActive
                        ? "text-black"
                        : "text-white hover:bg-white/5 hover:text-amber-200"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-sidebar"
                        className="absolute inset-0 rounded-2xl gold-gradient shadow-lg shadow-amber-500/30"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className="w-6 h-6 flex-shrink-0 relative z-10" />
                    <motion.span
                      className="relative z-10 whitespace-nowrap text-sm font-medium overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {item.label}
                    </motion.span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </motion.aside>
  );
}