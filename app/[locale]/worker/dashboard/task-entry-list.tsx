import { getTranslations } from "next-intl/server";
import type { TaskTypeRow, WorkerTaskEntryRow } from "@/lib/types";
import { DeleteEntryButton } from "./delete-entry-button";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function TaskEntryList({
  entries,
  taskTypes,
  nameKey,
}: {
  entries: WorkerTaskEntryRow[];
  taskTypes: TaskTypeRow[];
  nameKey: "name_en" | "name_ar";
}) {
  const t = await getTranslations("worker");

  if (entries.length === 0) {
    return <p className="text-sm text-gray-600">{t("noTaskEntries")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => {
        const taskType = taskTypes.find((tt) => tt.id === entry.task_type_id);
        return (
          <li
            key={entry.id}
            className="flex items-center justify-between rounded-md border border-gray-200 p-3 text-sm"
          >
            <div>
              <p className="font-medium">{taskType?.[nameKey] ?? "—"}</p>
              <p className="text-gray-600">
                {t(`scope${capitalize(entry.scope)}`)} · {entry.price} EGP ·{" "}
                {t(`billing${capitalize(entry.billing_unit)}`)}
              </p>
            </div>
            <DeleteEntryButton entryId={entry.id} />
          </li>
        );
      })}
    </ul>
  );
}
