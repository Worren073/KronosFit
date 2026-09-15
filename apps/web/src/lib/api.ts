import type {
  User,
  UserProfile,
  WeightEntry,
  MealSummary,
  Workout,
  Exercise,
  ExerciseSet,
  Meal,
  WaterIntake,
  CalendarData,
  ProgressData,
  Routine,
  RoutineWizardAnswers,
  GeneratedRoutineResponse,
  ChatMessage,
  Gym,
  GymMembership,
  GymPlan,
  GymEvent,
  GymSubscription,
  MyGymData,
  TrainerAthlete,
  AthleteDashboard,
  GymAdminDashboard,
  AdminUser,
  AdminStats,
  AdminGym,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let refreshPromise: Promise<boolean> | null = null;

function isAuthPath(path: string): boolean {
  return path.replace(/^\//, '').startsWith('auth/');
}

async function attemptRefresh(): Promise<boolean> {
  const url = `${API_BASE.replace(/\/$/, '')}/auth/refresh/`;
  try {
    const res = await fetch(url, { method: 'POST', credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = attemptRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function refreshSession(): Promise<boolean> {
  if (await refreshOnce()) return true;
  await new Promise((r) => setTimeout(r, 150));
  return refreshOnce();
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const doFetch = () => fetch(url, { ...options, headers, credentials: 'include' });
  let res = await doFetch();
  if (res.status === 401 && !isAuthPath(path) && (await refreshSession())) {
    res = await doFetch();
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      typeof data.detail === 'string'
        ? data.detail
        : typeof data.message === 'string'
        ? data.message
        : `HTTP ${res.status}`;
    throw new ApiError(message, res.status, data);
  }
  if (res.status === 204) return null;
  return res.json();
}

function unwrapPagination<T>(data: T[] | { results: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { results: T[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return data as unknown as T[];
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch('users/me/');
}

export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  return apiFetch('users/me/profile/', { method: 'PUT', body: JSON.stringify(data) });
}

export async function changePassword(old_password: string, new_password: string): Promise<{ detail: string }> {
  return apiFetch('auth/change-password/', {
    method: 'POST',
    body: JSON.stringify({ old_password, new_password }),
  });
}

export async function logout() {
  await apiFetch('/auth/logout/', { method: 'POST' });
}

export async function getWorkouts(): Promise<Workout[]> {
  return unwrapPagination<Workout>(await apiFetch('workouts/'));
}

export async function getWorkout(id: number): Promise<Workout> {
  return apiFetch(`workouts/${id}/`);
}

export async function deleteWorkout(id: number) {
  return apiFetch(`workouts/${id}/`, { method: 'DELETE' });
}

export async function getExercises(workoutId: number): Promise<Exercise[]> {
  return unwrapPagination<Exercise>(await apiFetch(`workouts/${workoutId}/exercises/`));
}

function withDateParams(base: string, params?: { date_from?: string; date_to?: string; date?: string }): string {
  const search = new URLSearchParams();
  if (params?.date_from) search.set('date_from', params.date_from);
  if (params?.date_to) search.set('date_to', params.date_to);
  if (params?.date) search.set('date', params.date);
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function getMeals(params?: { date_from?: string; date_to?: string }): Promise<Meal[]> {
  return unwrapPagination<Meal>(await apiFetch(withDateParams('meals/', params)));
}

export async function createMeal(data: Partial<Meal>): Promise<Meal> {
  return apiFetch('meals/', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateMeal(id: number, data: Partial<Meal>): Promise<Meal> {
  return apiFetch(`meals/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteMeal(id: number) {
  return apiFetch(`meals/${id}/`, { method: 'DELETE' });
}

export async function getMealSummary(date: string): Promise<MealSummary> {
  return apiFetch(withDateParams('meals/summary/', { date }));
}

export async function getWaterIntakes(params?: { date_from?: string; date_to?: string }): Promise<WaterIntake[]> {
  return unwrapPagination<WaterIntake>(await apiFetch(withDateParams('water/', params)));
}

export async function createWaterIntake(data: Partial<WaterIntake>): Promise<WaterIntake> {
  return apiFetch('water/', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateWaterIntake(id: number, data: Partial<WaterIntake>): Promise<WaterIntake> {
  return apiFetch(`water/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteWaterIntake(id: number) {
  return apiFetch(`water/${id}/`, { method: 'DELETE' });
}

export async function getWeightEntries(): Promise<WeightEntry[]> {
  return unwrapPagination<WeightEntry>(await apiFetch('weight-entries/'));
}

export async function createWeightEntry(date: string, weight: number): Promise<WeightEntry> {
  return apiFetch('weight-entries/', { method: 'POST', body: JSON.stringify({ date, weight }) });
}

export async function getCalendar(year: number, month: number): Promise<CalendarData> {
  return apiFetch(`workouts/calendar/?year=${year}&month=${month}`);
}

export async function getProgress(): Promise<ProgressData> {
  return apiFetch('progress/');
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<{ reply: string }> {
  return apiFetch('ai/chat/', { method: 'POST', body: JSON.stringify({ messages }) });
}

export async function generateRoutine(preferences: RoutineWizardAnswers): Promise<GeneratedRoutineResponse> {
  return apiFetch('ai/routines/generate/', { method: 'POST', body: JSON.stringify({ preferences }) });
}

export async function saveRoutine(data: Routine): Promise<Routine> {
  return apiFetch('routines/', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateRoutine(id: number, data: Routine): Promise<Routine> {
  return apiFetch(`routines/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteRoutine(id: number): Promise<void> {
  await apiFetch(`routines/${id}/`, { method: 'DELETE' });
}

export async function getRoutines(): Promise<Routine[]> {
  return unwrapPagination<Routine>(await apiFetch('routines/'));
}

export async function getRoutine(id: number): Promise<Routine> {
  return apiFetch(`routines/${id}/`);
}

export async function startWorkoutFromRoutineDay(routineId: number, dayId: number, force = false): Promise<Workout> {
  return apiFetch('workouts/start-from-routine-day/', {
    method: 'POST',
    body: JSON.stringify({ routine_id: routineId, day_id: dayId, force }),
  });
}

export async function getActiveWorkout(): Promise<Workout | null> {
  const data = await apiFetch('workouts/active/');
  return data.active ?? null;
}

export async function getGyms(): Promise<Gym[]> {
  return unwrapPagination<Gym>(await apiFetch('gyms/'));
}

export async function getGymMemberships(): Promise<GymMembership[]> {
  return unwrapPagination<GymMembership>(await apiFetch('gym-memberships/'));
}

export async function leaveGym(membershipId: number): Promise<void> {
  await apiFetch(`gym-memberships/${membershipId}/leave/`, { method: 'POST', body: JSON.stringify({}) });
}

export async function joinGymBySlug(slug: string): Promise<GymMembership> {
  return apiFetch('gyms/join/', { method: 'POST', body: JSON.stringify({ slug }) });
}

export async function getGymMembers(slug: string): Promise<GymMembership[]> {
  return apiFetch(`gyms/${slug}/members/`);
}

export async function updateGymMember(
  slug: string,
  membershipId: number,
  data: Partial<Pick<GymMembership, 'role' | 'is_active'>>
): Promise<GymMembership> {
  return apiFetch(`gyms/${slug}/members/${membershipId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getMyGym(): Promise<MyGymData> {
  return apiFetch('gyms/my-gym/');
}

export async function checkIn(slug: string, userId?: number): Promise<{ id: number }> {
  return apiFetch(`gyms/${slug}/check-in/`, {
    method: 'POST',
    body: JSON.stringify(userId ? { user_id: userId } : {}),
  });
}

export async function getGymAthletes(slug: string): Promise<TrainerAthlete[]> {
  return apiFetch(`gyms/${slug}/athletes/`);
}

export async function getAthleteDashboard(slug: string, membershipId: number): Promise<AthleteDashboard> {
  return apiFetch(`gyms/${slug}/athletes/${membershipId}/dashboard/`);
}

export async function getGymAdminDashboard(slug: string): Promise<GymAdminDashboard> {
  return apiFetch(`gyms/${slug}/dashboard/`);
}

export async function createGymSubscription(
  slug: string,
  data: { user: number; plan?: number; duration_days?: number; start_date?: string }
): Promise<GymSubscription> {
  return apiFetch(`gyms/${slug}/subscriptions/`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateGymSubscription(
  slug: string,
  subscriptionId: number,
  action: 'renew' | 'cancel',
  duration_days?: number
): Promise<GymSubscription> {
  return apiFetch(`gyms/${slug}/subscriptions/${subscriptionId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ action, ...(duration_days ? { duration_days } : {}) }),
  });
}

export async function kickMember(slug: string, membershipId: number): Promise<{ detail: string }> {
  return apiFetch(`gyms/${slug}/members/${membershipId}/kick/`, { method: 'POST', body: JSON.stringify({}) });
}

export async function getGymEvents(slug: string): Promise<GymEvent[]> {
  return apiFetch(`gyms/${slug}/events/`);
}

export async function createGymEvent(slug: string, data: Partial<GymEvent>): Promise<GymEvent> {
  return apiFetch(`gyms/${slug}/events/`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteGymEvent(slug: string, eventId: number) {
  return apiFetch(`gyms/${slug}/events/${eventId}/`, { method: 'DELETE' });
}

export async function getGymPlans(slug: string): Promise<GymPlan[]> {
  return apiFetch(`gyms/${slug}/plans/`);
}

export async function createGymPlan(slug: string, data: Partial<GymPlan>): Promise<GymPlan> {
  return apiFetch(`gyms/${slug}/plans/`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteGymPlan(slug: string, planId: number) {
  return apiFetch(`gyms/${slug}/plans/${planId}/`, { method: 'DELETE' });
}

export async function getAdminStats(): Promise<AdminStats> {
  return apiFetch('admin/stats/');
}

export async function getAdminUsers(params?: { role?: string; search?: string; is_active?: boolean }): Promise<AdminUser[]> {
  const search = new URLSearchParams();
  if (params?.role) search.set('role', params.role);
  if (params?.search) search.set('search', params.search);
  if (typeof params?.is_active === 'boolean') search.set('is_active', String(params.is_active));
  const qs = search.toString();
  return unwrapPagination<AdminUser>(await apiFetch(`admin/users/${qs ? `?${qs}` : ''}`));
}

export async function updateAdminUser(id: number, data: Partial<AdminUser>): Promise<AdminUser> {
  return apiFetch(`admin/users/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function getAdminGyms(): Promise<AdminGym[]> {
  return unwrapPagination<AdminGym>(await apiFetch('admin/gyms/'));
}

export interface AdminGymCreatePayload {
  name: string;
  address?: string;
  phone?: string;
  gym_admin_id?: number;
  new_gym_admin?: { username: string; email: string; password: string };
}

export async function createAdminGym(data: AdminGymCreatePayload): Promise<AdminGym> {
  return apiFetch('admin/gyms/', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteAdminGym(slug: string): Promise<void> {
  await apiFetch(`admin/gyms/${slug}/`, { method: 'DELETE' });
}

export async function updateAdminGym(slug: string, data: Partial<AdminGym>): Promise<AdminGym> {
  return apiFetch(`admin/gyms/${slug}/`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function completeSet(
  workoutId: number,
  exerciseId: number,
  setId: number,
  data: { reps: number; weight?: number | null }
): Promise<ExerciseSet> {
  return apiFetch(`workouts/${workoutId}/complete-set/`, {
    method: 'POST',
    body: JSON.stringify({ exercise_id: exerciseId, set_id: setId, ...data }),
  });
}

export async function finishWorkout(workoutId: number, data: { duration_minutes: number }): Promise<Workout> {
  return apiFetch(`workouts/${workoutId}/finish/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
