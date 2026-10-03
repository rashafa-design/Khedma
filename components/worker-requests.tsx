import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { RequestButtons } from "./request-buttons";

type PendingRequest = {
  id: string;
  created_at: string;
  expires_at: string;
  plan: "monthly" | "visits";
};

// "A client is waiting to know if you're available" - the top prompt on a
// worker's dashboard. Deliberately does not say which client asked.
export async function WorkerRequests() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_pending_availability_requests");
  const requests = (data as PendingRequest[] | null) ?? [];

  if (requests.length === 0) return null;

  const t = await getTranslations("requests");

  return (
    <section className="rounded-md border-2 border-green-600 bg-green-50 p-4 text-sm text-green-950">
      <h2 className="font-semibold">{t("title", { count: requests.length })}</h2>
      <p className="mt-1">{t("body")}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {requests.map((request) => {
          const minutesLeft = Math.max(
            1,
            Math.ceil(
              (new Date(request.expires_at).getTime() - Date.now()) / 60_000
            )
          );
          const hoursLeft = Math.ceil(minutesLeft / 60);
          return (
            <li
              key={request.id}
              className="rounded-md border border-green-300 bg-white p-3"
            >
              <p className="font-medium">
                {request.plan === "visits"
                  ? `🔧 ${t("kindVisits")}`
                  : `📅 ${t("kindMonthly")}`}
              </p>
              <p>
                {minutesLeft < 60
                  ? t("minutesLeft", { minutes: minutesLeft })
                  : t("hoursLeft", { hours: hoursLeft })}
              </p>
              <RequestButtons requestId={request.id} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
