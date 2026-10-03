// How often a worker must confirm their details, in days. The hide-after
// number must match the 104-day interval in get_hidden_worker_ids()
// (supabase/sql/phase14_checkins_and_reports.sql): 90 days + 14 days grace.
export const CONFIRM_EVERY_DAYS = 90;
export const REMIND_BEFORE_DAYS = 14;
export const GRACE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

// The quicker "still available?" renewal for workers marked available:
// asked from day 10, a warning tag on their card after 14, hidden after 28
// (matches get_hidden_worker_ids()).
export const AVAILABILITY_EVERY_DAYS = 14;
export const AVAILABILITY_REMIND_FROM_DAYS = 10;
export const AVAILABILITY_HIDE_DAYS = 28;

export type AvailabilityState = "ok" | "due_soon" | "overdue" | "hidden";

export function availabilityState(confirmedAt: string): AvailabilityState {
  const days = daysSince(confirmedAt);
  if (days >= AVAILABILITY_HIDE_DAYS) return "hidden";
  if (days >= AVAILABILITY_EVERY_DAYS) return "overdue";
  if (days >= AVAILABILITY_REMIND_FROM_DAYS) return "due_soon";
  return "ok";
}

export type CheckinState ="ok" | "due_soon" | "overdue" | "hidden";

export function checkinState(lastConfirmedAt: string): CheckinState {
  const days = daysSince(lastConfirmedAt);
  if (days >= CONFIRM_EVERY_DAYS + GRACE_DAYS) return "hidden";
  if (days >= CONFIRM_EVERY_DAYS) return "overdue";
  if (days >= CONFIRM_EVERY_DAYS - REMIND_BEFORE_DAYS) return "due_soon";
  return "ok";
}
