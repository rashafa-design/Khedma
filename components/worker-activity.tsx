import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

type Activity = {
  viewed_only_total: number;
  viewed_only_30d: number;
  asked_total: number;
  asked_30d: number;
  answered_total: number;
  missed_total: number;
  unlocked_total: number;
  unlocked_30d: number;
};

// "How is my listing doing?" - three plain numbers for the worker. Never says
// who looked, asked or unlocked; the database only returns counts.
export async function WorkerActivity() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: worker } = await supabase
    .from("worker_profiles")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; status: string }>();
  if (!worker || worker.status !== "approved") return null;

  const { data } = await supabase.rpc("get_worker_activity", {
    p_worker_profile_id: worker.id,
  });
  const activity = data as Activity | null;
  if (!activity) return null;

  const t = await getTranslations("activity");

  const tiles = [
    {
      icon: "👀",
      title: t("viewedTitle"),
      recent: activity.viewed_only_30d,
      total: activity.viewed_only_total,
      note: t("viewedNote"),
    },
    {
      icon: "🔔",
      title: t("askedTitle"),
      recent: activity.asked_30d,
      total: activity.asked_total,
      note: t("askedNote", {
        answered: activity.answered_total,
        missed: activity.missed_total,
      }),
    },
    {
      icon: "🔓",
      title: t("unlockedTitle"),
      recent: activity.unlocked_30d,
      total: activity.unlocked_total,
      note: t("unlockedNote"),
    },
  ];

  return (
    <section className="rounded-md border border-gray-200 bg-white p-4">
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.title}
            className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm"
          >
            <p className="font-medium">
              {tile.icon} {tile.title}
            </p>
            <p className="mt-1 text-3xl font-bold">{tile.recent}</p>
            <p className="text-xs text-gray-600">{t("last30")}</p>
            <p className="mt-1 text-xs text-gray-600">
              {t("allTime", { count: tile.total })}
            </p>
            <p className="mt-2 text-xs text-gray-600">{tile.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">{t("privacy")}</p>
    </section>
  );
}
