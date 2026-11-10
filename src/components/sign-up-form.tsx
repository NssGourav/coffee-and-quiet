"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { NavigationLink as Link } from "@/components/navigation-link";
import { safeReturnPath } from "@/lib/registration";
export function SignUpForm({
  next,
  enabled,
}: {
  next: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const formEmail = verifying ? email : String(form.get("email"));
    try {
      const response = await fetch(
        verifying ? "/api/auth/verify" : "/api/auth/sign-up",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            verifying
              ? { email: formEmail, token: form.get("token") }
              : { email: formEmail, password: form.get("password") },
          ),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Please try again.");
      if (verifying) {
        router.push(safeReturnPath(next));
        router.refresh();
      } else {
        setEmail(formEmail);
        setVerifying(true);
        setNotice(result.message);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!enabled)
    return (
      <div className="stack">
        <p className="notice" role="status">
          New accounts are temporarily unavailable while email delivery is being
          connected. Existing accounts can still sign in.
        </p>
        <Link
          href={`/sign-in?next=${encodeURIComponent(safeReturnPath(next))}`}
        >
          Back to sign in
        </Link>
      </div>
    );
  return (
    <form className="stack" onSubmit={submit}>
      {verifying ? (
        <>
          <p className="muted">
            Enter the code sent to <strong>{email}</strong>.
          </p>
          <label>
            Verification code
            <input
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
        </>
      ) : (
        <>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              aria-describedby="password-help"
              required
            />
          </label>
          <p className="small muted" id="password-help">
            Use at least 10 characters. We’ll email a code to verify your
            address.
          </p>
        </>
      )}
      {notice && (
        <p className="small muted" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy
          ? "One moment…"
          : verifying
            ? "Verify email & continue"
            : "Create guest account"}
        <span aria-hidden>↗</span>
      </button>
      {verifying && (
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => {
            setVerifying(false);
            setNotice("");
            setError("");
          }}
        >
          Change email or request a new code
        </button>
      )}
      <p className="small muted">
        Your account is for guest bookings and enquiries. Booking confirmations
        will be emailed to your verified address.
      </p>
      <Link href={`/sign-in?next=${encodeURIComponent(safeReturnPath(next))}`}>
        Already have an account? Sign in
      </Link>
    </form>
  );
}
