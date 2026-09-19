import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS entirely. Only ever use this after
// independently checking (via the request-scoped server client, which DOES
// respect RLS/auth) that the caller is actually an admin - never expose
// this client or its key to the browser.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
