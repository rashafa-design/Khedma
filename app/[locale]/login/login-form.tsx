"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(t("logInError"));
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?locale=${locale}`,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="email"
        required
        placeholder={t("email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      />
      <input
        type="password"
        required
        placeholder={t("password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? t("submitting") : t("logIn")}
      </button>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        {t("orDivider")}
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="rounded-md border border-gray-300 px-4 py-2 font-medium hover:bg-gray-100"
      >
        {t("continueWithGoogle")}
      </button>
    </form>
  );
}
