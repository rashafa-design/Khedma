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
role-appropriate link (workers to onboarding, admins to the professions screen).

**Phase 3 — done and verified live.** Worker dashboard at `/worker/dashboard` (only
reachable once `worker_profiles.status = 'approved'` - the onboarding page now redirects
there automatically once approved, instead of showing a static message). Confirmed:
adding a task entry, the availability toggle, and the onboarding-to-dashboard redirect
all work end-to-end. Lets a worker:
add task entries (task + scope + price + billing unit - a list, not one flat price),
delete a task entry, toggle availability, and delete their whole worker profile (which
cascades and deletes their task entries too - this does **not** delete their login
account, just their worker listing, since deleting the actual `auth.users` row needs a
service-role admin route not built until Phase 4+). Requires running
`supabase/sql/phase3_worker_task_entries.sql`. Admin approval of a worker (Phase 4) isn't
built yet, so to test this phase, approve a worker manually via SQL Editor:
```sql
alter table public.worker_profiles disable trigger worker_profiles_prevent_self_review;
update public.worker_profiles set status = 'approved' where user_id = (select id from auth.users where email = 'worker@example.com');
alter table public.worker_profiles enable trigger worker_profiles_prevent_self_review;
```
**Phase 4 — done and verified live.** Confirmed: viewing a pending worker's ID document
returns the real uploaded file via a genuinely short-lived signed URL (checked by
downloading it directly), and approving removes the worker from the pending queue
immediately. Real admin ID-review screen at
`/admin/workers/pending` (linked from a new small nav bar on every admin page): lists
pending workers with a "View ID document" button (fetches a short-lived signed URL from
`app/api/admin/worker-id-url/route.ts`, which double-checks the caller is an admin
server-side before using a **service-role** Supabase client - the only client capable of
reading the ID-documents bucket, since it has no select policy for anyone else), plus
Approve/Reject buttons. Rejecting prompts for a reason, stored and shown to the worker.
**Needs a new environment variable added in Vercel before this can work:**
`SUPABASE_SERVICE_ROLE_KEY` (from Supabase's dashboard under Settings → API - the
"service_role" secret key, NOT the publishable key). No new SQL to run for this phase.

**Phase 5 — done and verified live.** Confirmed: nationality filter, home/business scope
filter (correctly matches `'both'`-scoped entries and correctly excludes a worker with no
task entries at all), and experience sorting all work correctly against two real approved
workers. Client browsing at `/browse`: every approved
worker's photo, name, profession, nationality, years of experience, and full task-entry
list (task, scope, price, billing unit) - phone numbers are not rendered anywhere yet
(that's Phase 7). Filters: profession, home/business (matches a worker if ANY of their
task entries has that scope or `'both'`), nationality (dropdown built from whichever
nationalities actually exist among approved workers). Sorting: newest, price low-to-high
(by the worker's cheapest task entry), most experienced. Filters/sort live in the URL
query string, so results are shareable/bookmarkable. Dashboard now shows a "Browse
workers" link for clients. No new SQL or env vars needed - reuses existing tables and
the public `worker-photos` bucket from Phase 2.

**Phases 6 and 7 — done and verified live**, including a real bug found and fixed during
testing (worker names weren't rendering on `/browse` or `/client/subscription` - Phase
0's profiles privacy rule was silently blocking names too, not just phone numbers; fixed
with `get_worker_display_name()`, see `supabase/sql/phase7b_worker_display_name.sql`).
Confirmed end to end: submit a payment → admin approves → subscription auto-created by
the trigger (10 slots, expires exactly 1 month later) → unlock two workers on `/browse` →
phone number reveals correctly for the one with a phone on file, gracefully shows "no
phone number on file" for the one without → `/client/subscription` shows both, correct
slot count → revisiting `/client/subscribe` with an active subscription redirects away
instead of allowing a second payment. The core monetization mechanic:

- **Phase 6 (payment):** `/client/subscribe` explains the deal (2,000 EGP, up to 10
  workers, exactly 1 month, full re-lock afterward, worker status can change monthly),
  shows the fixed pay-to number, and lets the client upload a screenshot as proof. Admin
  reviews it at `/admin/payments/pending` (same signed-URL-via-service-role pattern as
  Phase 4's ID documents). The instant an admin approves, a database trigger - not any
  application code - creates the client's `subscriptions` row with `expires_at` = now + 1
  month. A client with an already-active subscription is redirected away from the
  subscribe page entirely (can't double-pay mid-month); a client with a payment still
  pending review sees a waiting screen instead of the form; a rejected payment shows the
  reason and lets them resubmit immediately.
- **Phase 7 (unlock):** worker cards on `/browse` now show, for clients only, one of:
  the revealed phone number (already unlocked), an "Unlock contact" button (active
  subscription with slots left), "no slots left this month," or "subscribe to unlock"
  (no active subscription). Unlocking inserts one row into `unlocks`; a database trigger
  refuses an 11th unlock for the same subscription outright, independent of the button
  being disabled client-side. `/client/subscription` shows expiry date, slots used/left,
  and the unlocked workers' phone numbers. **No separate phone-number table was added** -
  the worker's `profiles.phone_number` (already collected at sign-up, already unreadable
  by other users per Phase 0's RLS) is reused, revealed only through a
  `get_worker_phone_number()` database function that checks for a live unlock first.
  Re-locking after a month needs no cron job: that check is live on every call.

**Needs a new environment variable in Vercel:** `NEXT_PUBLIC_PAYMENT_PHONE_NUMBER` - the
real phone number clients should send Instapay/Vodafone Cash payments to (shown as plain
text on the subscribe page; falls back to a placeholder `01000000000` if unset, so don't
forget to set the real one before this goes anywhere near real users). Needs
`supabase/sql/phase6_payments_and_subscriptions.sql`, then
`supabase/sql/phase7_unlocks_and_phone_access.sql`, then
`supabase/sql/phase7b_worker_display_name.sql`, run in that order.

## Arabic/RTL audit (Phase 10)

Done and verified live. A full grep across every screen for hardcoded directional
Tailwind classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`,
`text-right`, `rounded-l`, `rounded-r`, `border-l`, `border-r`, `float-left`,
`float-right`) found **zero genuine matches** - every layout was already built with
flexbox/logical properties (`gap-`, `justify-between`, `ms-`/`me-`) from Phase 0 onward,
so nothing needed retrofitting. Spot-checked `/browse` in Arabic and confirmed real
mirroring, not just translated text: the worker photo moved to the right side of the
card, text flows right-to-left, filter dropdowns reordered correctly. Fixed one small
gap found along the way: the dashboard's role label (`worker`/`client`/`admin`) was
showing the raw English database value instead of a translated word - added
`roleWorker`/`roleClient`/`roleAdmin` to the `dashboard` message namespace.
