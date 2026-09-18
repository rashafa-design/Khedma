import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Handles Supabase's email confirmation link. Unused while "Confirm email"
// is turned off for this proof of concept (see README - same simplification
// used on the sibling course-slides-app to dodge the free tier's low email
// rate limit), but kept ready for when it's turned back on.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const locale = searchParams.get("locale") ?? routing.defaultLocale;
  const next = searchParams.get("next") ?? `/${locale}/dashboard`;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/${locale}/login?error=confirmation-failed`
  );
}
