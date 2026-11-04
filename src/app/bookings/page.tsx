import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import { profile } from "@/lib/queries";
import { withDb } from "@/lib/db";
import { effectiveStatus, formatDate, rupees } from "@/lib/domain";
import { StaffNav } from "@/components/ui";
export default async function Bookings() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/bookings");
  const staff = (await profile(user.id))?.role === "staff";
  const bookings = await withDb(
    user.id,
    async (db) =>
      (
        await db.query(
          "select b.*,r.name as room_name from resort.bookings b join resort.room_types r on r.id=b.room_type order by b.created_at desc limit 100",
        )
      ).rows,
  );
  return (
    <div className="wrap page">
      {staff && <StaffNav />}
      <p className="eyebrow">{staff ? "RESERVATIONS" : "YOUR TIME AWAY"}</p>
      <h1>{staff ? "Bookings" : "Your bookings"}</h1>
      <p className="muted">
        Most recent 100 bookings. All payments shown are simulations.
      </p>
      {bookings.length === 0 ? (
        <div className="panel">
          <h2>No bookings yet.</h2>
          <p>Choose your dates to start your first stay.</p>
          <Link className="button" href="/#stays">
            Find a stay →
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">
              {staff ? "Resort bookings" : "Your bookings"}
            </caption>
            <thead>
              <tr>
                <th>Guest / reference</th>
                <th>Stay</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Total</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.guest_name}
                    <small>{b.id.slice(0, 8).toUpperCase()}</small>
                  </td>
                  <td>{b.room_name}</td>
                  <td>
                    {formatDate(b.check_in)}
                    <small>to {formatDate(b.check_out)}</small>
                  </td>
                  <td>
                    <span className="status">
                      {effectiveStatus(b.status, b.expires_at)}
                    </span>
                  </td>
                  <td>{rupees(b.total_paise)}</td>
                  <td>
                    <Link
                      aria-label={`View booking ${b.id.slice(0, 8)}`}
                      href={`/bookings/${b.id}`}
                    >
                      View ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
