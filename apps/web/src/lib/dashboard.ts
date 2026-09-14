import type { ProgressData } from './types';

export function todayCalories(progress: ProgressData | null): number {
  if (!progress?.nutrition?.length) return 0;
  const today = new Date().toISOString().split('T')[0];
  return progress.nutrition.find((d) => d.date === today)?.calories || 0;
}

export function todayWater(progress: ProgressData | null): string {
  if (!progress?.nutrition?.length) return '0.0';
  const today = new Date().toISOString().split('T')[0];
  const ml = progress.nutrition.find((d) => d.date === today)?.water || 0;
  return (ml / 1000).toFixed(1);
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
