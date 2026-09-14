import { Skeleton } from "./Skeleton";

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className || ""}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton className={`h-32 w-full ${className || ""}`} />;
}

export function SkeletonCircle({ className }: { className?: string }) {
  return <Skeleton className={`rounded-full ${className || ""}`} />;
}

export function SkeletonRect({ className }: { className?: string }) {
  return <Skeleton className={`${className || ""}`} />;
}

export function SkeletonChart({ className }: { className?: string }) {
  return <Skeleton className={`h-64 w-full ${className || ""}`} />;
}
