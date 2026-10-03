// The words of each push notification, in both languages. Kept here (rather
// than in messages/*.json) because a notification is built on the server for
// someone who is not the person making the request, in THEIR language.
export type PushLocale = "ar" | "en";

export function pushLocale(value: string | null | undefined): PushLocale {
  return value === "en" ? "en" : "ar";
}

const TEXT = {
  request: {
    ar: (hours: number, visits: boolean) => ({
      title: visits
        ? "عميل يريد زيارة - هل أنت متاح؟"
        : "عميل يسأل إن كنت متاحًا",
      body: `افتح خدمة وأجب بنعم أو لا خلال ${hours === 3 ? "3 ساعات" : `${hours} ساعة`}.`,
    }),
    en: (hours: number, visits: boolean) => ({
      title: visits
        ? "A client wants a visit - are you available?"
        : "A client is asking if you're available",
      body: `Open Khedma and answer Yes or No within ${hours} hours.`,
    }),
  },
  answerYes: {
    ar: (name: string) => ({
      title: "العامل متاح ✓",
      body: `${name} أكد أنه متاح. يمكنك فتح بياناته الآن.`,
    }),
    en: (name: string) => ({
      title: "The worker is available ✓",
      body: `${name} confirmed they are available. You can unlock them now.`,
    }),
  },
  answerNo: {
    ar: (name: string) => ({
      title: "العامل غير متاح",
      body: `${name} غير متاح حاليًا. اختر عاملًا آخر - لم تُستهلك أي فتحة.`,
    }),
    en: (name: string) => ({
      title: "The worker is not available",
      body: `${name} is not available right now. Pick another worker - no slot was used.`,
    }),
  },
  availDue: {
    ar: {
      title: "هل ما زلت متاحًا للعمل؟",
      body: "افتح خدمة وأكّد ذلك بضغطة واحدة حتى يبقى ملفك ظاهرًا للعملاء.",
    },
    en: {
      title: "Are you still available for work?",
      body: "Open Khedma and confirm with one tap so clients keep seeing your listing.",
    },
  },
  detailsDue: {
    ar: {
      title: "حان وقت تأكيد بياناتك",
      body: "افتح خدمة وراجع أسعارك ومواقعك ورقم هاتفك ثم أكّد.",
    },
    en: {
      title: "Time to confirm your details",
      body: "Open Khedma, check your prices, locations and phone number, then confirm.",
    },
  },
  test: {
    ar: {
      title: "الإشعارات تعمل ✓",
      body: "ستصلك هنا تنبيهات خدمة المهمة.",
    },
    en: {
      title: "Notifications are working ✓",
      body: "Important Khedma alerts will appear here.",
    },
  },
} as const;

export function pushText(
  kind: "availDue" | "detailsDue" | "test",
  locale: PushLocale
) {
  return TEXT[kind][locale];
}

// "A client is asking if you're available" - the reply window is 3 hours for
// visit requests and 24 hours for monthly ones (see phase 24 SQL).
export function pushRequestText(
  locale: PushLocale,
  plan: "monthly" | "visits"
) {
  return TEXT.request[locale](plan === "visits" ? 3 : 24, plan === "visits");
}

export function pushAnswerText(
  yes: boolean,
  name: string,
  locale: PushLocale
) {
  return (yes ? TEXT.answerYes : TEXT.answerNo)[locale](name || "—");
}
