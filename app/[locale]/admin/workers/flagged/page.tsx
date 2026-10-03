import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpBox } from "@/components/help-box";
import { createClient } from "@/lib/supabase/server";
import { ClearFlagsButton } from "./clear-flags-button";

type FlaggedRow = {
  worker_profile_id: string;
  open_count: number;
  count_90_days: number;
  is_hidden: boolean;
};

export default async function AdminFlaggedWorkersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_flagged_workers");
  const rows = (data as FlaggedRow[] | null) ?? [];

  const t = await getTranslations("adminFlagged");

  const names = await Promise.all(
    rows.map(async (row) => {
      const { data: name } = await supabase.rpc("get_worker_display_name", {
        p_worker_profile_id: row.worker_profile_id,
      });
      return (name as string | null) ?? "—";
    })
  );

  return (
    <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <HelpBox topic="adminFlagged" />

      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <div
              key={row.worker_profile_id}
              className="rounded-md border border-gray-200 p-4"
            >
              <p className="font-semibold">{names[index]}</p>
              <p className="text-sm text-gray-600">
                {t("openCount", { count: row.open_count })} ·{" "}
                {t("count90", { count: row.count_90_days })}
              </p>
              <p
                className={`text-sm font-medium ${
                  row.is_hidden ? "text-red-700" : "text-green-700"
                }`}
              >
                {row.is_hidden ? t("hidden") : t("visible")}
              </p>
              <ClearFlagsButton workerProfileId={row.worker_profile_id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
