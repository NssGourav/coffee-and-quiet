import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pg from "pg";
const base = "http://127.0.0.1:3000";
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
async function call(path, data, cookie = "") {
  const r = await fetch(base + path, {
    method: data ? "POST" : "GET",
    headers: { "content-type": "application/json", origin: base, cookie },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  let json;
  try {
    json = await r.json();
  } catch {}
  return {
    status: r.status,
    json,
    cookie: r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
async function login(i) {
  const r = await call("/api/auth/sign-in", {
    email: accounts[i].email,
    password,
  });
  assert.equal(r.status, 200);
  return r.cookie;
}
const created = [];
try {
  const guest = await login(0),
    staff = await login(2),
    gm = await login(3);
  assert.equal(
    (
      await call("/api/enquiries", {
        message: "Synthetic enquiry test",
        complaint: false,
      })
    ).status,
    401,
  );
  const r = await call(
    "/api/enquiries",
    { message: "Synthetic complaint: the room was dirty.", complaint: true },
    guest,
  );
  assert.equal(r.status, 200);
  const id = r.json.id;
  created.push(id);
  const read = async () =>
    (await db.query("select * from resort.enquiries where id=$1", [id]))
      .rows[0];
  assert.equal((await read()).gm_alert, true);
  assert.equal(
    (
      await call(
        `/api/staff/enquiries/${id}`,
        {
          action: "save",
          version: 1,
          message: "Changed message",
          category: "room",
        },
        guest,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        `/api/staff/enquiries/${id}`,
        {
          action: "save",
          version: 1,
          message: "Staff correction for synthetic test",
          category: "room",
          complaint: false,
        },
        staff,
      )
    ).status,
    200,
  );
  assert.equal((await read()).category, "complaint");
  assert.equal((await read()).gm_alert, true);
  assert.equal(
    (
      await call(
        `/api/staff/enquiries/${id}`,
        {
          action: "send",
          version: 1,
          draft: "Stale text should never be sent",
        },
        staff,
      )
    ).status,
    409,
  );
  assert.equal((await call("/staff/enquiries?lane=gm", null, gm)).status, 200);
  assert.equal(
    (
      await call(
        `/api/staff/enquiries/${id}`,
        {
          action: "send",
          version: 2,
          draft: "Staff reviewed this synthetic complaint and will follow up.",
        },
        staff,
      )
    ).status,
    200,
  );
  assert.equal((await read()).status, "sent");
  assert.equal(
    (
      await call(
        `/api/staff/enquiries/${id}`,
        {
          action: "send",
          version: 3,
          draft: "Duplicate send should be rejected.",
        },
        staff,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from resort.enquiry_audit where enquiry_id=$1 and action='send'",
        [id],
      )
    ).rows[0].n,
    1,
  );
  console.log(
    "PASS enquiry persistence, anonymous/guest restrictions, durable GM alert, manual routing, stale-result rejection, immutable send and audit",
  );
  const dates = (
    await db.query(
      "select ((now() at time zone 'Asia/Kolkata')::date+30)::text a,((now() at time zone 'Asia/Kolkata')::date+32)::text b",
    )
  ).rows[0];
  const quote = {
    roomType: "estate-room",
    checkIn: dates.a,
    checkOut: dates.b,
    adults: 2,
    children: 0,
  };
  assert.equal((await call("/api/staff/quote", quote, guest)).status, 403);
  const q = await call("/api/staff/quote", quote, staff);
  assert.equal(q.status, 200);
  assert.match(q.json.text, /Total including GST/);
  assert.match(q.json.text, /not a reservation/);
  console.log(
    "PASS staff-only authoritative rate quote with tax and availability disclaimer",
  );
} finally {
  for (const id of created) {
    await db.query("delete from resort.enquiry_audit where enquiry_id=$1", [
      id,
    ]);
    await db.query("delete from resort.enquiries where id=$1", [id]);
  }
  await db.end();
}
