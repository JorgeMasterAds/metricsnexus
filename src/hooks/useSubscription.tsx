// Simple constants for app limits (no subscription/plans)
export const MAX_SMART_LINKS = 25;
export const MAX_USERS = 10;

export const FIXED_GOALS = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000];

export function getFixedGoal(currentRevenue: number): number {
  for (const goal of FIXED_GOALS) {
    if (goal > currentRevenue) return goal;
  }
  return FIXED_GOALS[FIXED_GOALS.length - 1];
}
