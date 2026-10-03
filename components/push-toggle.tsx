"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type State = "loading" | "unsupported" | "denied" | "off" | "on";

// The "turn on notifications" card. Asking for permission has to come from a
// tap, so nothing happens until the person presses the button.
export function PushToggle({ audience }: { audience: "worker" | "client" }) {
  const t = useTranslations("push");
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unsupported");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        if (subscription && Notification.permission === "granted") {
          setState("on");
        } else if (Notification.permission === "denied") {
          setState("denied");
        } else {
          setState("off");
        }
      } catch {
        setState("unsupported");
      }
    }
    check();
  }, []);

  async function turnOn() {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        }));

      const json = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });
      if (!response.ok) throw new Error("save failed");
      setState("on");
    } catch {
      setMessage(t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setMessage(t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const data = (await response.json()) as { sent?: number };
      setMessage(data.sent ? t("testSent") : t("testNotSent"));
    } catch {
      setMessage(t("error"));
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <p className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-600">
        {t("unsupported")}
      </p>
    );
  }

  if (state === "on") {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-950">
        <p className="font-medium">✓ {t("on")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={sendTest}
            className="rounded-md border border-green-700 bg-white px-3 py-1.5 text-xs font-medium hover:bg-green-100 disabled:opacity-50"
          >
            {t("sendTest")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={turnOff}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            {t("turnOff")}
          </button>
        </div>
        {message && <p className="mt-2 text-xs">{message}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">🔔 {t("title")}</p>
      <p className="mt-1">
        {audience === "worker" ? t("bodyWorker") : t("bodyClient")}
      </p>
      {state === "denied" ? (
        <div className="mt-2">
          <p className="font-medium">{t("denied")}</p>
          <p className="mt-2 font-medium">{t("unblockTitle")}</p>
          <ol className="mt-1 list-decimal ps-5">
            <li>{t("unblock1")}</li>
            <li>{t("unblock2")}</li>
            <li>{t("unblock3")}</li>
          </ol>
          <p className="mt-2 text-xs">{t("unblockWebsite")}</p>
        </div>
      ) : (
        <>
          <p className="mt-3 font-medium">{t("stepsTitle")}</p>
          <ol className="mt-1 list-decimal ps-5">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
          </ol>
          <button
            type="button"
            disabled={busy}
            onClick={turnOn}
            className="mt-3 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {t("turnOn")}
          </button>
        </>
      )}
      {message && <p className="mt-2 text-xs text-red-700">{message}</p>}
    </div>
  );
}
