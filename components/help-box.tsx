import { getTranslations } from "next-intl/server";

// A short "what is this page / what do I need to do" panel. The words live in
// messages/*.json under help.<topic> as { title, items: [...] } so they are
// written once per language and can be edited without touching any page.
export async function HelpBox({ topic }: { topic: string }) {
  const t = await getTranslations("help");
  const items = t.raw(`${topic}.items`) as string[];

  return (
    <aside className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
      <p className="font-semibold">ℹ️ {t(`${topic}.title`)}</p>
      <ul className="mt-2 flex list-disc flex-col gap-1 ps-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}
