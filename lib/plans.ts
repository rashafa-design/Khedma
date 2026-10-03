import type { SubscriptionRow, WorkType } from "@/lib/types";

// The two things a client can buy. The same numbers are enforced in the
// database (supabase/sql/phase18_visit_plan_and_neighborhoods.sql) - change
// both together. A plan is named after the kind of worker it unlocks.
export const PLANS: Record<
  WorkType,
  { price: number; slots: number; durationLabel: "1month" | "3days" }
> = {
  monthly: { price: 2000, slots: 10, durationLabel: "1month" },
  visits: { price: 50, slots: 5, durationLabel: "3days" },
};

export const PLAN_ORDER: WorkType[] = ["visits", "monthly"];

export function isActive(subscription: SubscriptionRow | undefined | null) {
  return !!subscription && new Date(subscription.expires_at) > new Date();
}

// The newest subscription of each plan, keyed by plan.
export function latestByPlan(subscriptions: SubscriptionRow[]) {
  const result: Partial<Record<WorkType, SubscriptionRow>> = {};
  const sorted = [...subscriptions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  for (const subscription of sorted) {
    if (!result[subscription.plan]) result[subscription.plan] = subscription;
  }
  return result;
}
