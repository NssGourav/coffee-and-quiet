import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import { profile } from "@/lib/queries";
import { withDb } from "@/lib/db";
import { indiaToday, addDays, dateString } from "@/lib/domain";
import { InventoryRow } from "@/components/forms";
import { StaffNav } from "@/components/ui";
export default async function Inventory({
  searchParams,
}: {
  searchParams: Promise<{ roomType?: string; date?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/staff/inventory");
  if ((await profile(user.id))?.role !== "staff")
    return (
      <div className="wrap page">
        <h1>Staff access required.</h1>
        <p>This account cannot manage the resort’s rates or allotment.</p>
      </div>
    );
  const p = await searchParams;
  const date = dateString.safeParse(p.date).success ? p.date! : indiaToday(),
    room = ["estate-room", "terrace-room", "garden-villa"].includes(
      p.roomType ?? "",
    )
      ? p.roomType!
      : "estate-room";
  const rows = await withDb(
    user.id,
    async (db) =>
      (
        await db.query(
          "select i.*,a.available from resort.inventory i join resort.availability($1,$2) a using(room_type,night) where i.room_type=$3 order by i.night",
          [date, addDays(date, 7), room],
        )
      ).rows,
  );
  return (
    <div className="wrap page staff-page">
      <StaffNav />
      <p className="eyebrow">RESERVATIONS DESK</p>
      <h1>Rates & website allotment.</h1>
      <p className="body-copy">
        Manage nightly rates and website room availability.
      </p>
      <details className="inventory-help">
        <summary>How allotment works</summary>
        <ul>
          <li>
            Allotment cannot fall below confirmed bookings and active holds.
          </li>
          <li>
            Set allotment to zero to close a night with no bookings or active
            holds.
          </li>
          <li>
            Rate changes apply to new holds; existing booking prices stay fixed.
          </li>
          <li>
            Website inventory is managed separately. OTA/PMS stock is not
            synchronised.
          </li>
        </ul>
      </details>
      <form className="staff-filter">
        <label>
          Room type
          <select name="roomType" defaultValue={room}>
            <option value="estate-room">Estate Room</option>
            <option value="terrace-room">Terrace Room</option>
            <option value="garden-villa">Garden Villa</option>
          </select>
        </label>
        <label>
          Week beginning
          <input name="date" type="date" defaultValue={date} required />
        </label>
        <button className="button">Show week</button>
      </form>
      <div className="panel inventory-table">
        <div className="inventory-head">
          <span>Night / commitments</span>
          <span>Base rate / night</span>
          <span>Website allotment</span>
          <span>Action</span>
        </div>
        {rows.length ? (
          rows.map((row) => (
            <InventoryRow key={`${row.room_type}-${row.night}`} row={row} />
          ))
        ) : (
          <p className="notice">
            No rates are available for this week. Choose another date.
          </p>
        )}
      </div>
    </div>
  );
}
