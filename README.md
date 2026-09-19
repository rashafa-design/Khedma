# Khedma

A two-sided services marketplace (Egypt) connecting clients with verified workers
(cleaning, catering, construction, driving, etc.). Clients browse freely; contact
details unlock after a monthly payment. Full requirements:
`C:\Users\rasha.ismail\.claude\plans\project-brief-worker-client-marketplace.md`.
Build plan: `C:\Users\rasha.ismail\.claude\plans\happy-wondering-hellman.md`.

Stack: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres, Auth,
Storage), deployed on Vercel. Arabic (default) and English via `next-intl`, with a
mirrored RTL layout for Arabic.

## Workflow

This deploys to Vercel straight from GitHub — push to `main` and Vercel rebuilds
automatically. There is no local Node/npm on this machine, so there is no local dev
server or local build: every change is verified by pushing and reading Vercel's cloud
build log, then testing the live URL. The same three values below need to be added once
in the Vercel project's Settings → Environment Variables (Vercel never reads a local
`.env.local` file).

## One-time setup (do these once, in order)

1. **Create a Supabase project** (free tier), in the same organization/account used for
   the course-slides-app project if convenient.
2. **Run the SQL for each phase manually**: Supabase dashboard → SQL Editor → paste the
   contents of the next unapplied file under `supabase/sql/` (in order, starting with
   `phase0_profiles.sql`) → Run.
3. **Turn off "Confirm email"**: Authentication → Providers → Email → toggle off
   "Confirm email". (Same simplification used on the course-slides-app — the free tier's
   built-in email sending has a very low rate limit that blocks testing otherwise. This
   also means signup logs the user in immediately with no confirmation link.)
4. **Site URL / Redirect URLs**: Authentication → URL Configuration. Set Site URL to the
   real Vercel domain once it exists, and add `https://<your-domain>/**` to Redirect
   URLs. (This step was easy to forget on the course-slides-app and caused confusion —
   don't skip it.)
5. **Google sign-in**: Authentication → Providers → Google. Create OAuth credentials in
   Google Cloud Console (OAuth consent screen + a Web application OAuth client), set the
   authorized redirect URI to the callback URL Supabase's Google provider page shows you,
   then paste the Client ID/Secret into Supabase.
6. **Copy the three connection values** from Supabase's "Connect" panel — Project URL,
   the **publishable key** (not the older "anon key" naming), and the **service role
   key** (needed from Phase 4 onward for admin-only routes; keep it out of any
   `NEXT_PUBLIC_` variable, it must never reach the browser) — into Vercel's Environment
   Variables, matching the names in `.env.local.example`.
7. **Connect this repo to Vercel** (import the GitHub repo as a new Vercel project — no
   `vercel.json` needed, Next.js is auto-detected).

## Project structure

- `app/[locale]/` — every user-facing page, under Arabic/English locale routing.
- `app/auth/` — Supabase's OAuth callback and email-confirmation routes (deliberately
  **not** locale-prefixed, since Supabase/Google control the exact callback URL).
- `lib/supabase/` — browser and server Supabase clients.
- `lib/types.ts` — hand-maintained TypeScript types mirroring the SQL schema.
- `i18n/` — `next-intl` configuration and locale-aware navigation helpers.
- `messages/{ar,en}.json` — all UI strings.
- `supabase/sql/` — one `.sql` file per build phase, applied manually via the SQL
  Editor (see step 2 above).

## Current status

**Phase 0 — done and verified live** (accounts, roles, Arabic/English + genuine RTL,
email+password sign-up/login/sign-out, session persists across reloads, protected
dashboard). Google sign-in is wired up in code but not yet configured in Supabase (no
Google OAuth credentials added yet) — untested until that's done.

**Phase 1 — done and verified live.** Admin-editable professions/task-types catalog at
`/admin/professions`, guarded by `app/[locale]/admin/layout.tsx` (redirects anyone whose
`profiles.role` isn't `'admin'` — confirmed both signed-out and non-admin visitors get
bounced). Confirmed: adding a profession, adding a task under it, and toggling
active/inactive all work end-to-end. To bootstrap the very first admin account, run in
Supabase's SQL Editor:
```sql
alter table public.profiles disable trigger profiles_prevent_role_escalation;
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
alter table public.profiles enable trigger profiles_prevent_role_escalation;
```
**Phase 2 — done and verified live.** Worker onboarding at `/worker/onboarding`:
profession select, nationality, years of experience, a required ID-document upload
(private bucket, no read-back policy for anyone but admin) and an optional profile photo
(public bucket). Confirmed: submitting creates a `pending_review` profile and the page
then shows a status card instead of the form; the worker cannot read back their own
uploaded ID document (verified directly against Supabase Storage - returns "not found");
non-worker accounts are redirected away from the onboarding page. Dashboard shows a
role-appropriate link (workers to onboarding, admins to the professions screen). Next:
Phase 3 (worker task entries - the price list).
