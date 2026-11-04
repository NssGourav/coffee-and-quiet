import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nightsBetween,
  taxForNight,
  effectiveStatus,
  holdSchema,
  searchSchema,
  indiaToday,
  addDays,
} from "../../src/lib/domain";
test("search rejects past dates and check-in beyond one year", () => {
  const today = indiaToday();
  for (const checkIn of [addDays(today, -1), addDays(today, 366)]) {
    assert.equal(
      searchSchema.safeParse({
        checkIn,
        checkOut: addDays(checkIn, 1),
        adults: 2,
        children: 0,
      }).success,
      false,
    );
  }
  assert.equal(
    searchSchema.safeParse({
      checkIn: today,
      checkOut: addDays(today, 1),
      adults: 2,
      children: 0,
    }).success,
    true,
  );
});
test("checkout is exclusive and month/year/leap boundaries are calendar dates", () => {
  assert.deepEqual(nightsBetween("2026-11-14", "2026-11-16"), [
    "2026-11-14",
    "2026-11-15",
  ]);
  assert.deepEqual(nightsBetween("2026-12-31", "2027-01-02"), [
    "2026-12-31",
    "2027-01-01",
  ]);
  assert.deepEqual(nightsBetween("2028-02-28", "2028-03-01"), [
    "2028-02-28",
    "2028-02-29",
  ]);
});
test("invalid dates, reversed dates and excessive stays are rejected", () => {
  for (const [a, b] of [
    ["2026-02-29", "2026-03-01"],
    ["2026-11-14", "2026-11-14"],
    ["2026-11-16", "2026-11-14"],
    ["2026-11-01", "2026-11-16"],
  ])
    assert.throws(() => nightsBetween(a, b));
});
test("per-unit per-night tariff boundary is exact, with integer paise rounding", () => {
  assert.deepEqual(taxForNight(750000), { bps: 500, taxPaise: 37500 });
  assert.deepEqual(taxForNight(750001), { bps: 1800, taxPaise: 135000 });
  assert.deepEqual(taxForNight(700010), { bps: 500, taxPaise: 35001 });
  assert.throws(() => taxForNight(0.1));
});
test("expiry applies at the exact deadline; confirmed stays remain confirmed", () => {
  const expiry = "2026-11-04T09:10:00Z";
  assert.equal(effectiveStatus("held", expiry, new Date(expiry)), "expired");
  assert.equal(
    effectiveStatus("held", expiry, new Date("2026-11-04T09:09:59.999Z")),
    "held",
  );
  assert.equal(
    effectiveStatus("confirmed", expiry, new Date("2026-11-05")),
    "confirmed",
  );
});
test("request validation rejects invalid capacity inputs and idempotency keys", () => {
  assert.equal(
    holdSchema.safeParse({
      roomType: "garden-villa",
      checkIn: "2026-11-14",
      checkOut: "2026-11-16",
      adults: 2,
      children: -1,
      guestName: "Synthetic Guest",
      idempotencyKey: "not-uuid",
      expectedTotal: 100,
    }).success,
    false,
  );
});
