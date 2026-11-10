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
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const submittedForm = event.currentTarget;
    const form = new FormData(submittedForm);
    const formEmail = verifying ? email : String(form.get("email"));
    try {
      const response = await fetch(
        verifying ? "/api/auth/verify" : "/api/auth/sign-up",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            verifying
              ? { email: formEmail, token: code }
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
        submittedForm.reset();
        setEmail(formEmail);
        setCode("");
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
    <form
      key={verifying ? "verify-email" : "create-account"}
      className="stack"
      onSubmit={submit}
    >
      {verifying ? (
        <>
          <p className="muted">
            Enter the code sent to <strong>{email}</strong>.
          </p>
          <label>
            Verification code
            <input
              id="signup-verification-code"
              name="token"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => {
                const value = event.currentTarget.value.replace(/\s/g, "");
                // Reject password autofill rather than extracting its digits.
                if (/^[0-9]{0,6}$/.test(value)) setCode(value);
              }}
              autoFocus
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
              id="signup-email"
              name="email"
              type="email"
              defaultValue={email}
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <label>
            Password
            <input
              id="signup-password"
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
            setCode("");
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
