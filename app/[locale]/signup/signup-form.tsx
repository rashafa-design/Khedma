"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

export function SignupForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<UserRole>("client");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !data.user) {
      setError(t("signUpError"));
      setSubmitting(false);
      return;
    }

    // With email confirmation disabled for this proof of concept, signUp
    // returns an active session immediately, so we can create the profile
    // row right away instead of waiting for a confirmation-link callback.
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      role,
      full_name: fullName,
      phone_number: phoneNumber || null,
      preferred_locale: locale,
    });

    if (profileError) {
      setError(t("signUpError"));
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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t("iAmA")}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="role"
            checked={role === "client"}
            onChange={() => setRole("client")}
          />
          {t("roleClient")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="role"
            checked={role === "worker"}
            onChange={() => setRole("worker")}
          />
          {t("roleWorker")}
        </label>
      </fieldset>

      <input
        type="text"
        required
        placeholder={t("fullName")}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      />
      <input
        type="tel"
        placeholder={t("phoneNumber")}
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2"
      />
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
        minLength={6}
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
        {submitting ? t("submitting") : t("signUp")}
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
