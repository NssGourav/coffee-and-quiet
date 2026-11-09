import { z } from "zod";
const maxStayNights = 14;
export const maxAdvanceDays = 365;

export function checkOutRange(checkIn: string) {
  return { first: addDays(checkIn, 1), last: addDays(checkIn, maxStayNights) };
}

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Choose a valid calendar date");
export function nightsBetween(checkIn: string, checkOut: string): string[] {
  dateString.parse(checkIn);
  dateString.parse(checkOut);
  const start = Date.parse(`${checkIn}T00:00:00Z`),
    end = Date.parse(`${checkOut}T00:00:00Z`);
  const count = (end - start) / 86400000;
  if (count < 1 || count > maxStayNights)
    throw new Error("Choose a stay of 1–14 nights");
  return Array.from({ length: count }, (_, i) =>
    new Date(start + i * 86400000).toISOString().slice(0, 10),
  );
}
export const searchSchema = z
  .object({
    checkIn: dateString,
    checkOut: dateString,
    adults: z.coerce.number().int().min(1).max(4),
    children: z.coerce.number().int().min(0).max(3),
  })
  .superRefine((s, c) => {
    if (!dateString.safeParse(s.checkIn).success) return;

    const today = indiaToday();
    const lastCheckIn = addDays(today, maxAdvanceDays);
    if (s.checkIn < today || s.checkIn > lastCheckIn) {
      c.addIssue({
        code: "custom",
        message: `Choose a check-in date from ${formatDate(today)} to ${formatDate(lastCheckIn)}.`,
        path: ["checkIn"],
      });
      return;
    }
    if (!dateString.safeParse(s.checkOut).success) return;

    const { first: firstCheckOut, last: lastCheckOut } = checkOutRange(
      s.checkIn,
    );
    if (s.checkOut < firstCheckOut || s.checkOut > lastCheckOut) {
      c.addIssue({
        code: "custom",
        message: `Choose a check-out date from ${formatDate(firstCheckOut)} to ${formatDate(lastCheckOut)}.`,
        path: ["checkOut"],
      });
    }
  });
export const holdSchema = searchSchema.safeExtend({
  roomType: z.enum(["estate-room", "terrace-room", "garden-villa"]),
  guestName: z.string().trim().min(1).max(80),
  idempotencyKey: z.uuid(),
  expectedTotal: z.number().int().positive().max(200000000),
  expectedVersions: z.array(z.number().int().positive()).min(1).max(14),
});
export const paymentSchema = z.object({
  eventId: z.uuid(),
  outcome: z.enum(["success", "failure"]),
});
export const inventorySchema = z.object({
  roomType: z.enum(["estate-room", "terrace-room", "garden-villa"]),
  night: dateString,
  allotment: z.number().int().min(0).max(76),
  ratePaise: z.number().int().min(100).max(10000000),
  version: z.number().int().positive(),
});
export function taxForNight(basePaise: number) {
  if (
    !Number.isSafeInteger(basePaise) ||
    basePaise < 100 ||
    basePaise > 10000000
  )
    throw new Error("Invalid nightly price");
  const bps = basePaise <= 750000 ? 500 : 1800;
  return { bps, taxPaise: Math.floor((basePaise * bps + 5000) / 10000) };
}
export function effectiveStatus(
  status: string,
  expiresAt: string | Date,
  now = new Date(),
) {
  return status === "held" && new Date(expiresAt).getTime() <= now.getTime()
    ? "expired"
    : status;
}
export function rupees(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}
export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
export function indiaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export type SearchInput = z.infer<typeof searchSchema>;
export type Night = {
  night: string;
  available: number;
  rate_paise: number;
  gst_bps: number;
  tax_paise: number;
  version: number;
};
export type Stay = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  physical_keys: number;
  image_path: string;
  nights: Night[];
  available: number;
  total: number;
  subtotal: number;
  tax: number;
};
export type Booking = {
  id: string;
  guest_id: string;
  room_type: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  guest_name: string;
  status: string;
  expires_at: string;
  total_paise: number;
  rate_plan: string;
  policy_snapshot: string;
  created_at: string;
  confirmed_at: string | null;
  room_name: string;
  nights: {
    night: string;
    base_paise: number;
    gst_bps: number;
    tax_paise: number;
  }[];
};
