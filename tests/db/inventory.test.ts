import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { addDays, indiaToday } from "../../src/lib/domain";
const config = JSON.parse(readFileSync(".local/database.json", "utf8"));
const owner = new pg.Pool({ connectionString: config.testUrl, max: 20 });
const app = new pg.Pool({
  connectionString: config.testUrl.replace(
    /resort_owner:[^@]+@/,
    `resort_app:${config.appPassword}@`,
  ),
  max: 20,
});
const guestA = randomUUID(),
  guestB = randomUUID(),
  staff = randomUUID();
const a = addDays(indiaToday(), 10),
  b = addDays(a, 1),
  c = addDays(a, 2),
  d = addDays(a, 3);
async function actor<T>(id: string, fn: (db: pg.PoolClient) => Promise<T>) {
  const db = await app.connect();
  try {
    await db.query("begin isolation level read committed");
    await db.query("select set_config('app.user_id',$1,true)", [id]);
    const r = await fn(db);
    await db.query("commit");
    return r;
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    db.release();
  }
}
async function hold(
  id: string = guestA,
  start = a,
  end = c,
  key = randomUUID(),
  total = 1470000,
  versions = Array((Date.parse(end) - Date.parse(start)) / 86400000).fill(1),
) {
  return actor(
    id,
    async (db) =>
      (
        await db.query(
          "select resort.create_hold($1,$2,$3,2,0,$4,$5,$6,$7) id",
          ["estate-room", start, end, "Synthetic Guest", key, total, versions],
        )
      ).rows[0].id as string,
  );
}
async function pay(
  id: string,
  outcome = "success",
  event = randomUUID(),
  guest = guestA,
) {
  return actor(
    guest,
    async (db) =>
      (
        await db.query("select resort.simulate_payment($1,$2,$3) status", [
          id,
          event,
          outcome,
        ])
      ).rows[0].status,
  );
}
async function availability() {
  return actor(
    "",
    async (db) =>
      (
        await db.query(
          "select * from resort.availability($1,$2) where room_type='estate-room'",
          [a, d],
        )
      ).rows,
  );
}
before(async () => {
  const actual = (await owner.query("select current_database() name")).rows[0]
    .name;
  assert.equal(
    actual,
    "resort_test",
    "Refuse destructive tests against any other database",
  );
  await owner.query(readFileSync("db/seed.sql", "utf8"));
});
beforeEach(async () => {
  await owner.query(
    "truncate resort.payment_events,resort.booking_nights,resort.bookings,resort.inventory_audit,resort.profiles restart identity cascade",
  );
  await owner.query(
    "insert into resort.profiles(id,display_name,role) values($1,'Guest A','guest'),($2,'Guest B','guest'),($3,'Staff','staff')",
    [guestA, guestB, staff],
  );
  await owner.query(
    "update resort.inventory set allotment=1,rate_paise=700000,version=1 where room_type='estate-room'",
  );
});
after(async () => {
  await app.end();
  await owner.end();
});
test("12 competing clients for the last unit produce exactly one hold", async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, (_, i) => hold(i % 2 ? guestA : guestB)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  for (const result of results) {
    if (result.status === "rejected")
      assert.match(result.reason.message, /sold out/);
  }
  assert.equal(
    (await owner.query("select count(*)::int n from resort.bookings")).rows[0]
      .n,
    1,
  );
  assert.deepEqual(
    (await availability()).map((x) => x.available),
    [0, 0, 1],
  );
});
test("partial stay unavailable rolls back all nights", async () => {
  await owner.query(
    "update resort.inventory set allotment=0 where room_type='estate-room' and night=$1",
    [b],
  );
  await assert.rejects(hold(), /sold out/);
  assert.equal(
    (await owner.query("select count(*)::int n from resort.bookings")).rows[0]
      .n,
    0,
  );
  assert.equal((await availability())[0].available, 1);
});
test("missing rate night rejects entire hold", async () => {
  await owner.query(
    "delete from resort.inventory where room_type='estate-room' and night=$1",
    [b],
  );
  try {
    await assert.rejects(hold(), /not open/);
  } finally {
    await owner.query(
      "insert into resort.inventory(room_type,night,allotment,rate_paise) values('estate-room',$1,1,700000)",
      [b],
    );
  }
});
test("overlapping ranges conflict but checkout boundary stays can coexist", async () => {
  await hold(guestA, a, c);
  await assert.rejects(hold(guestB, b, d), /sold out/);
  await hold(guestB, c, d, randomUUID(), 735000);
  assert.equal(
    (await owner.query("select count(*)::int n from resort.bookings")).rows[0]
      .n,
    2,
  );
});
test("concurrent identical request keys create one booking and replay it", async () => {
  const key = randomUUID();
  const ids = await Promise.all(
    Array.from({ length: 8 }, () => hold(guestA, a, c, key)),
  );
  assert.equal(new Set(ids).size, 1);
  await assert.rejects(hold(guestA, a, b, key, 735000), /different details/);
});
test("different concurrently overlapping ranges protect the shared night", async () => {
  const outcomes = await Promise.allSettled([
    hold(guestA, a, c),
    hold(guestB, b, d),
  ]);
  assert.equal(
    outcomes.filter((result) => result.status === "fulfilled").length,
    1,
  );
  for (const result of outcomes)
    if (result.status === "rejected")
      assert.match(result.reason.message, /sold out/);
  assert.equal((await availability())[1].available, 0);
});
test("database GST calculation covers the exact tariff boundary and paise rounding", async () => {
  const { rows } = await owner.query(
    "select rate, resort.gst_bps(rate) bps, resort.tax_paise(rate) tax from unnest(array[750000,750001,700010]) rate",
  );
  assert.deepEqual(rows, [
    { rate: 750000, bps: 500, tax: 37500 },
    { rate: 750001, bps: 1800, tax: 135000 },
    { rate: 700010, bps: 500, tax: 35001 },
  ]);
});
test("duplicate payment events confirm once; stale failure cannot undo confirmation", async () => {
  const id = await hold(),
    event = randomUUID();
  assert.deepEqual(
    await Promise.all([pay(id, "success", event), pay(id, "success", event)]),
    ["confirmed", "confirmed"],
  );
  assert.equal(await pay(id, "failure"), "confirmed");
  assert.equal(
    (
      await owner.query(
        "select count(*)::int n from resort.payment_events where event_id=$1",
        [event],
      )
    ).rows[0].n,
    1,
  );
  await assert.rejects(pay(id, "failure", event), /conflict/);
});
test("failed payment frees stock and cannot be resurrected by late success", async () => {
  const id = await hold();
  assert.equal(await pay(id, "failure"), "failed");
  await hold(guestB);
  assert.equal(await pay(id), "failed");
});
test("expiry releases stock without cleanup; late success stays expired", async () => {
  const id = await hold();
  await owner.query(
    "update resort.bookings set expires_at=clock_timestamp()-interval '1 second' where id=$1",
    [id],
  );
  assert.equal((await availability())[0].available, 1);
  await hold(guestB);
  assert.equal(await pay(id), "expired");
});
test("payment rechecks the clock AFTER waiting for inventory locks", async () => {
  const id = await hold();
  const blocker = await owner.connect();
  await blocker.query("begin");
  await blocker.query(
    "select 1 from resort.inventory where room_type='estate-room' and night=$1 for update",
    [a],
  );
  await owner.query(
    "update resort.bookings set expires_at=clock_timestamp()+interval '300 milliseconds' where id=$1",
    [id],
  );
  const payment = pay(id);
  await new Promise((resolve) => setTimeout(resolve, 450));
  await blocker.query("commit");
  blocker.release();
  assert.equal(await payment, "expired");
});
test("allotment cannot be reduced below live or confirmed commitments", async () => {
  const id = await hold();
  const reduce = () =>
    actor(staff, (db) =>
      db.query("select resort.update_inventory($1,$2,0,700000,1)", [
        "estate-room",
        a,
      ]),
    );
  await assert.rejects(reduce(), /lower than/);
  await pay(id);
  await assert.rejects(reduce(), /lower than/);
});
test("concurrent allotment reduction and hold cannot both consume the last unit", async () => {
  const r = await Promise.allSettled([
    hold(),
    actor(staff, (db) =>
      db.query("select resort.update_inventory($1,$2,0,700000,1)", [
        "estate-room",
        a,
      ]),
    ),
  ]);
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
});
test("rate changes need fresh guest consent and do not alter accepted snapshots", async () => {
  const id = await hold();
  await actor(staff, (db) =>
    db.query("select resort.update_inventory($1,$2,2,900000,1)", [
      "estate-room",
      a,
    ]),
  );
  assert.equal(
    (
      await owner.query("select total_paise from resort.bookings where id=$1", [
        id,
      ])
    ).rows[0].total_paise,
    1470000,
  );
  await assert.rejects(hold(guestB), /sold out/);
  await actor(staff, (db) =>
    db.query("select resort.update_inventory($1,$2,2,700000,1)", [
      "estate-room",
      b,
    ]),
  );
  await assert.rejects(hold(guestB), /price changed/);
});
test("offsetting nightly price changes still require fresh guest consent", async () => {
  await actor(staff, (db) =>
    db.query("select resort.update_inventory($1,$2,1,710000,1)", [
      "estate-room",
      a,
    ]),
  );
  await actor(staff, (db) =>
    db.query("select resort.update_inventory($1,$2,1,690000,1)", [
      "estate-room",
      b,
    ]),
  );
  // The sum remains 1,470,000 paise, but neither accepted nightly line matches.
  await assert.rejects(hold(), /nightly breakdown/);
  const id = await hold(guestA, a, c, randomUUID(), 1470000, [2, 2]);
  const { rows } = await owner.query(
    "select base_paise, rate_version from resort.booking_nights where booking_id=$1 order by night",
    [id],
  );
  assert.deepEqual(rows, [
    { base_paise: 710000, rate_version: 2 },
    { base_paise: 690000, rate_version: 2 },
  ]);
});
test("stale staff version is rejected and successful writes are audited", async () => {
  await actor(staff, (db) =>
    db.query("select resort.update_inventory($1,$2,2,750000,1)", [
      "estate-room",
      a,
    ]),
  );
  await assert.rejects(
    actor(staff, (db) =>
      db.query("select resort.update_inventory($1,$2,3,750000,1)", [
        "estate-room",
        a,
      ]),
    ),
    /Another staff/,
  );
  assert.equal(
    (await owner.query("select count(*)::int n from resort.inventory_audit"))
      .rows[0].n,
    1,
  );
});
test("RLS blocks another guest, and application role has no direct mutation grants", async () => {
  const id = await hold();
  assert.equal(
    await actor(
      guestB,
      async (db) =>
        (await db.query("select * from resort.bookings where id=$1", [id]))
          .rowCount,
    ),
    0,
  );
  assert.equal(
    await actor(
      guestB,
      async (db) =>
        (
          await db.query(
            "select * from resort.booking_nights where booking_id=$1",
            [id],
          )
        ).rowCount,
    ),
    0,
  );
  assert.equal(
    await actor(
      staff,
      async (db) =>
        (await db.query("select * from resort.bookings where id=$1", [id]))
          .rowCount,
    ),
    1,
  );
  await assert.rejects(
    pay(id, "success", randomUUID(), guestB),
    /Booking not found/,
  );
  await assert.rejects(
    actor(guestA, (db) =>
      db.query("select resort.update_inventory($1,$2,2,700000,1)", [
        "estate-room",
        a,
      ]),
    ),
    /Staff access/,
  );
  await assert.rejects(
    actor(guestA, (db) =>
      db.query("update resort.bookings set status='confirmed' where id=$1", [
        id,
      ]),
    ),
    /permission denied/,
  );
});
test("unauthenticated holds and forged capacity are rejected by PostgreSQL itself", async () => {
  await assert.rejects(hold(""), /Sign in/);
  await assert.rejects(
    actor(guestA, (db) =>
      db.query("select resort.create_hold($1,$2,$3,9,0,$4,$5,$6,$7)", [
        "estate-room",
        a,
        c,
        "Synthetic Guest",
        randomUUID(),
        1470000,
        [1, 1],
      ]),
    ),
    /capacity/,
  );
});

