import { motion, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down";
  duration?: number;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  duration = 0.25,
}: FadeInProps) {
  const yOffset = direction === "up" ? 12 : -12;

  const transition: Transition = {
    duration,
    delay,
    ease: "easeOut",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      style={{ opacity: 0 }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
