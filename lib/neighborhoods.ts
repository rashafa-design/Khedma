import { governorateLabel, governorateOptions } from "@/lib/governorates";

// Areas (neighborhoods, districts and main towns) inside each governorate, as
// [slug, English, Arabic]. A visit worker picks from this list instead of
// typing, so a client searching for "Maadi" always finds everyone who works
// there. What is stored in the database is "<governorate>:<slug>" (for
// example "cairo:maadi"). Every governorate also has an "All of ..." choice
// ("<governorate>:all") for workers who go anywhere in it, and for areas that
// are not listed. Older free-text values saved before this list existed are
// shown exactly as typed.
type Area = [string, string, string];

const AREAS: Record<string, Area[]> = {
  cairo: [
    ["nasr_city", "Nasr City", "مدينة نصر"],
    ["heliopolis", "Heliopolis", "مصر الجديدة"],
    ["maadi", "Maadi", "المعادي"],
    ["new_cairo", "New Cairo", "القاهرة الجديدة"],
    ["fifth_settlement", "Fifth Settlement", "التجمع الخامس"],
    ["shorouk", "El Shorouk", "الشروق"],
    ["badr", "Badr City", "مدينة بدر"],
    ["madinaty", "Madinaty", "مدينتي"],
    ["rehab", "El Rehab", "الرحاب"],
    ["zamalek", "Zamalek", "الزمالك"],
    ["downtown", "Downtown", "وسط البلد"],
    ["garden_city", "Garden City", "جاردن سيتي"],
    ["manial", "El Manial", "المنيل"],
    ["sayeda_zeinab", "Sayeda Zeinab", "السيدة زينب"],
    ["abbassia", "Abbassia", "العباسية"],
    ["zeitoun", "Zeitoun", "الزيتون"],
    ["matareya", "El Matareya", "المطرية"],
    ["ain_shams", "Ain Shams", "عين شمس"],
    ["el_marg", "El Marg", "المرج"],
    ["shubra", "Shubra", "شبرا"],
    ["hadayek_el_kobba", "Hadayek El Kobba", "حدائق القبة"],
    ["nozha", "El Nozha", "النزهة"],
    ["mokattam", "Mokattam", "المقطم"],
    ["helwan", "Helwan", "حلوان"],
    ["katameya", "Katameya", "القطامية"],
    ["sheraton", "Sheraton", "الشيراتون"],
    ["may_15", "15 May City", "مدينة 15 مايو"],
    ["basateen", "El Basatin", "البساتين"],
    ["dar_el_salam", "Dar El Salam", "دار السلام"],
    ["rod_el_farag", "Rod El Farag", "روض الفرج"],
    ["new_capital", "New Administrative Capital", "العاصمة الإدارية"],
  ],
  giza: [
    ["mohandessin", "Mohandessin", "المهندسين"],
    ["dokki", "Dokki", "الدقي"],
    ["agouza", "Agouza", "العجوزة"],
    ["haram", "El Haram", "الهرم"],
    ["faisal", "Faisal", "فيصل"],
    ["sixth_october", "6th of October City", "مدينة 6 أكتوبر"],
    ["sheikh_zayed", "Sheikh Zayed", "الشيخ زايد"],
    ["imbaba", "Imbaba", "إمبابة"],
    ["boulaq_dakrour", "Boulaq El Dakrour", "بولاق الدكرور"],
    ["omraniya", "El Omraniya", "العمرانية"],
    ["warraq", "El Warraq", "الوراق"],
    ["giza_square", "Giza Square", "ميدان الجيزة"],
    ["abu_rawash", "Abu Rawash", "أبو رواش"],
    ["kerdasa", "Kerdasa", "كرداسة"],
    ["hawamdeya", "El Hawamdeya", "الحوامدية"],
    ["badrashin", "El Badrashin", "البدرشين"],
  ],
  alexandria: [
    ["montaza", "Montaza", "المنتزه"],
    ["sidi_gaber", "Sidi Gaber", "سيدي جابر"],
    ["smouha", "Smouha", "سموحة"],
    ["miami", "Miami", "ميامي"],
    ["sporting", "Sporting", "سبورتنج"],
    ["roushdy", "Roushdy", "رشدي"],
    ["stanley", "Stanley", "ستانلي"],
    ["gleem", "Gleem", "جليم"],
    ["bahary", "Bahary", "بحري"],
    ["mandara", "El Mandara", "المندرة"],
    ["agamy", "El Agamy", "العجمي"],
    ["borg_el_arab", "Borg El Arab", "برج العرب"],
    ["asafra", "El Asafra", "العصافرة"],
    ["moharam_bek", "Moharam Bek", "محرم بك"],
    ["karmouz", "Karmouz", "كرموز"],
    ["laurent", "Laurent", "لوران"],
    ["ibrahimia", "El Ibrahimia", "الإبراهيمية"],
    ["camp_caesar", "Camp Caesar", "كامب شيزار"],
    ["victoria", "Victoria", "فيكتوريا"],
    ["raml_station", "Raml Station", "محطة الرمل"],
    ["amreya", "El Amreya", "العامرية"],
  ],
  qalyubia: [
    ["banha", "Banha", "بنها"],
    ["shubra_el_kheima", "Shubra El Kheima", "شبرا الخيمة"],
    ["qalyub", "Qalyub", "قليوب"],
    ["khanka", "El Khanka", "الخانكة"],
    ["obour", "El Obour", "العبور"],
    ["khosous", "El Khosous", "الخصوص"],
    ["shibin_el_qanater", "Shibin El Qanater", "شبين القناطر"],
    ["kafr_shokr", "Kafr Shukr", "كفر شكر"],
  ],
  port_said: [
    ["port_fouad", "Port Fouad", "بورفؤاد"],
    ["el_arab", "El Arab", "حي العرب"],
    ["el_manakh", "El Manakh", "حي المناخ"],
    ["el_dawahy", "El Dawahy", "حي الضواحي"],
    ["el_zohour", "El Zohour", "حي الزهور"],
  ],
  suez: [
    ["arbaeen", "El Arbaeen", "الأربعين"],
    ["ganayen", "El Ganayen", "الجناين"],
    ["faisal_suez", "Faisal", "فيصل"],
    ["ain_sokhna", "Ain Sokhna", "العين السخنة"],
  ],
  dakahlia: [
    ["mansoura", "Mansoura", "المنصورة"],
    ["talkha", "Talkha", "طلخا"],
    ["mit_ghamr", "Mit Ghamr", "ميت غمر"],
    ["belqas", "Belqas", "بلقاس"],
    ["sherbin", "Sherbin", "شربين"],
    ["aga", "Aga", "أجا"],
    ["dikirnis", "Dikirnis", "دكرنس"],
    ["manzala", "El Manzala", "المنزلة"],
  ],
  sharqia: [
    ["zagazig", "Zagazig", "الزقازيق"],
    ["tenth_of_ramadan", "10th of Ramadan City", "مدينة العاشر من رمضان"],
    ["belbeis", "Belbeis", "بلبيس"],
    ["minya_el_qamh", "Minya El Qamh", "منيا القمح"],
    ["abu_hammad", "Abu Hammad", "أبو حماد"],
    ["faqous", "Faqous", "فاقوس"],
    ["hehya", "Hehya", "ههيا"],
    ["kafr_saqr", "Kafr Saqr", "كفر صقر"],
  ],
  gharbia: [
    ["tanta", "Tanta", "طنطا"],
    ["mahalla_kubra", "El Mahalla El Kubra", "المحلة الكبرى"],
    ["kafr_el_zayat", "Kafr El Zayat", "كفر الزيات"],
    ["zefta", "Zefta", "زفتى"],
    ["samannoud", "Samannoud", "سمنود"],
    ["basyoun", "Basyoun", "بسيون"],
  ],
  monufia: [
    ["shebin_el_kom", "Shebin El Kom", "شبين الكوم"],
    ["menouf", "Menouf", "منوف"],
    ["sadat_city", "Sadat City", "مدينة السادات"],
    ["ashmoun", "Ashmoun", "أشمون"],
    ["quesna", "Quesna", "قويسنا"],
    ["bagour", "El Bagour", "الباجور"],
    ["tala", "Tala", "تلا"],
  ],
  beheira: [
    ["damanhour", "Damanhour", "دمنهور"],
    ["kafr_el_dawwar", "Kafr El Dawwar", "كفر الدوار"],
    ["rashid", "Rashid", "رشيد"],
    ["edko", "Edko", "إدكو"],
    ["abu_hummus", "Abu Hummus", "أبو حمص"],
    ["kom_hamada", "Kom Hamada", "كوم حمادة"],
    ["wadi_natrun", "Wadi El Natrun", "وادي النطرون"],
    ["hosh_issa", "Hosh Issa", "حوش عيسى"],
  ],
  kafr_el_sheikh: [
    ["kafr_el_sheikh_city", "Kafr El Sheikh", "كفر الشيخ"],
    ["desouk", "Desouk", "دسوق"],
    ["baltim", "Baltim", "بلطيم"],
    ["fuwwah", "Fuwwah", "فوه"],
    ["sidi_salem", "Sidi Salem", "سيدي سالم"],
    ["bella", "Bella", "بيلا"],
    ["qallin", "Qallin", "قلين"],
  ],
  damietta: [
    ["damietta_city", "Damietta", "دمياط"],
    ["new_damietta", "New Damietta", "دمياط الجديدة"],
    ["ras_el_bar", "Ras El Bar", "رأس البر"],
    ["faraskur", "Faraskur", "فارسكور"],
    ["kafr_saad", "Kafr Saad", "كفر سعد"],
    ["zarqa", "El Zarqa", "الزرقا"],
  ],
  ismailia: [
    ["ismailia_city", "Ismailia", "الإسماعيلية"],
    ["qantara_gharb", "El Qantara West", "القنطرة غرب"],
    ["tell_el_kebir", "Tell El Kebir", "التل الكبير"],
    ["fayed", "Fayed", "فايد"],
    ["abu_suwir", "Abu Suwir", "أبو صوير"],
  ],
  faiyum: [
    ["faiyum_city", "Faiyum", "مدينة الفيوم"],
    ["sennuris", "Sennuris", "سنورس"],
    ["tamiya", "Tamiya", "طامية"],
    ["ibsheway", "Ibsheway", "إبشواي"],
    ["itsa", "Itsa", "إطسا"],
    ["yusuf_el_siddiq", "Yusuf El Siddiq", "يوسف الصديق"],
  ],
  beni_suef: [
    ["beni_suef_city", "Beni Suef", "بني سويف"],
    ["nasser", "Nasser", "ناصر"],
    ["ihnasya", "Ihnasya", "إهناسيا"],
    ["beba", "Beba", "ببا"],
    ["fashn", "El Fashn", "الفشن"],
    ["samasta", "Samasta", "سمسطا"],
    ["wasta", "El Wasta", "الواسطى"],
  ],
  minya: [
    ["minya_city", "Minya", "المنيا"],
    ["mallawi", "Mallawi", "ملوي"],
    ["samalut", "Samalut", "سمالوط"],
    ["maghagha", "Maghagha", "مغاغة"],
    ["beni_mazar", "Beni Mazar", "بني مزار"],
    ["abu_qurqas", "Abu Qurqas", "أبو قرقاص"],
    ["deir_mawas", "Deir Mawas", "دير مواس"],
    ["matai", "Matai", "مطاي"],
  ],
  asyut: [
    ["asyut_city", "Asyut", "أسيوط"],
    ["dairut", "Dairut", "ديروط"],
    ["manfalut", "Manfalut", "منفلوط"],
    ["abnub", "Abnub", "أبنوب"],
    ["abu_tig", "Abu Tig", "أبو تيج"],
    ["sidfa", "Sidfa", "صدفا"],
    ["el_qusiya", "El Qusiya", "القوصية"],
    ["el_badari", "El Badari", "البداري"],
  ],
  sohag: [
    ["sohag_city", "Sohag", "سوهاج"],
    ["akhmim", "Akhmim", "أخميم"],
    ["girga", "Girga", "جرجا"],
    ["tahta", "Tahta", "طهطا"],
    ["tima", "Tima", "طما"],
    ["maragha", "El Maragha", "المراغة"],
    ["juhayna", "Juhayna", "جهينة"],
  ],
  qena: [
    ["qena_city", "Qena", "قنا"],
    ["nag_hammadi", "Nag Hammadi", "نجع حمادي"],
    ["dishna", "Dishna", "دشنا"],
    ["qus", "Qus", "قوص"],
    ["farshut", "Farshut", "فرشوط"],
    ["naqada", "Naqada", "نقادة"],
    ["abu_tesht", "Abu Tesht", "أبو تشت"],
  ],
  luxor: [
    ["luxor_city", "Luxor", "الأقصر"],
    ["armant", "Armant", "أرمنت"],
    ["esna", "Esna", "إسنا"],
    ["tod", "El Tod", "الطود"],
    ["new_tiba", "New Tiba", "طيبة الجديدة"],
    ["qurna", "El Qurna", "القرنة"],
  ],
  aswan: [
    ["aswan_city", "Aswan", "أسوان"],
    ["kom_ombo", "Kom Ombo", "كوم أمبو"],
    ["edfu", "Edfu", "إدفو"],
    ["nasr_el_nuba", "Nasr El Nuba", "نصر النوبة"],
    ["daraw", "Daraw", "دراو"],
    ["abu_simbel", "Abu Simbel", "أبو سمبل"],
    ["new_aswan", "New Aswan", "أسوان الجديدة"],
  ],
  red_sea: [
    ["hurghada", "Hurghada", "الغردقة"],
    ["safaga", "Safaga", "سفاجا"],
    ["el_quseir", "El Quseir", "القصير"],
    ["marsa_alam", "Marsa Alam", "مرسى علم"],
    ["ras_ghareb", "Ras Ghareb", "رأس غارب"],
    ["el_gouna", "El Gouna", "الجونة"],
    ["shalateen", "Shalateen", "الشلاتين"],
  ],
  new_valley: [
    ["kharga", "El Kharga", "الخارجة"],
    ["dakhla", "El Dakhla", "الداخلة"],
    ["farafra", "El Farafra", "الفرافرة"],
    ["paris", "Paris", "باريس"],
    ["balat", "Balat", "بلاط"],
  ],
  matrouh: [
    ["marsa_matrouh", "Marsa Matrouh", "مرسى مطروح"],
    ["el_alamein", "El Alamein", "العلمين"],
    ["sidi_barrani", "Sidi Barrani", "سيدي براني"],
    ["siwa", "Siwa", "سيوة"],
    ["sallum", "El Sallum", "السلوم"],
    ["el_hamam", "El Hamam", "الحمام"],
    ["el_dabaa", "El Dabaa", "الضبعة"],
    ["north_coast", "North Coast", "الساحل الشمالي"],
  ],
  north_sinai: [
    ["arish", "El Arish", "العريش"],
    ["sheikh_zuweid", "Sheikh Zuweid", "الشيخ زويد"],
    ["rafah", "Rafah", "رفح"],
    ["bir_el_abd", "Bir El Abd", "بئر العبد"],
    ["hasana", "El Hasana", "الحسنة"],
    ["nakhl", "Nakhl", "نخل"],
  ],
  south_sinai: [
    ["sharm_el_sheikh", "Sharm El Sheikh", "شرم الشيخ"],
    ["dahab", "Dahab", "دهب"],
    ["nuweiba", "Nuweiba", "نويبع"],
    ["taba", "Taba", "طابا"],
    ["saint_catherine", "Saint Catherine", "سانت كاترين"],
    ["tor", "El Tor", "الطور"],
    ["ras_sudr", "Ras Sudr", "رأس سدر"],
    ["abu_rudeis", "Abu Rudeis", "أبو رديس"],
  ],
};

