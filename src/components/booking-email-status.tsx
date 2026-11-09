"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export function BookingEmailStatus({
  bookingId,
  status,
  attempts,
  configured,
  lastAttempt,
}: {
  bookingId: string;
  status: string;
  attempts: number;
  configured: boolean;
  lastAttempt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!configured || !["pending", "sending"].includes(status)) return;
    let checks = 0;
    const timer = setInterval(() => {
      router.refresh();
      if (++checks >= 6) clearInterval(timer);
    }, 5000);
    return () => clearInterval(timer);
  }, [status, configured, router, lastAttempt]);
  const text =
    status === "sent"
      ? "Your confirmation email has been sent. Check your inbox or spam folder."
      : status === "skipped"
        ? "Email delivery is unavailable for this address. Your booking is saved here."
        : !configured
          ? "Email is unavailable right now. Your booking is safely saved here."
          : status === "sending"
            ? "Your confirmation email is being processed. If this continues, check your inbox before contacting the reservations team."
            : status === "failed"
              ? attempts >= 3
                ? "We couldn’t send your confirmation email after three attempts. Your booking remains confirmed and available here."
                : "The mail service could not accept your confirmation. Your booking is still confirmed; you can retry after a minute."
              : status === "pending"
                ? "Your confirmation email is queued."
                : "You can email this saved confirmation to your verified account address.";
  const canRetry =
    configured &&
    ["failed", "pending", "none"].includes(status) &&
    attempts < 3;
  async function send() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/bookings/${bookingId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="notice booking-email-notice">
      <p role="status">{text}</p>
      {canRetry && (
        <button className="text-button" disabled={busy} onClick={send}>
          {busy
            ? "Requesting…"
            : status === "none"
              ? "Email this confirmation"
              : "Retry confirmation email"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
