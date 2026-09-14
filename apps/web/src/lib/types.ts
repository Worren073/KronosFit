export interface UserProfile {
  first_name: string;
  last_name: string;
  gender: string;
  age: number | null;
  weight: number | null;
  height: number | null;
  profile_picture: string;
  gym_name: string;
  trainer_name: string;
  experience: string;
  is_complete: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_superuser: boolean;
  managed_gym: number | null;
  profile: UserProfile;
}

export interface Workout {
  id: number;
  name: string;
  date: string;
  duration_minutes: number;
  calories_burned: number | null;
  notes: string;
  exercises: Exercise[];
}

export interface ExerciseSet {
  id: number;
  set_number: number;
  reps: number | null;
  weight: number | null;
  completed_at: string | null;
}

export interface Exercise {
  id: number;
  name: string;
  description: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight: number | null;
  set_logs?: ExerciseSet[];
}

export interface Meal {
  id: number;
  name: string;
  date: string;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
}

export interface MealSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_count: number;
}

export interface WaterIntake {
  id: number;
  date: string;
  milliliters: number;
}

export interface WeightEntry {
  id: number;
  date: string;
  weight: number;
}

export interface CalendarDay {
  id: number;
  name: string;
  duration_minutes: number;
}

export interface Gym {
  id: number;
  name: string;
  slug: string;
  address: string;
  phone: string;
  owner: number;
  is_active: boolean;
  qr_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GymMembership {
  id: number;
  user: number;
  gym: number;
  role: 'member' | 'trainer' | 'admin';
  assigned_trainer: number | null;
  is_active: boolean;
  joined_at: string;
}

export interface GymPlan {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_days: number;
  is_active: boolean;
  created_at: string;
}

export interface GymSubscription {
  id: number;
  gym: number;
  user: number;
  plan: number | null;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
}

export interface GymEvent {
  id: number;
  gym: number;
  title: string;
  description: string;
  starts_at: string;
  is_active: boolean;
  created_at: string;
}

export interface GymRoles {
  is_admin: boolean;
  is_trainer: boolean;
  is_member: boolean;
}

export interface MyGymData {
  gym: Gym | null;
  membership: GymMembership | null;
  subscription: {
    id: number;
    status: string;
    start_date: string;
    end_date: string;
    plan: GymPlan | null;
  } | null;
  days_remaining: number | null;
  attendance_count: number;
  events: GymEvent[];
  roles: GymRoles;
}

export interface MemberSummary {
  membership_id: number;
  role: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  subscription: {
    id: number;
    status: string;
    end_date: string;
    days_remaining: number;
    plan: GymPlan | null;
  } | null;
  trainer: GymMembership | null;
}

export interface TrainerAthlete {
  membership_id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  role: string;
  subscription: {
    status: string;
    end_date: string;
    days_remaining: number;
  } | null;
  attendance_count: number;
}

export interface AthleteDashboard {
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  profile: UserProfile | null;
  last_weight: { date: string; weight: string } | null;
  workouts_30d: number;
  nutrition_today: { calories: number; water_ml: number };
  subscription: { status: string; end_date: string; days_remaining: number } | null;
  attendance_count: number;
}

export interface GymAdminDashboard {
  active_subscriptions: number;
  expired_subscriptions: number;
  today_attendance: number;
  new_members_month: number;
  athletes_count: number;
  trainers_count: number;
  members: MemberSummary[];
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  managed_gym: number | null;
  date_joined: string;
  last_login: string | null;
}

export interface AdminStats {
  gyms: number;
  memberships: number;
  plans: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  today_attendance: number;
  events: number;
  users: number;
}

export interface AdminGym extends Gym {
  managed_admins: { id: number; username: string; email: string; is_active: boolean }[];
}

export interface CalendarData {
  year: number;
  month: number;
  days: Record<number, CalendarDay[]>;
}

export interface ProgressData {
  workouts: { date: string; duration: number; count: number }[];
  nutrition: { date: string; calories: number; protein: number; carbs: number; fat: number; water: number }[];
  weight: { date: string; weight: number }[];
  totals: {
    total_workouts: number;
    total_minutes: number;
    total_calories_burned: number;
    total_meals: number;
    total_water_ml: number;
  };
}

export interface RoutineExercise {
  id?: number;
  name: string;
  description?: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight?: number | null;
  notes?: string;
  order?: number;
}

export interface RoutineDay {
  id?: number;
  day_name: string;
  muscle_groups: string;
  order?: number;
  exercises: RoutineExercise[];
}

export interface Routine {
  id?: number;
  name: string;
  focus: string;
  days_per_week: number;
  estimated_duration_minutes: number;
  generated_by_ai?: boolean;
  created_at?: string;
  days: RoutineDay[];
}

export type RoutineWizardAnswers = {
  goal: string;
  days_per_week: number;
  minutes_per_session: number;
  equipment: string;
  split_style: string;
  injuries: string;
  notes: string;
};

export interface GeneratedRoutineResponse {
  message: string;
  routine_id: number;
  routine: Routine;
}

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};