export type AreaOption = { code: string; label: string };
export type AreaGroup = {
  governorate: string;
  governorateName: string;
  options: AreaOption[];
};

export const ALL_OF = "all";

function allOfLabel(governorate: string, locale: string) {
  const name = governorateLabel(governorate, locale);
  return locale === "ar" ? `كل ${name}` : `All of ${name}`;
}

// Areas for the given governorates (all of them if none are given), each group
// starting with "All of <governorate>", the rest alphabetical in the reader's
// language.
export function areaGroups(
  governorates: string[] | null,
  locale: string
): AreaGroup[] {
  const collator = new Intl.Collator(locale === "ar" ? "ar" : "en");
  return governorateOptions(locale)
    .filter((g) => !governorates || governorates.includes(g.code))
    .map((g) => {
      const items = [...(AREAS[g.code] ?? [])]
        .map(([slug, en, ar]) => ({
          code: `${g.code}:${slug}`,
          label: locale === "ar" ? ar : en,
        }))
        .sort((a, b) => collator.compare(a.label, b.label));
      return {
        governorate: g.code,
        governorateName: g.label,
        options: [
          { code: `${g.code}:${ALL_OF}`, label: allOfLabel(g.code, locale) },
          ...items,
        ],
      };
    });
}

// The name to show for a stored value. Values saved before this list existed
// were free text and are shown as typed.
export function areaLabel(value: string, locale: string) {
  const [governorate, slug] = value.split(":");
  if (!slug) return value;
  if (slug === ALL_OF) return allOfLabel(governorate, locale);
  const entry = (AREAS[governorate] ?? []).find(([s]) => s === slug);
  if (!entry) return value;
  return locale === "ar" ? entry[2] : entry[1];
}

export function governorateOfArea(value: string) {
  const [governorate, slug] = value.split(":");
  return slug ? governorate : null;
}

// Does a worker who lists these areas cover the one a client picked? Either
// they listed that exact area, or they cover the whole governorate it is in.
export function coversArea(workerAreas: string[], wanted: string) {
  const governorate = governorateOfArea(wanted);
  return workerAreas.some(
    (a) => a === wanted || (governorate && a === `${governorate}:${ALL_OF}`)
  );
}
