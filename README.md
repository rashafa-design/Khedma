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

## Android app (Phase 11)

Code is built, but the actual APK has never been produced yet - it needs a one-time,
manual setup in GitHub before the first build can run. The Android "app" is a Trusted
Web Activity (Chrome wrapped as an installable shell around the live site) - there is no
separate app codebase, so it only needs rebuilding when shell-level things change
(icon, package id), never for ordinary website updates.

**Files:** `public/manifest.json` + `public/icons/` (PWA manifest and app icons -
generated locally via PowerShell's System.Drawing since this machine has no
Python/ImageMagick; simple placeholder "K" wordmark, swap for a real logo whenever one
exists), `android/twa-manifest.json` (Bubblewrap's config - package id
`app.khedma.twa`, points at the live `khedma-psi.vercel.app` host), `public/.well-known/assetlinks.json`
(proves this Android package is allowed to act as this website - currently has a
placeholder fingerprint, must be updated once the real keystore exists, see below),
`.github/workflows/generate-android-keystore.yml` (run once, ever) and
`.github/workflows/build-android.yml` (run whenever a new APK build is needed),
`app/[locale]/download/page.tsx` (the page real users land on, linked from the homepage).

**One-time setup, in order:**
1. In the GitHub repo → Settings → Secrets and variables → Actions, add a temporary
   secret `KEYSTORE_TEMP_PASSWORD` (any password you'll remember).
2. Actions tab → "Generate Android signing keystore (run ONCE, manually)" → Run workflow
   → type `generate` to confirm → Run.
3. Once it finishes, open the run, download the `android-keystore-DOWNLOAD-THEN-DELETE`
   artifact **immediately**, and back up the `android.keystore` file inside it somewhere
   safe outside GitHub (password manager / private cloud storage). This is the single
   most important file in this whole phase - GitHub secrets are write-only (can't be
   read back later), so if this file is lost without a backup, every future app update
   would break existing installs and there would be no way to fix it.
4. In that same run's log, copy the `SHA256:` fingerprint value shown in the "Show the
   fingerprint" step, and send it over - it needs to replace the placeholder in
   `public/.well-known/assetlinks.json`.
5. Add two more (permanent) secrets: `ANDROID_KEYSTORE_BASE64` (the contents of
   `android.keystore.base64.txt` from that same artifact) and
   `ANDROID_KEYSTORE_PASSWORD` (the same value as `KEYSTORE_TEMP_PASSWORD` from step 1).
6. Delete the `KEYSTORE_TEMP_PASSWORD` secret and delete the workflow artifact from
   GitHub (cleanup - it also auto-expires in 1 day regardless).
7. Actions tab → "Build Android app" → Run workflow. This produces a signed
   `Khedma.apk`, attached to a new GitHub Release.
8. Visit `/download` on the live site and confirm the APK downloads and installs on a
   real Android device.

**Status: build succeeds (2026-09-22), APK published.** Getting there took ~9 rounds of
"push, read the Actions log, fix forward" - worth knowing the real story before touching
`build-android.yml` again:
1. Piped keystore-password answers hit the WRONG prompt - Bubblewrap's first-ever run
   asks interactively whether to install its own JDK/Android SDK before ever reaching
   keystore questions.
2. Tried pre-staging a JDK/SDK ourselves (`setup-java` + `setup-android`) and pointing
   Bubblewrap at them via a hand-written `~/.bubblewrap/config.json`. Hit "the provided
   androidSdk isn't correct" four different ways (missing packages, two config-key-name
   guesses, a missing `cmdline-tools/latest` symlink) - confirmed via diagnostics that the
   config file WAS in the right place with the right values, yet still rejected. Root
   cause never identified; abandoned rather than keep guessing blind.
3. Switched to letting Bubblewrap install its own JDK/SDK (its documented "recommended"
   default) - the right general direction, but piped "y" answers (even 30 of them,
   pre-queued) kept dying at the same spot.
4. Real logs revealed why: the confirm-prompt reads and discards the ENTIRE piped stdin
   buffer in one gulp per prompt, not one line per question - so no amount of upfront
   padding can ever satisfy more than the first prompt it hits.
5. Fixed by feeding answers ONE AT A TIME with a `sleep 3` between each (self-terminates
   via SIGPIPE once bubblewrap exits) - only one line is ever sitting in the pipe when a
   prompt actually reads.
