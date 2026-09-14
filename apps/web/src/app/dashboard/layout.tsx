"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, notFound } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Topbar } from "@/components/dashboard/Topbar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { AssistantButton } from "@/components/ai/AssistantButton";
import { ChatDrawer } from "@/components/ai/ChatDrawer";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDashboardStore } from "@/stores/dashboardStore";
import { canAccess } from "@/lib/navigation";
import { ApiError, refreshSession } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userInitialized, fetchUser } = useDashboardStore();
  const [checking, setChecking] = useState(!userInitialized);
  const [chatOpen, setChatOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const id = setInterval(() => {
      refreshSession();
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (userInitialized) {
      setChecking(false);
      return;
    }

    fetchUser()
      .then((u) => {
        if (u && !u.is_superuser && !u.profile?.is_complete && pathname !== "/onboarding") {
          router.push("/onboarding");
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
        }
      })
      .finally(() => setChecking(false));
  }, [fetchUser, userInitialized, pathname, router]);

  if (checking) {
    return <DashboardSkeleton />;
  }

  if (!user) return null;

  if (!canAccess(pathname, user)) {
    notFound();
  }

  if (pathname === "/dashboard/workouts/generate" || pathname === "/dashboard/workouts/session") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex flex-col">
      <Topbar />
      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 md:pl-28">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav />
      <AssistantButton onClick={() => setChatOpen(true)} />
      <ChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex flex-col">
      <header className="sticky top-0 z-40 glass border-b border-amber-500/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-24" />
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        <aside className="hidden md:flex fixed left-4 top-24 bottom-4 z-30 flex-col glass rounded-3xl w-[72px] p-3 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-full aspect-square rounded-2xl" />
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 md:pl-28">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-80 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
