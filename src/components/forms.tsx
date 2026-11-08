"use client";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  effectiveStatus,
  rupees,
  type Stay,
  type SearchInput,
  type Booking,
} from "@/lib/domain";
async function post(path: string, data: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Please try again.");
  return json;
}
function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <p className="notice error" role="alert">
      {message}
    </p>
  ) : null;
}
export function SignInForm({
  next,
  inline = false,
}: {
  next: string;
  inline?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await post("/api/auth/sign-in", {
        email: form.get("email"),
        password: form.get("password"),
      });
      if (inline) router.refresh();
      else {
        router.push(
          next.startsWith("/") && !next.startsWith("//") ? next : "/",
        );
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="stack">
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
      </label>
      <ErrorNotice message={error} />
      <button disabled={busy} className="button">
        {busy ? "Signing in…" : "Sign in & continue"} <span aria-hidden>↗</span>
      </button>
      <p className="muted small">
        Use a synthetic reviewer account created by the local setup. No real
        guest details.
      </p>
    </form>
  );
}
export function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        className="text-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await post("/api/auth/sign-out", {});
            router.push("/");
            router.refresh();
          } catch {
            setError("Sign out failed. Retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
export function HoldForm({
  stay,
  search,
}: {
  stay: Stay;
  search: SearchInput;
}) {
  const router = useRouter();
  const [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const requestKey = useRef<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    requestKey.current ??= crypto.randomUUID();
    try {
      const result = await post("/api/holds", {
        ...search,
        roomType: stay.id,
        guestName: name,
        idempotencyKey: requestKey.current,
        expectedTotal: stay.total,
        expectedVersions: stay.nights.map((night) => night.version),
      });
      router.push(`/checkout/${result.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      <label>
        Guest name
        <input
          name="guestName"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            requestKey.current = null;
          }}
          required
          maxLength={80}
          autoComplete="name"
          placeholder="Enter a synthetic guest name"
        />
      </label>
      <p className="small muted">
        Your room will be held for 10 minutes while you review the price and try
        a simulated payment. No card details are collected.
      </p>
      <ErrorNotice message={error} />
      <button disabled={busy || !stay.available} className="button">
        {busy ? "Holding your stay…" : "Continue to review"}{" "}
        <span aria-hidden>→</span>
      </button>
      {error && (
        <Link
          href={`/rooms/${stay.id}?${new URLSearchParams({ ...search, adults: String(search.adults), children: String(search.children) })}`}
          className="text-link"
        >
          Refresh availability & price
        </Link>
      )}
    </form>
  );
}
export function PaymentForm({
  booking,
  initialNow,
}: {
  booking: Booking;
  initialNow: number;
}) {
  const router = useRouter();
  const [now, setNow] = useState(initialNow),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const event = useRef<{ id: string; outcome: string } | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const status = effectiveStatus(
    booking.status,
    booking.expires_at,
    new Date(now),
  );
  const seconds = Math.max(
    0,
    Math.ceil((new Date(booking.expires_at).getTime() - now) / 1000),
  );
  async function pay(outcome: "success" | "failure") {
    setBusy(true);
    setError("");
    if (event.current?.outcome !== outcome)
      event.current = { id: crypto.randomUUID(), outcome };
    try {
      await post(`/api/bookings/${booking.id}/payment`, {
        eventId: event.current!.id,
        outcome,
      });
      router.push(`/bookings/${booking.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (status !== "held")
    return (
      <div className="notice">
        <h3>
          {status === "expired"
            ? "Your hold has expired"
            : `This booking is ${status}`}
        </h3>
        <p>
          {status === "expired"
            ? "The room has been released. Please check availability again."
            : "View the saved booking for the latest status."}
        </p>
        <Link
          className="button"
          href={status === "confirmed" ? `/bookings/${booking.id}` : "/#stays"}
        >
          {status === "confirmed" ? "View confirmation" : "Choose another stay"}
        </Link>
      </div>
    );
  return (
    <div className="stack">
      <div className="hold-clock">
        <span>Room held for you</span>
        <strong
          aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`}
        >
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </strong>
      </div>
      <div className="notice">
        <strong>Test payment · no money moves</strong>
        <p>
          This assessment uses a simulated payment. Do not enter card or bank
          details.
        </p>
      </div>
      <ErrorNotice message={error} />
      <button className="button" disabled={busy} onClick={() => pay("success")}>
        {busy
          ? "Processing simulation…"
          : `Simulate payment · ${rupees(booking.total_paise)}`}{" "}
        <span aria-hidden>→</span>
      </button>
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => pay("failure")}
      >
        Try a failed payment
      </button>
      <p className="small muted">
        A failed payment releases this hold. A success received after expiry
        requires a new booking.
      </p>
    </div>
  );
}
export function InventoryRow({
  row,
}: {
  row: {
    room_type: string;
    night: string;
    allotment: number;
    rate_paise: number;
    version: number;
    available: number;
  };
}) {
  const router = useRouter();
  const [allotment, setAllotment] = useState(row.allotment),
    [rate, setRate] = useState(String(row.rate_paise / 100)),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false);
  useEffect(() => {
    setAllotment(row.allotment);
    setRate(String(row.rate_paise / 100));
  }, [row]);
  return (
    <form
      className="inventory-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          await post("/api/staff/inventory", {
            roomType: row.room_type,
            night: row.night,
            allotment,
            ratePaise: Math.round(Number(rate) * 100),
            version: row.version,
          });
          setError(false);
          setMessage("Saved");
          router.refresh();
        } catch (e) {
          setError(true);
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="inventory-date">
        {row.night}
        <small>
          {row.allotment - row.available} committed · {row.available} available
        </small>
      </span>
      <label>
        <span className="sr-only">
          Nightly base rate for {row.night} in rupees
        </span>
        <span className="mobile-field-label" aria-hidden="true">
          Base rate / night
        </span>
        <span className="input-prefix">
          ₹{" "}
          <input
            aria-label={`Base rate ${row.night}`}
            type="number"
            min="1"
            max="100000"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </span>
      </label>
      <label>
        <span className="sr-only">Website allotment for {row.night}</span>
        <span className="mobile-field-label" aria-hidden="true">
          Website allotment
        </span>
        <input
          aria-label={`Allotment ${row.night}`}
          type="number"
          min="0"
          max="76"
          value={allotment}
          onChange={(e) => setAllotment(Number(e.target.value))}
          required
        />
      </label>
      <button className="button small-button" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </button>
      {message && (
        <p
          className={error ? "row-message error-text" : "row-message"}
          role={error ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </form>
  );
}
