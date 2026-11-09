import { test } from "node:test";
import assert from "node:assert/strict";
import {
  signupSchema,
  verificationSchema,
  safeReturnPath,
} from "../../src/lib/registration";
import {
  bookingEmail,
  isDemoEmail,
} from "../../src/lib/booking-email-template";
import type { Booking } from "../../src/lib/domain";

test("signup rejects role injection, short passwords and malformed verification codes", () => {
  const signup = {
    email: "guest@resort.example",
    password: "Synthetic-password-123",
  };
  assert.equal(signupSchema.safeParse(signup).success, true);
  for (const extra of [
    { role: "staff" },
    { is_gm: true },
    { password: "short" },
  ])
    assert.equal(
      signupSchema.safeParse({ ...signup, ...extra }).success,
      false,
    );
  for (const token of ["12345", "1234567", "abcdef", "123 45"])
    assert.equal(
      verificationSchema.safeParse({ email: signup.email, token }).success,
      false,
    );
  assert.equal(
    verificationSchema.safeParse({ email: signup.email, token: "123456" })
      .success,
    true,
  );
});
test("auth return links cannot redirect outside the application", () => {
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\nevil.example",
    "javascript:alert(1)",
  ])
    assert.equal(safeReturnPath(path), "/");
  assert.equal(
    safeReturnPath("/checkout?room=estate-room"),
    "/checkout?room=estate-room",
  );
});
const booking: Booking = {
  id: "1054d392-8585-4ba6-a147-0c18d6d609ca",
  guest_id: "guest",
  room_type: "estate-room",
  check_in: "2026-11-19",
  check_out: "2026-11-21",
  adults: 2,
  children: 0,
  guest_name: '<img src=x onerror="alert(1)">',
  status: "confirmed",
  expires_at: "",
  total_paise: 1470000,
  rate_plan: "Room only",
  policy_snapshot: "",
  created_at: "",
  confirmed_at: "",
  room_name: "Estate Room",
  nights: ["2026-11-19", "2026-11-20"].map((night) => ({
    night,
    base_paise: 700000,
    tax_paise: 35000,
    gst_bps: 500,
  })),
};
test("booking email escapes guest input and uses accepted totals with explicit simulated payment", () => {
  const mail = bookingEmail(booking, "https://coffee-and-quiet.vercel.app");
  assert.ok(!mail.html.includes("<img"));
  assert.ok(mail.html.includes("&lt;img"));
  for (const expected of [
    "₹14,000",
    "₹700",
    "₹14,700",
    "Amount charged: ₹0",
    "no amount is due",
    "2 nights",
    "Room only",
  ])
    assert.ok(mail.text.includes(expected), expected);
  assert.ok(mail.html.includes(`/bookings/${booking.id}`));
  assert.ok(!mail.text.includes("breakfast"));
});
test("unconfirmed or inconsistent booking totals cannot generate a confirmation", () => {
  assert.throws(
    () => bookingEmail({ ...booking, status: "held" }, "https://example.org"),
    /confirmed/,
  );
  assert.throws(
    () => bookingEmail({ ...booking, total_paise: 1 }, "https://example.org"),
    /totals/,
  );
  assert.throws(() => bookingEmail(booking, "javascript:alert(1)"), /origin/);
});
test("synthetic demo addresses never receive external mail", () => {
  for (const email of [
    "guest.a@resort.example",
    "a@example.com",
    "a@unit.test",
    "a@localhost",
    "a@invalid",
  ])
    assert.equal(isDemoEmail(email), true);
  assert.equal(isDemoEmail("guest@gmail.com"), false);
});
