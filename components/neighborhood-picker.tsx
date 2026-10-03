"use client";

import { useLocale, useTranslations } from "next-intl";
import { areaGroups } from "@/lib/neighborhoods";

const MAX = 15;

// Pick the areas you visit from a fixed list (grouped by the governorates you
// work in) instead of typing them - so everyone spells "Maadi" the same way
// and clients searching for it find everyone who works there. Legacy
// free-text values saved earlier are listed first so they can be removed.
export function NeighborhoodPicker({
  governorates,
  value,
  onChange,
}: {
  governorates: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations("neighborhoods");
  const locale = useLocale();
  const groups = areaGroups(governorates, locale);
  const knownCodes = new Set(groups.flatMap((g) => g.options.map((o) => o.code)));
  const legacy = value.filter(
    (v) => !v.includes(":") && !knownCodes.has(v)
  );

  function toggle(code: string) {
    onChange(
      value.includes(code) ? value.filter((v) => v !== code) : [...value, code]
    );
  }

  if (governorates.length === 0) {
    return (
      <p className="rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
        {t("chooseGovernoratesFirst")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {legacy.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
          <p>{t("legacy")}</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {legacy.map((name) => (
              <li
                key={name}
                className="flex items-center gap-1 rounded-full border border-amber-300 bg-white py-0.5 ps-2 pe-1"
              >
                {name}
                <button
                  type="button"
                  aria-label={t("remove")}
                  onClick={() => onChange(value.filter((v) => v !== name))}
                  className="rounded-full px-1.5 text-gray-600 hover:bg-gray-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto rounded-md border border-gray-300 p-2">
        {groups.map((group) => (
          <fieldset key={group.governorate} className="mb-3 last:mb-0">
            <legend className="mb-1 text-sm font-semibold">
              {group.governorateName}
            </legend>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {group.options.map((option) => {
                const checked = value.includes(option.code);
                return (
                  <label
                    key={option.code}
                    className="flex items-center gap-2 py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && value.length >= MAX}
                      onChange={() => toggle(option.code)}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {t("count", { count: value.length, max: MAX })}
      </p>
    </div>
  );
}
