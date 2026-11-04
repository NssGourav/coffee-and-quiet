import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";
const base = process.env.APP_ORIGIN ?? "http://127.0.0.1:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("HTTP checks only run against local synthetic setup.");
const { accounts, password } = JSON.parse(
  readFileSync(".local/reviewer-accounts.json", "utf8"),
);
const config = JSON.parse(readFileSync(".local/database.json", "utf8"));
const db = new pg.Client({ connectionString: config.ownerUrl });
await db.connect();
assert.equal(
  (await db.query("select current_database() name")).rows[0].name,
  "resort_dev",
);
const created = [];
async function call(path, body, cookie = "", origin = base) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json", Origin: origin } : {}),
      Cookie: cookie,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return {
    status: response.status,
    json,
    text,
    cookie: response.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
async function login(email) {
  const result = await call("/api/auth/sign-in", { email, password });
  assert.equal(result.status, 200, "Real Supabase password sign-in");
  assert.ok(result.cookie);
  return result.cookie;
}
try {
  const guestA = await login(accounts[0].email),
    guestB = await login(accounts[1].email),
    staff = await login(accounts[2].email);
  console.log(
    "PASS real Supabase sign-in for two guests and reservations staff",
  );
  const date = (
    await db.query(
      "select ((clock_timestamp() at time zone 'Asia/Kolkata')::date+20)::text date",
    )
  ).rows[0].date;
  const end = (await db.query("select ($1::date+2)::text date", [date])).rows[0]
    .date;
  const nights = (
    await db.query(
      "select * from resort.availability($1,$2) where room_type='estate-room'",
      [date, end],
    )
  ).rows;
  const total = nights.reduce((s, n) => s + n.rate_paise + n.tax_paise, 0);
  const input = {
    checkIn: date,
    checkOut: end,
    roomType: "estate-room",
    adults: 2,
    children: 0,
    guestName: "Synthetic HTTP Test",
    idempotencyKey: randomUUID(),
    expectedTotal: total,
    expectedVersions: nights.map((night) => night.version),
  };
  assert.equal((await call("/api/holds", input)).status, 401);
  assert.equal(
    (await call("/api/holds", input, guestA, "https://untrusted.invalid"))
      .status,
    403,
  );
  assert.equal(
    (await call("/api/holds", { ...input, checkOut: date }, guestA)).status,
    400,
  );
  console.log(
    "PASS anonymous, cross-origin and invalid-date hold requests are rejected",
  );
  const first = await call("/api/holds", input, guestA);
  assert.equal(first.status, 201, JSON.stringify(first.json));
  const id = first.json.id;
  created.push(id);
  assert.equal((await call("/api/holds", input, guestA)).json.id, id);
  assert.equal((await call(`/api/bookings/${id}`, null, guestB)).status, 404);
  assert.equal(
    (
      await call(
        `/api/bookings/${id}/payment`,
        { outcome: "success", eventId: randomUUID() },
        guestB,
      )
    ).status,
    403,
  );
  assert.equal((await call(`/api/bookings/${id}`, null, staff)).status, 200);
  console.log(
    "PASS create-hold idempotency, cross-guest read/payment isolation, staff read",
  );
  const event = { outcome: "success", eventId: randomUUID() };
  assert.equal(
    (await call(`/api/bookings/${id}/payment`, event, guestA)).json.status,
    "confirmed",
  );
  assert.equal(
    (await call(`/api/bookings/${id}/payment`, event, guestA)).json.status,
    "confirmed",
  );
  const saved = (await call(`/api/bookings/${id}`, null, guestA)).json;
  assert.equal(saved.status, "confirmed");
  assert.equal(saved.total_paise, total);
  assert.equal(saved.nights.length, 2);
  assert.equal((await call(`/bookings/${id}`, null, guestA)).status, 200);
  console.log(
    "PASS simulated payment, duplicate event, persisted nightly snapshot and confirmation page",
  );
  const row = (
    await db.query(
      "select * from resort.inventory where room_type='estate-room' and night=$1",
      [date],
    )
  ).rows[0];
  const edit = {
    roomType: row.room_type,
    night: date,
    ratePaise: row.rate_paise,
    allotment: row.allotment,
    version: row.version,
  };
  assert.equal((await call("/api/staff/inventory", edit, guestA)).status, 403);
  assert.equal((await call("/api/staff/inventory", edit, staff)).status, 200);
  assert.equal((await call("/api/staff/inventory", edit, staff)).status, 409);
  console.log(
    "PASS server-side staff permission, permitted save and stale version conflict",
  );
  input.expectedVersions[0] = row.version + 1;
  const late = await call(
    "/api/holds",
    { ...input, idempotencyKey: randomUUID() },
    guestA,
  );
  assert.equal(late.status, 201);
  created.push(late.json.id);
  await db.query(
    "update resort.bookings set expires_at=clock_timestamp()-interval '1 second' where id=$1",
    [late.json.id],
  );
  assert.equal(
    (
      await call(
        `/api/bookings/${late.json.id}/payment`,
        { outcome: "success", eventId: randomUUID() },
        guestA,
      )
    ).json.status,
    "expired",
  );
  console.log(
    "PASS late simulated success is recorded as expired through the real server endpoint",
  );
  const failed = await call(
    "/api/holds",
    { ...input, idempotencyKey: randomUUID() },
    guestA,
  );
  assert.equal(failed.status, 201);
  created.push(failed.json.id);
  assert.equal(
    (
      await call(
        `/api/bookings/${failed.json.id}/payment`,
        { outcome: "failure", eventId: randomUUID() },
        guestA,
      )
    ).json.status,
    "failed",
  );
  console.log(
    "PASS simulated payment failure through the real server endpoint",
  );
} finally {
  if (created.length) {
    await db.query(
      "delete from resort.payment_events where booking_id=any($1::uuid[])",
      [created],
    );
    await db.query(
      "delete from resort.booking_nights where booking_id=any($1::uuid[])",
      [created],
    );
    await db.query("delete from resort.bookings where id=any($1::uuid[])", [
      created,
    ]);
  }
  await db.end();
}
