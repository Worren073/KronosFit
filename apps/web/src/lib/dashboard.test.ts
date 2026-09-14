import { describe, it, expect } from 'vitest';
import { todayCalories, todayWater, getDaysInMonth, getFirstDayOfMonth } from './dashboard';
import type { ProgressData } from './types';

const today = new Date().toISOString().split('T')[0];

function buildProgress(overrides: Partial<ProgressData['nutrition'][0]> = {}): ProgressData {
  return {
    workouts: [],
    nutrition: [{ date: today, calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, ...overrides }],
    weight: [],
    totals: {
      total_workouts: 0,
      total_minutes: 0,
      total_calories_burned: 0,
      total_meals: 0,
      total_water_ml: 0,
    },
  };
}

describe('todayCalories', () => {
  it('returns 0 when progress is null', () => {
    expect(todayCalories(null)).toBe(0);
  });

  it('returns calories for today', () => {
    const progress = buildProgress({ calories: 2500 });
    expect(todayCalories(progress)).toBe(2500);
  });
});

describe('todayWater', () => {
  it('returns 0.0 when progress is null', () => {
    expect(todayWater(null)).toBe('0.0');
  });

  it('returns liters for today', () => {
    const progress = buildProgress({ water: 1500 });
    expect(todayWater(progress)).toBe('1.5');
  });
});

describe('date helpers', () => {
  it('returns correct days in month', () => {
    expect(getDaysInMonth(2026, 1)).toBe(28); // February
    expect(getDaysInMonth(2026, 8)).toBe(30); // September
  });

  it('returns correct first day of month', () => {
    // September 1, 2026 is Tuesday (2)
    expect(getFirstDayOfMonth(2026, 8)).toBe(2);
  });
});
