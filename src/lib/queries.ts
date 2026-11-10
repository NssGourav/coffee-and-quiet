import "server-only";
import { cache } from "react";
import { withDb } from "./db";
import {
  nightsBetween,
  type SearchInput,
  type Stay,
  type Night,
  type Booking,
} from "./domain";
export async function findStays(search: SearchInput): Promise<Stay[]> {
  const expected = nightsBetween(search.checkIn, search.checkOut).length;
  return withDb(null, async (db) => {
    const rooms = await db.query(
      "select * from resort.room_types where capacity >= $1 order by physical_keys desc",
      [search.adults + search.children],
    );
    const availability = await db.query(
      "select * from resort.availability($1,$2)",
      [search.checkIn, search.checkOut],
    );
    return rooms.rows.map((room) => {
      const nights: Night[] = availability.rows.filter(
        (n) => n.room_type === room.id,
      );
      return {
        ...room,
        nights,
        available:
          nights.length === expected
            ? Math.min(...nights.map((n) => n.available))
            : 0,
        subtotal: nights.reduce((s, n) => s + n.rate_paise, 0),
        tax: nights.reduce((s, n) => s + n.tax_paise, 0),
        total: nights.reduce((s, n) => s + n.rate_paise + n.tax_paise, 0),
      };
    });
  });
}
// Request-scoped only: the header and protected page share one role lookup.
export const profile = cache(async (userId: string) => {
  return withDb(
    userId,
    async (db) =>
      (await db.query("select * from resort.profiles where id=$1", [userId]))
        .rows[0] ?? null,
  );
});
export async function getBooking(
  userId: string,
  id: string,
): Promise<Booking | null> {
  return withDb(userId, async (db) => {
    const result = await db.query(
      "select b.*,r.name as room_name from resort.bookings b join resort.room_types r on r.id=b.room_type where b.id=$1",
      [id],
    );
    if (!result.rowCount) return null;
    const nights = await db.query(
      "select * from resort.booking_nights where booking_id=$1 order by night",
      [id],
    );
    return JSON.parse(
      JSON.stringify({ ...result.rows[0], nights: nights.rows }),
    );
  });
}
