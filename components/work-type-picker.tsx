"use client";

import { useTranslations } from "next-intl";
import type { WorkType } from "@/lib/types";

// "How do you work?" - by the month OR by visits (pick one). A worker belongs
// to exactly one group, because each group is sold to clients as its own plan.
// Still takes/returns an array so the rest of the app is unchanged.
export function WorkTypePicker({
  selected,
  onChange,
  name = "work-type",
}: {
  selected: WorkType[];
  onChange: (next: WorkType[]) => void;
  name?: string;
}) {
  const t = useTranslations("workType");

  return (
    <div className="flex flex-col gap-2" role="radiogroup">
      {(["monthly", "visits"] as const).map((type) => (
        <label
          key={type}
          className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
            selected.includes(type)
              ? "border-gray-900 bg-gray-50"
              : "border-gray-300"
          }`}
        >
          <input
            type="radio"
            name={name}
            className="mt-1"
            checked={selected.includes(type)}
            onChange={() => onChange([type])}
          />
          <span>
            <span className="block font-medium">{t(`${type}Title`)}</span>
            <span className="block text-gray-600">{t(`${type}Body`)}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
