"use client";

import { useLocale, useTranslations } from "next-intl";
import { governorateOptions } from "@/lib/governorates";

// A checkbox list of Egypt's governorates. Fully controlled, so the same
// picker serves the sign-up form (just collects a choice) and the worker
// dashboard (saves each change).
export function ServiceAreaPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("location");
  const locale = useLocale();
  const options = governorateOptions(locale);

  function toggle(code: string) {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code]
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 text-xs">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(options.map((o) => o.code))}
          className="font-medium underline disabled:opacity-50"
        >
          {t("selectAll")}
        </button>
      </div>
      <div className="grid max-h-60 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-gray-300 p-2 text-sm">
        {options.map((option) => (
          <label key={option.code} className="flex items-center gap-2 py-0.5">
            <input
              type="checkbox"
              disabled={disabled}
              checked={selected.includes(option.code)}
              onChange={() => toggle(option.code)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}
