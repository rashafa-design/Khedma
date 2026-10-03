"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

const MAX = 15;

// Type a neighborhood or district ("Maadi", "Nasr City", "المعادي") and press
// Add; each becomes a removable chip. Suggestions come from what other
// workers already typed, so spellings stay consistent and clients find them.
export function NeighborhoodInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
}) {
  const t = useTranslations("neighborhoods");
  const listId = useId();
  const [draft, setDraft] = useState("");

  function add() {
    const name = draft.trim().replace(/\s+/g, " ").slice(0, 40);
    setDraft("");
    if (!name || value.length >= MAX) return;
    if (value.some((v) => v.toLowerCase() === name.toLowerCase())) return;
    onChange([...value, name]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          list={listId}
          value={draft}
          maxLength={40}
          placeholder={t("placeholder")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-base"
        />
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={add}
          className="rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-100"
        >
          {t("add")}
        </button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((name) => (
            <li
              key={name}
              className="flex items-center gap-1 rounded-full border border-gray-300 bg-white py-1 ps-3 pe-1 text-sm"
            >
              {name}
              <button
                type="button"
                aria-label={t("remove")}
                onClick={() => onChange(value.filter((v) => v !== name))}
                className="rounded-full px-2 text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
