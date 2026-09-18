import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect back from Google OAuth. If this is the user's first
// sign-in (no profiles row yet - signup and login use the same OAuth flow),
// send them to complete-profile to pick worker/client and fill in the rest,
// same as the email/password signup form collects up front.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const locale = searchParams.get("locale") ?? routing.defaultLocale;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      const next = profile ? "dashboard" : "complete-profile";
      return NextResponse.redirect(`${origin}/${locale}/${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/${locale}/login?error=auth-callback-failed`
  );
}