6. That got past every prompt into a real Gradle build, which then failed with a fully
   self-explanatory error: GitHub's runner pre-sets `ANDROID_SDK_ROOT` to its own
   preinstalled SDK, conflicting with Bubblewrap's self-installed one (`ANDROID_HOME`).
   Fixed with `unset ANDROID_SDK_ROOT`.
7. APK built successfully. Attaching it to a GitHub Release then failed with "HTTP 403:
   Resource not accessible by integration" - the default `GITHUB_TOKEN` is read-only
   unless a workflow explicitly requests write access. Fixed with a `permissions:
   contents: write` block.
8. Build succeeded end to end (6m39s) and published a release - but the `/download`
   page's link still 404'd for a real visitor, because **the GitHub repo itself was
   private**, and private-repo release assets require a GitHub login to fetch. Checked
   the full git history first to confirm no real secret values were ever committed (only
   empty placeholder variable names and code that references env vars by name), then
   made the repo public.
9. Confirmed live: the release and `Khedma.apk` asset are now reachable without any
   login.

**Confirmed working on a real Android phone (2026-09-22):** installed via `/download`,
opened genuinely chromeless (no browser address bar - the Digital Asset Links fingerprint
setup worked), and every screen tested correctly on-device (home, sign-in, browse with
filters, subscription page with phone reveal). Phase 11 is done.

## Admin dashboard (Phase 9)

Built: `/admin` is now the admin landing page (linked from both the main dashboard and
the admin nav bar) showing three counts - pending worker reviews, pending payments, and
active subscriptions - with the first two clickable straight through to their review
queues. Purely cosmetic/convenience, no new tables or logic. No new SQL or env vars
needed.

## Site navigation

Every page now sits under one shared, role-aware header (`components/site-header.tsx`,
mounted in `app/[locale]/layout.tsx`) instead of each page carrying its own language
switcher. It shows the brand (links to the dashboard when signed in, home otherwise), the
language switcher, a sign-out button when signed in, and a row of links that depends on who
is signed in: signed out gets Log in / Sign up / Android app; clients get Dashboard / Browse
workers / My subscription; workers get Dashboard / My listing; admins get Dashboard /
Admin / Browse workers (the admin screens keep their own sub-nav underneath). The current
page's link is highlighted, and the link row scrolls sideways on narrow phone screens rather
than wrapping. Page heights were reduced from `min-h-screen` to
`min-h-[calc(100vh-7rem)]` so the header doesn't cause a pointless extra scrollbar.
No new SQL or env vars.

## Starter catalog of professions and tasks

`supabase/sql/seed_professions_and_tasks.sql` holds the starter list that was loaded on
2026-10-02: 41 professions (home repair trades, appliance/AC/TV technicians, beauty and
barbers, cooks and caterers, childcare and care, drivers and movers, car services, and more)
with 174 tasks, all in English and Arabic. It only inserts rows whose English name doesn't
already exist, so it is safe to re-run and never overwrites what an admin has edited. Before
this, the catalog held only the "Cleaner" test entry created during Phase 1. Everything in it
can be renamed, deactivated or extended from `/admin/professions`.

## Nationalities

A worker's nationality is now picked from a hand-curated list (`lib/nationalities.ts`: UN
member states plus Palestine, Kosovo and Taiwan, with an "Other" catch-all; entries are added
or removed by editing that file) instead of typed freely,
and is stored as an ISO country code such as `EG`, never as text. Before this, the same
nationality could be stored several ways ("Egypt", "Egyptian", "مصري") and the browse filter
treated them as different people. The name shown follows the viewer's language, Egyptian is
pinned first in every list, and the browse filter now lists all nationalities rather than only
those that currently have a worker. Rows saved before the change are converted with
`supabase/sql/migrate_nationality_to_codes.sql`; any value that isn't a known code is shown as
stored rather than hidden. Workers can't edit their nationality after onboarding yet.

## "Unlocked before" flag

Contact numbers re-lock when a month ends, so a client who pays again has no way to tell which
workers they already spent a slot on. On `/browse`, any worker the client unlocked in an
EARLIER month now carries an amber "You unlocked this worker before (date)" badge, and pressing
Unlock on one asks for confirmation first ("unlocking again uses another slot"). Workers
unlocked in the CURRENT month show their phone number as before, with no badge. The history
comes from the existing `unlocks` rows (they stay after a subscription expires), so there is no
new table or SQL. Only unlocking is tracked: contacting a worker happens outside the app (call
or WhatsApp) and merely looking at a card isn't recorded, so "unlocked" is the one signal the
app can honestly give. The rule that an expired month re-locks everyone, and that re-unlocking
costs a slot, is unchanged.

