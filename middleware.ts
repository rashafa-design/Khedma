import { createServerClient, type CookieOptions } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // next-intl decides the locale-prefixed URL (rewrite/redirect) first; we
  // then only add/refresh Supabase's auth cookies onto that same response
  // rather than building a new one, so its routing decision is preserved.
  const response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Skips Next internals, static files, and the plain (non-locale) /auth
  // routes that Supabase's own email links and OAuth callback point at.
  matcher: ["/((?!api|_next|_vercel|auth|.*\\..*).*)"],
};
