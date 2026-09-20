import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Admin-only signed URL for a client's payment-proof screenshot. Same
// pattern as app/api/admin/worker-id-url/route.ts: the admin check runs
// here, server-side, against the caller's own session, before the
// service-role client (the only thing that can read this private bucket)
// is ever touched.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.storage
    .from("payment-proofs")
    .createSignedUrl(path, 60 * 5);

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not create signed URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: data.signedUrl });
}