## Unlock counter and "unlocked" sign

For clients, `/browse` now shows a banner pinned near the top: "2 of 10 workers unlocked", "8 left",
a progress bar and "Your access lasts until <date>" (the "left" count turns red at zero). A client
with no active subscription sees a notice with a Subscribe link instead. Workers whose contact the
client has unlocked this month carry a green "✓ Unlocked" sign next to their phone number, alongside
the amber "unlocked before" sign for earlier months. Both are derived from the existing
subscription and unlock rows; no new table or SQL. Only unlocking is tracked - just viewing a card is
not recorded.

## Dashboard welcome and user information

`/dashboard` now opens with a welcome - "Welcome to Khedma, <first name>!" for an account less than a day
old, otherwise a greeting that follows the time of day in Egypt ("Good morning/afternoon/evening, ...") -
with a one-line intro for the user's role. Below it are two cards. "Your information" lists name, email,
phone, role and the month they joined. The card above it depends on the role: clients see their
subscription (workers unlocked, slots left, access end date) or a Subscribe prompt; workers see their
listing (profession, nationality, experience, review status, availability, number of services) with a
link to manage it or finish applying; admins see the pending worker and payment counts. All read-only
from existing tables; no new SQL.

The signed-in user's name (with their role underneath) now sits in the header on every page, next to
the Khedma logo, and links to the dashboard. Long names are cut off with an ellipsis so they can't push
the language and sign-out buttons off a phone screen; the full name shows on hover. If someone signed in
with Google and hasn't finished their profile yet, their email is shown instead.

## Seen / viewed / unlocked markers (Phase 12)
Run `supabase/sql/phase12_worker_views.sql` once. For clients, every worker card on Browse is colour-coded: green = unlocked now, amber = unlocked in a past month, blue = viewed only, white = not seen yet. A card counts as "viewed" once it has been mostly on screen for 2 seconds (`view-tracker.tsx`, writes to `worker_views`). A "Show" filter (all / new / viewed only / unlocked) sits with the other filters. Views are kept across subscription months.

## Worker locations and on-screen help (Phase 13)
Run `supabase/sql/phase13_worker_locations.sql` once. Workers now give the governorate they live in and at least one governorate where they work (`worker_profiles.base_governorate`, `worker_service_areas`; names in `lib/governorates.ts`). The database refuses to remove a worker's last area, and Browse hides any worker with no area. Clients get a governorate filter and each card shows where the worker lives and works. Every page also has a blue help box (`components/help-box.tsx`) whose text lives under `help.*` in `messages/en.json` and `messages/ar.json`.

## Keeping listings honest (Phase 14)
Run `supabase/sql/phase14_checkins_and_reports.sql` once. Workers are asked every 90 days to confirm their details and availability (banner on both worker dashboards, 14 days' warning); ignoring it for 14 more days hides the listing from Browse until they confirm. Clients can report an unlocked worker (number not working / not looking / found a job); two different clients reporting since the worker last confirmed also hides the worker until they confirm again. The admin dashboard shows how many workers have open reports. Numbers live in `lib/checkin.ts` and `get_hidden_worker_ids()` - change both together.

## Availability checks, 2-weekly renewal, client follow-up (Phase 15)
Run `supabase/sql/phase15_availability_and_feedback.sql` once (it also contains the "ask before unlocking" part).
- **Ask before unlocking:** a client taps "Check availability" (free). The worker gets a green box on their dashboard and has 24 hours to say Yes/No. An unlock is only possible after a Yes given in the last 48 hours - enforced by a trigger on `unlocks`, not just the button. A Yes refreshes the worker's availability date; a No marks them unavailable. An unanswered request counts as a bad experience. Max 3 open checks per client. Delivery is in-app only for now; WhatsApp/email/push would just notify the worker that a request exists.
- **2-weekly renewal:** workers marked available are asked from day 10, clients see a warning tag from day 14, hidden from Browse at day 28 (`lib/checkin.ts` + `get_hidden_worker_ids()`).
- **Follow-up:** ~3 days after an unlock the client is asked "did you reach them?" (`unlock_feedback`). Bad answers, reports and unanswered checks all feed `worker_negative_events`: 2 different clients since the worker last confirmed, or 3 in 90 days, hides the worker. Only an admin ("Flagged workers" page) can clear the 90-day record.

## Push notifications (Phase 16)
Run `supabase/sql/phase16_push_subscriptions.sql` once. Workers and clients tap "Turn on notifications" on their dashboard (service worker `public/sw.js`, subscriptions in `push_subscriptions`). Sent with the `web-push` library using VAPID keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` in Vercel env vars; generate a new pair with openssl if they are ever lost - everyone then has to turn notifications on again).
- Worker gets a push when a client asks "are you available?" (`/api/push/notify-request`, called by the client's browser after the request is saved).
- Client gets a push when the worker answers (`/api/push/notify-answer`).
- A daily cron (`vercel.json` -> `/api/cron/reminders`, protected by `CRON_SECRET`) nudges workers whose 2-weekly / 3-monthly check-ins are due.
- Inside the Android app this needs `enableNotifications: true` in `android/twa-manifest.json` (done, version 1.1.0) and a rebuild + reinstall of the APK. In plain Chrome it works without that.
- NEVER commit keystores, APKs or key notes: they are in `.gitignore` now (an earlier `git add -A` pushed them to the public repo - see the security note in the conversation / rotate the signing key).

## Android signing key was replaced (2026-10-03)
The first signing key was accidentally committed to this public repo, so it was retired. The new key (fingerprint in `public/.well-known/assetlinks.json`) and its password are kept in the git-ignored folder `Khedma-signing-key-BACKUP` next to this README (never committed) and in two GitHub secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`). Keep a second backup of that folder somewhere safe (password manager / private cloud): if the key and password are lost, the app can never be updated again, only replaced.

