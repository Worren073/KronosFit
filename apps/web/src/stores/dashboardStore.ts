import { create } from "zustand";
import {
  getCurrentUser,
  getCalendar,
  getProgress,
  getWorkouts,
  getMeals,
  getWaterIntakes,
  getRoutines,
} from "@/lib/api";
import type { User, CalendarData, ProgressData, Workout, Meal, WaterIntake, Routine } from "@/lib/types";

interface DashboardState {
  user: User | null;
  userInitialized: boolean;

  calendar: CalendarData | null;
  calendarKey: string;
  calendarLoading: boolean;
  calendarInitialized: boolean;

  progress: ProgressData | null;
  progressLoading: boolean;
  progressInitialized: boolean;

  workouts: Workout[];
  workoutsLoading: boolean;
  workoutsInitialized: boolean;

  routines: Routine[];
  routinesLoading: boolean;
  routinesInitialized: boolean;

  meals: Meal[];
  water: WaterIntake[];
  nutritionLoading: boolean;
  nutritionInitialized: boolean;

  fetchUser: () => Promise<User | null>;
  fetchCalendar: (year: number, month: number) => Promise<void>;
  fetchProgress: () => Promise<void>;
  fetchWorkouts: () => Promise<void>;
  fetchRoutines: () => Promise<void>;
  fetchNutrition: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  user: null,
  userInitialized: false,

  calendar: null,
  calendarKey: "",
  calendarLoading: false,
  calendarInitialized: false,

  progress: null,
  progressLoading: false,
  progressInitialized: false,

  workouts: [],
  workoutsLoading: false,
  workoutsInitialized: false,

  routines: [],
  routinesLoading: false,
  routinesInitialized: false,

  meals: [],
  water: [],
  nutritionLoading: false,
  nutritionInitialized: false,
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  ...initialState,

  fetchUser: async () => {
    const user = await getCurrentUser();
    set({ user, userInitialized: true });
    return user;
  },

  fetchCalendar: async (year, month) => {
    const key = `${year}-${month}`;
    set({ calendarLoading: true });
    try {
      const calendar = await getCalendar(year, month);
      set({ calendar, calendarKey: key, calendarInitialized: true });
    } finally {
      set({ calendarLoading: false });
    }
  },

  fetchProgress: async () => {
    set({ progressLoading: true });
    try {
      const progress = await getProgress();
      set({ progress, progressInitialized: true });
    } finally {
      set({ progressLoading: false });
    }
  },

  fetchWorkouts: async () => {
    set({ workoutsLoading: true });
    try {
      const workouts = await getWorkouts();
      set({ workouts, workoutsInitialized: true });
    } finally {
      set({ workoutsLoading: false });
    }
  },

  fetchRoutines: async () => {
    set({ routinesLoading: true });
    try {
      const routines = await getRoutines();
      set({ routines, routinesInitialized: true });
    } finally {
      set({ routinesLoading: false });
    }
  },

  fetchNutrition: async () => {
    set({ nutritionLoading: true });
    try {
      const [meals, water] = await Promise.all([getMeals(), getWaterIntakes()]);
      set({ meals, water, nutritionInitialized: true });
    } finally {
      set({ nutritionLoading: false });
    }
  },

  reset: () => set(initialState),
}));
