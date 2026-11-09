import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const base = process.env.APP_ORIGIN ?? "http://127.0.0.1:3000";
const settings = JSON.parse(
  readFileSync(".local/supabase-status.json", "utf8"),
);
const local = JSON.parse(readFileSync(".local/database.json", "utf8"));
for (const url of [base, settings.API_URL, local.ownerUrl])
  assert.ok(
    ["localhost", "127.0.0.1"].includes(new URL(url).hostname),
    "Local-only test",
  );
const mailpit = "http://127.0.0.1:54324";
const admin = createClient(settings.API_URL, settings.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const db = new pg.Client({ connectionString: local.ownerUrl });
await db.connect();
assert.equal(
  (await db.query("select current_database() name")).rows[0].name,
  "resort_dev",
);
const email = `signup-${randomUUID()}@review.example.net`;
const password = `Test-${randomBytes(18).toString("hex")}!`;
let guestId, bookingId;
async function call(path, body, cookie = "", origin = base) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json", Origin: origin } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await r.json();
  return {
    status: r.status,
    json,
    cookie: r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
async function messages() {
  const result = await (
    await fetch(mailpit + "/api/v1/messages?limit=100")
  ).json();
  return result.messages.filter((m) =>
    m.To?.some((to) => to.Address === email),
  );
}
async function until(fn, label) {
  for (let i = 0; i < 25; i++) {
    const result = await fn();
    if (result) return result;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Timed out: " + label);
}
try {
  assert.equal(
    (await call("/api/auth/sign-up", { email, password, role: "staff" }))
      .status,
    400,
  );
  assert.equal(
    (
      await call(
        "/api/auth/sign-up",
        { email, password },
        "",
        "https://untrusted.invalid",
      )
    ).status,
    403,
  );
  const signup = await call("/api/auth/sign-up", { email, password });
  assert.equal(signup.status, 200, JSON.stringify(signup.json));
  assert.equal(
    (await call("/api/auth/sign-in", { email, password })).status,
    401,
  );
  const users = await admin.auth.admin.listUsers();
  guestId = users.data.users.find((u) => u.email === email)?.id;
  assert.ok(guestId);
  const confirmation = await until(
    async () => (await messages()).find((m) => m.Subject.includes("Verify")),
    "verification email",
  );
  const content = await (
    await fetch(mailpit + "/api/v1/message/" + confirmation.ID)
  ).json();
  const code = (content.Text + content.HTML).match(/\b\d{6}\b/)?.[0];
  assert.ok(code, "Six-digit verification code in actual captured email");
  const wrong = code === "000000" ? "111111" : "000000";
  assert.equal(
    (await call("/api/auth/verify", { email, token: wrong })).status,
    400,
  );
  const verified = await call("/api/auth/verify", { email, token: code });
  assert.equal(verified.status, 200, JSON.stringify(verified.json));
  assert.ok(verified.cookie);
  const cookie = verified.cookie;
  assert.deepEqual(
    (
      await db.query("select role,is_gm from resort.profiles where id=$1", [
        guestId,
      ])
    ).rows[0],
    { role: "guest", is_gm: false },
  );
  assert.equal(
    (
      await call(
        "/api/staff/inventory",
        {
          roomType: "estate-room",
          night: "2026-11-20",
          ratePaise: 700000,
          allotment: 1,
          version: 1,
        },
        cookie,
      )
    ).status,
    403,
  );
  console.log(
    "PASS signup validation, email verification, unverified sign-in rejection and guest-only role",
  );
  const dates = (
    await db.query(
      "select ((clock_timestamp() at time zone 'Asia/Kolkata')::date+35)::text a,((clock_timestamp() at time zone 'Asia/Kolkata')::date+37)::text b",
    )
  ).rows[0];
  const nights = (
    await db.query(
      "select * from resort.availability($1,$2) where room_type='estate-room'",
      [dates.a, dates.b],
    )
  ).rows;
  const hold = await call(
    "/api/holds",
    {
      roomType: "estate-room",
      checkIn: dates.a,
      checkOut: dates.b,
      adults: 2,
      children: 0,
      guestName: "Synthetic Email Guest",
      idempotencyKey: randomUUID(),
      expectedTotal: nights.reduce((s, n) => s + n.rate_paise + n.tax_paise, 0),
      expectedVersions: nights.map((n) => n.version),
    },
    cookie,
  );
  assert.equal(hold.status, 201, JSON.stringify(hold.json));
  bookingId = hold.json.id;
  assert.equal(
    (await call(`/api/bookings/${bookingId}/email`, {}, cookie)).status,
    400,
  );
  const payment = { eventId: randomUUID(), outcome: "success" };
  assert.equal(
    (await call(`/api/bookings/${bookingId}/payment`, payment, cookie)).json
      .status,
    "confirmed",
  );
  const sent = await until(
    async () => (await messages()).find((m) => m.Subject.includes("booking")),
    "booking email",
  );
  const mail = await (
    await fetch(mailpit + "/api/v1/message/" + sent.ID)
  ).json();
  assert.ok(mail.Text.includes("Synthetic Email Guest"));
  assert.ok(mail.Text.includes("no amount is due"));
  assert.ok(mail.Text.includes(bookingId.toUpperCase()));
  writeFileSync(".local/booking-email-preview.html", mail.HTML, {
    mode: 0o600,
  });
  await until(
    async () =>
      (
        await db.query(
          "select status from resort.booking_emails where booking_id=$1",
          [bookingId],
        )
      ).rows[0]?.status === "sent",
    "sent status",
  );
  assert.equal(
    (await call(`/api/bookings/${bookingId}/payment`, payment, cookie)).json
      .status,
    "confirmed",
  );
  assert.equal(
    (
      await call(
        `/api/bookings/${bookingId}/email`,
        { recipient: "other@example.net" },
        cookie,
      )
    ).status,
    400,
  );
  await call(`/api/bookings/${bookingId}/email`, {}, cookie);
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(
    (await messages()).filter((m) => m.Subject.includes("booking")).length,
    1,
  );
  console.log(
    "PASS real SMTP capture, verified recipient, saved totals and no duplicate after payment/email retries",
  );
} finally {
  if (!guestId)
    guestId = (await admin.auth.admin.listUsers()).data.users.find(
      (u) => u.email === email,
    )?.id;
  if (bookingId) {
    await db.query("delete from resort.payment_events where booking_id=$1", [
      bookingId,
    ]);
    await db.query("delete from resort.booking_nights where booking_id=$1", [
      bookingId,
    ]);
    await db.query("delete from resort.bookings where id=$1", [bookingId]);
  }
  if (guestId) {
    await db.query("delete from resort.profiles where id=$1", [guestId]);
    await admin.auth.admin.deleteUser(guestId);
  }
  await db.end();
}