test("email jobs require confirmed ownership and replay without changing the recipient", async () => {
  const id = await hold();
  const queue = (user = guestA, email = "first@resort.example") =>
    actor(user, (db) =>
      db.query("select resort.queue_booking_email($1,$2)", [id, email]),
    );
  await assert.rejects(queue(), /confirmed/);
  await pay(id);
  await assert.rejects(queue(guestB), /Booking not found/);
  await queue();
  await queue(guestA, "second@resort.example");
  const rows = (
    await owner.query(
      "select recipient,status from resort.booking_emails where booking_id=$1",
      [id],
    )
  ).rows;
  assert.deepEqual(rows, [
    { recipient: "first@resort.example", status: "pending" },
  ]);
  assert.equal(
    await actor(
      guestB,
      async (db) =>
        (
          await db.query(
            "select * from resort.booking_emails where booking_id=$1",
            [id],
          )
        ).rowCount,
    ),
    0,
  );
  await assert.rejects(
    actor(guestA, (db) =>
      db.query(
        "update resort.booking_emails set status='sent' where booking_id=$1",
        [id],
      ),
    ),
    /permission denied/,
  );
});

test("concurrent email dispatch claims once and stale attempt completion is rejected", async () => {
  const id = await hold();
  await pay(id);
  await actor(guestA, (db) =>
    db.query("select resort.queue_booking_email($1,$2)", [
      id,
      "guest@resort.example",
    ]),
  );
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      actor(
        guestA,
        async (db) =>
          (await db.query("select * from resort.claim_booking_email($1)", [id]))
            .rows,
      ),
    ),
  );
  assert.equal(results.flat().length, 1);
  const attempt = results.flat()[0].attempt_id;
  await assert.rejects(
    actor(guestB, (db) =>
      db.query("select resort.claim_booking_email($1)", [id]),
    ),
    /Booking not found/,
  );
  await assert.rejects(
    actor(guestA, (db) =>
      db.query("select resort.finish_booking_email($1,$2,'sent')", [
        id,
        randomUUID(),
      ]),
    ),
    /no longer current/,
  );
  await actor(guestA, (db) =>
    db.query("select resort.finish_booking_email($1,$2,'sent')", [id, attempt]),
  );
  assert.equal(
    await actor(
      guestA,
      async (db) =>
        (await db.query("select * from resort.claim_booking_email($1)", [id]))
          .rowCount,
    ),
    0,
  );
});

