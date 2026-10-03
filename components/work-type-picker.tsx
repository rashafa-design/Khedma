"use client";

import { useTranslations } from "next-intl";
import type { WorkType } from "@/lib/types";

// "How do you work?" - by the month, by visits, or both. Controlled, so the
// sign-up form and the worker dashboard can share it.
export function WorkTypePicker({
  selected,
  onChange,
}: {
  selected: WorkType[];
  onChange: (next: WorkType[]) => void;
}) {
  const t = useTranslations("workType");

  function toggle(type: WorkType) {
    onChange(
      selected.includes(type)
        ? selected.filter((s) => s !== type)
        : [...selected, type]
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
            type="checkbox"
            className="mt-1"
            checked={selected.includes(type)}
            onChange={() => toggle(type)}
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
