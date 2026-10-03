import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { UnlockRow } from "@/lib/types";
import { FollowupButtons } from "./followup-buttons";

const DAY_MS = 24 * 60 * 60 * 1000;

// About 3 days after unlocking a worker, ask the client how it went. Shows up
// to two questions at a time, on the client's dashboard and Browse page.
export async function FollowupPrompts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = Date.now();
  const { data: unlocks } = await supabase
    .from("unlocks")
    .select("*")
    .lt("unlocked_at", new Date(now - 3 * DAY_MS).toISOString())
    .gt("unlocked_at", new Date(now - 30 * DAY_MS).toISOString())
    .order("unlocked_at")
    .returns<UnlockRow[]>();

  if (!unlocks || unlocks.length === 0) return null;

  const { data: answered } = await supabase
    .from("unlock_feedback")
    .select("unlock_id")
    .in(
      "unlock_id",
      unlocks.map((u) => u.id)
    )
    .returns<{ unlock_id: string }[]>();
  const answeredIds = new Set((answered ?? []).map((a) => a.unlock_id));
  const pending = unlocks.filter((u) => !answeredIds.has(u.id)).slice(0, 2);

  if (pending.length === 0) return null;

  const names = await Promise.all(
    pending.map(async (u) => {
      const { data } = await supabase.rpc("get_worker_display_name", {
        p_worker_profile_id: u.worker_profile_id,
      });
      return (data as string | null) ?? "";
    })
  );

  const t = await getTranslations("followup");

  return (
    <section className="rounded-md border border-sky-300 bg-sky-50 p-4 text-sm text-sky-950">
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="mt-1">{t("body")}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {pending.map((unlock, index) => (
          <li
            key={unlock.id}
            className="rounded-md border border-sky-200 bg-white p-3"
          >
            <p className="font-medium">
              {t("question", { name: names[index] || "—" })}
            </p>
            <FollowupButtons
              unlockId={unlock.id}
              workerProfileId={unlock.worker_profile_id}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