test("email failure retries respect cooldown and the three-attempt limit", async () => {
  const id = await hold();
  await pay(id);
  await actor(guestA, (db) =>
    db.query("select resort.queue_booking_email($1,$2)", [
      id,
      "guest@resort.example",
    ]),
  );
  for (let i = 0; i < 3; i++) {
    const job = await actor(
      guestA,
      async (db) =>
        (await db.query("select * from resort.claim_booking_email($1)", [id]))
          .rows[0],
    );
    assert.ok(job);
    await actor(guestA, (db) =>
      db.query("select resort.finish_booking_email($1,$2,'failed')", [
        id,
        job.attempt_id,
      ]),
    );
    assert.equal(
      await actor(
        guestA,
        async (db) =>
          (await db.query("select * from resort.claim_booking_email($1)", [id]))
            .rowCount,
      ),
      0,
    );
    await owner.query(
      "update resort.booking_emails set last_attempt_at=clock_timestamp()-interval '61 seconds' where booking_id=$1",
      [id],
    );
  }
  assert.equal(
    await actor(
      guestA,
      async (db) =>
        (await db.query("select * from resort.claim_booking_email($1)", [id]))
          .rowCount,
    ),
    0,
  );
});

test("demo mail is skipped and self-registration cannot grant staff privileges", async () => {
  const id = await hold();
  await pay(id);
  await actor(guestA, (db) =>
    db.query("select resort.queue_booking_email($1,$2,true)", [
      id,
      "guest@resort.example",
    ]),
  );
  assert.equal(
    await actor(
      guestA,
      async (db) =>
        (await db.query("select * from resort.claim_booking_email($1)", [id]))
          .rowCount,
    ),
    0,
  );
  const fresh = randomUUID();
  await actor(fresh, (db) => db.query("select resort.ensure_guest('Staff')"));
  assert.deepEqual(
    (
      await owner.query("select role,is_gm from resort.profiles where id=$1", [
        fresh,
      ])
    ).rows[0],
    { role: "guest", is_gm: false },
  );
});
