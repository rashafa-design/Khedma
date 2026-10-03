import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type {
  WorkType,
  TaskTypeRow,
  WorkerAvailability,
  WorkerTaskEntryRow,
} from "@/lib/types";
import { ReportButton } from "./report-button";
import type { CheckState } from "./availability-step";
import { AvailabilityStep } from "./availability-step";
import { ViewTracker } from "./view-tracker";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export type ContactState =
  | { type: "unlocked"; phone: string | null }
  | {
      type: "can_unlock";
      subscriptionId: string;
      plan: WorkType;
      check: CheckState;
    }
  | { type: "no_slots" }
  | { type: "subscribe"; plan: WorkType }
  | { type: "hidden" };

export async function WorkerCard({
  workerProfileId,
  fullName,
  photoUrl,
  professionNames,
  workTypes,
  neighborhoods,
  transportFee,
  showTransport,
  nationality,
  livesIn,
  worksIn,
  yearsExperience,
  availability,
  taskEntries,
  taskTypes,
  nameKey,
  contact,
  previouslyUnlockedOn,
  viewedOn,
  trackView,
  confirmedOn,
  availabilityStale,
}: {
  workerProfileId: string;
  fullName: string;
  photoUrl: string | null;
  professionNames: string[];
  workTypes: WorkType[];
  neighborhoods: string[];
  transportFee: number | null;
  showTransport: boolean;
  nationality: string;
  livesIn: string;
  worksIn: string[];
  yearsExperience: number;
  availability: WorkerAvailability;
  taskEntries: WorkerTaskEntryRow[];
  taskTypes: TaskTypeRow[];
  nameKey: "name_en" | "name_ar";
  contact: ContactState;
  previouslyUnlockedOn: string | null;
  viewedOn: string | null;
  trackView: boolean;
  confirmedOn: string;
  availabilityStale: boolean;
}) {
  const t = await getTranslations("browse");
  const tWorker = await getTranslations("worker");
  const tWorkType = await getTranslations("workType");
  const list = new Intl.ListFormat(await getLocale(), {
    style: "short",
    type: "unit",
  });

  // One look per state, so a client can tell at a glance what they have
  // already unlocked, unlocked in a past month, only looked at, or not seen.
  const showViewed =
    !!viewedOn && contact.type !== "unlocked" && !previouslyUnlockedOn;
  const stateStyle =
    contact.type === "unlocked"
      ? "border-green-400 bg-green-50"
      : previouslyUnlockedOn
        ? "border-amber-400 bg-amber-50"
        : showViewed
          ? "border-sky-300 bg-sky-50"
          : "border-gray-200 bg-white";

  return (
    <ViewTracker
      workerProfileId={workerProfileId}
      enabled={trackView && !viewedOn && contact.type !== "unlocked" && !previouslyUnlockedOn}
      className={`flex gap-4 rounded-md border p-4 ${stateStyle}`}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={fullName}
          className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="h-16 w-16 flex-shrink-0 rounded-full bg-gray-200" />
      )}

      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{fullName}</p>
          {availability === "unavailable" && (
            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs">
              {tWorker("unavailable")}
            </span>
          )}
        </div>
        {contact.type === "unlocked" && (
          <p className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-900">
            {t("unlockedBadge")}
          </p>
        )}
        {previouslyUnlockedOn && contact.type !== "unlocked" && (
          <p className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            {t("unlockedBefore", { date: previouslyUnlockedOn })}
          </p>
        )}
        {showViewed && (
          <p className="mt-1 inline-block rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
            {t("viewedBefore", { date: viewedOn })}
          </p>
        )}
        <p className="text-sm text-gray-600">
          {professionNames.join(" + ")} · {nationality} · {yearsExperience}{" "}
          {t("years")}
        </p>
        <p className="mt-1 flex flex-wrap gap-1">
          {workTypes.map((type) => (
            <span
              key={type}
              className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium"
            >
              {type === "monthly" ? "📅" : "🔧"} {tWorkType(`${type}Badge`)}
            </span>
          ))}
        </p>
        <p className="mt-1 text-sm text-gray-700">
          📍{" "}
          {livesIn && (
            <>
              {t("livesIn")}: <span className="font-medium">{livesIn}</span> ·{" "}
            </>
          )}
          {t("worksIn")}:{" "}
          <span className="font-medium">
            {worksIn.length > 5
              ? `${list.format(worksIn.slice(0, 4))} ${t("andMore", { count: worksIn.length - 4 })}`
              : list.format(worksIn)}
          </span>
        </p>
        {showTransport && (
          <p className="mt-1 text-sm text-gray-700">
            🚕 {t("transportLabel")}:{" "}
            <span className="font-medium">
              {transportFee === null
                ? t("transportNotStated")
                : transportFee === 0
                  ? t("transportFree")
                  : t("transportFee", { fee: transportFee })}
            </span>
          </p>
        )}
        {neighborhoods.length > 0 && (
          <p className="mt-1 text-sm text-gray-700">
            🚗 {t("visitsIn")}:{" "}
            <span className="font-medium">{list.format(neighborhoods)}</span>
          </p>
        )}
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {taskEntries.map((entry) => {
            const taskType = taskTypes.find((tt) => tt.id === entry.task_type_id);
            return (
              <li key={entry.id} className="text-gray-700">
                {taskType?.[nameKey]} — {entry.price} EGP{" "}
                {tWorker(`billing${capitalize(entry.billing_unit)}`)} ·{" "}
                {tWorker(`scope${capitalize(entry.scope)}`)}
              </li>
            );
          })}
        </ul>

        <div className="mt-3">
          {contact.type === "unlocked" && (
            <>
              <p className="text-sm font-medium" dir="ltr">
                {t("phone")}: {contact.phone ?? "—"}
              </p>
              <ReportButton workerProfileId={workerProfileId} />
            </>
          )}
          {contact.type === "can_unlock" && availability === "unavailable" && (
            <p className="text-sm text-gray-600">{t("workerUnavailable")}</p>
          )}
          {contact.type === "can_unlock" && availability === "available" && (
            <p className="mb-1 text-xs text-gray-500">
              {t(
                contact.plan === "visits" ? "usesVisitsPass" : "usesMonthlyPlan"
              )}
            </p>
          )}
          {contact.type === "can_unlock" && availability === "available" && (
            <AvailabilityStep
              subscriptionId={contact.subscriptionId}
              workerProfileId={workerProfileId}
              previouslyUnlockedOn={previouslyUnlockedOn}
              check={contact.check}
            />
          )}
          {contact.type === "no_slots" && (
            <p className="text-xs text-gray-500">{t("noSlotsLeft")}</p>
          )}
          {contact.type === "subscribe" && (
            <Link
              href={`/client/subscribe?plan=${contact.plan}`}
              className="text-xs font-medium underline"
            >
              {t(
                contact.plan === "visits"
                  ? "subscribeVisits"
                  : "subscribeMonthly"
              )}
            </Link>
          )}
        </div>
        {availability === "available" && (
          <p
            className={`mt-2 text-xs ${
              availabilityStale ? "font-medium text-amber-800" : "text-green-800"
            }`}
          >
            {availabilityStale
              ? t("availabilityStale", { date: confirmedOn })
              : t("availabilityFresh", { date: confirmedOn })}
          </p>
        )}
      </div>
    </ViewTracker>
  );
}