## Several professions + monthly/visit workers (Phase 17)
Run `supabase/sql/phase17_multiple_professions_and_work_types.sql` once. A worker picks a MAIN profession at sign-up (now a required choice with a placeholder - it used to pre-select Cleaner), can add more from "Your professions" on their dashboard (`worker_professions`; task entries must belong to one of their professions, enforced by a trigger), and ticks how they work: `monthly`, `visits` or both (`worker_profiles.work_types`). Browse has All / Monthly / Visits tabs, the profession filter matches any of a worker's professions, and cards show every profession plus a work-type badge.

## Two plans + neighborhoods for visit workers (Phase 18)
Run `supabase/sql/phase18_visit_plan_and_neighborhoods.sql` once. Clients can buy two things (numbers in `lib/plans.ts` AND in the SQL - change both): **visits pass** 50 EGP / 5 workers / 3 days, and **monthly plan** 2,000 EGP / 10 workers / 1 month. A client can hold one active plan of each kind; a plan only unlocks workers whose `work_types` include that kind (enforced in the unlock + availability-request triggers). The payment amount is set by a trigger from the plan, never by the browser. `/client/subscribe` shows both plans; `/client/subscribe?plan=visits|monthly` is the payment form. Visit workers must list neighborhoods (`worker_profiles.service_neighborhoods`, free text with suggestions from other workers); Browse has a "near you" box and the Visits tab hides visit workers with no neighborhood.

## Listings must be complete to show (Phase 19)
Run `supabase/sql/phase19_incomplete_worker_ids.sql` once. Phone number is now required for workers at sign-up. A worker only appears in Browse once: approved, phone on file, at least one priced task (`get_incomplete_worker_ids()`), plus (checked in the app) work location and, for visit workers, a neighborhood. The worker dashboard shows a checklist of what is missing.

## Transportation fee (Phase 20)
Run `supabase/sql/phase20_transport_fee.sql` once. Visit workers enter a transportation fee per visit (EGP, 0 = free; `worker_profiles.transport_fee`). It is explicitly separate from their visit/hourly prices (worker screens say so; client cards say "on top of the price"). Required for visit workers (checklist item; visit workers without it stay out of the Visits tab).

## One group per worker (Phase 22)
Run `supabase/sql/phase22_one_work_type_per_worker.sql` once. A worker is EITHER a monthly worker OR a visit worker (radio buttons; the database requires exactly one value in `work_types`). A phone number is one number, so a worker offering both would reveal it under a plan the client never bought. A worker who truly does both registers a second account.

## Paid worker follows the plan paid with (Phase 23 - replaces phases 21 and 22)
Workers may offer monthly work, visit work, or both. A worker you paid for under one plan also shows (unlocked, number visible) under the other plan's tab with no second payment and never counted twice (`unlocks_no_duplicate_across_plans` trigger) - but only until the plan you PAID with expires: 3 days for the visits pass, 1 month for the monthly plan (each unlock belongs to one subscription; `get_worker_phone_number` checks that subscription's expiry). Browse shows "Paid with your ... until <date>" on those cards. Phase 21/22 SQL files are kept for history but superseded.
