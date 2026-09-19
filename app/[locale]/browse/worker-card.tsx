import { getTranslations } from "next-intl/server";
import type {
  ProfessionRow,
  TaskTypeRow,
  WorkerAvailability,
  WorkerTaskEntryRow,
} from "@/lib/types";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function WorkerCard({
  fullName,
  photoUrl,
  profession,
  nationality,
  yearsExperience,
  availability,
  taskEntries,
  taskTypes,
  nameKey,
}: {
  fullName: string;
  photoUrl: string | null;
  profession: ProfessionRow | undefined;
  nationality: string;
  yearsExperience: number;
  availability: WorkerAvailability;
  taskEntries: WorkerTaskEntryRow[];
  taskTypes: TaskTypeRow[];
  nameKey: "name_en" | "name_ar";
}) {
  const t = await getTranslations("browse");
  const tWorker = await getTranslations("worker");

  return (
    <div className="flex gap-4 rounded-md border border-gray-200 p-4">
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
        <p className="text-sm text-gray-600">
          {profession?.[nameKey]} · {nationality} · {yearsExperience}{" "}
          {t("years")}
        </p>
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
      </div>
    </div>
  );
}
