import { NextResponse } from "next/server";
import { getPreferredLocale, sendPush } from "@/lib/push";
import { pushLocale, pushText } from "@/lib/push-messages";
import { createClient } from "@/lib/supabase/server";

// "Send me a test notification" - to the signed-in user's own devices only.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const locale = pushLocale(await getPreferredLocale(user.id));
  const sent = await sendPush(user.id, {
    ...pushText("test", locale),
    url: `/${locale}/dashboard`,
  });

  return NextResponse.json({ sent });
}
