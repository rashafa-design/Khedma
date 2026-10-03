// Egypt's 27 governorates: [code, English, Arabic]. The code is what gets
// stored in the database (worker_profiles.base_governorate and
// worker_service_areas.governorate).
const GOVERNORATES: [string, string, string][] = [
  ["cairo", "Cairo", "القاهرة"],
  ["giza", "Giza", "الجيزة"],
  ["alexandria", "Alexandria", "الإسكندرية"],
  ["qalyubia", "Qalyubia", "القليوبية"],
  ["port_said", "Port Said", "بورسعيد"],
  ["suez", "Suez", "السويس"],
  ["dakahlia", "Dakahlia", "الدقهلية"],
  ["sharqia", "Sharqia", "الشرقية"],
  ["gharbia", "Gharbia", "الغربية"],
  ["monufia", "Monufia", "المنوفية"],
  ["beheira", "Beheira", "البحيرة"],
  ["kafr_el_sheikh", "Kafr El Sheikh", "كفر الشيخ"],
  ["damietta", "Damietta", "دمياط"],
  ["ismailia", "Ismailia", "الإسماعيلية"],
  ["faiyum", "Faiyum", "الفيوم"],
  ["beni_suef", "Beni Suef", "بني سويف"],
  ["minya", "Minya", "المنيا"],
  ["asyut", "Asyut", "أسيوط"],
  ["sohag", "Sohag", "سوهاج"],
  ["qena", "Qena", "قنا"],
  ["luxor", "Luxor", "الأقصر"],
  ["aswan", "Aswan", "أسوان"],
  ["red_sea", "Red Sea", "البحر الأحمر"],
  ["new_valley", "New Valley", "الوادي الجديد"],
  ["matrouh", "Matrouh", "مطروح"],
  ["north_sinai", "North Sinai", "شمال سيناء"],
  ["south_sinai", "South Sinai", "جنوب سيناء"],
];

export function governorateLabel(code: string | null | undefined, locale: string) {
  if (!code) return "";
  const entry = GOVERNORATES.find(([c]) => c === code);
  if (!entry) return code;
  return locale === "ar" ? entry[2] : entry[1];
}

// Greater Cairo first (most of the demand), then alphabetical in the
// reader's language.
export function governorateOptions(locale: string) {
  const collator = new Intl.Collator(locale === "ar" ? "ar" : "en");
  const label = (g: [string, string, string]) => (locale === "ar" ? g[2] : g[1]);
  const first = GOVERNORATES.slice(0, 2);
  const rest = GOVERNORATES.slice(2).sort((a, b) =>
    collator.compare(label(a), label(b))
  );
  return [...first, ...rest].map((g) => ({ code: g[0], label: label(g) }));
}
