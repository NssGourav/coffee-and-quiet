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
    <div className="wrap page">
      <StaffNav />
      <p className="eyebrow">RESERVATIONS DESK</p>
      <h1>Rates & website allotment.</h1>
      <p className="body-copy">
        Set the number of rooms the website can sell each night. Confirmed
        bookings and active holds are protected. Set allotment to zero to close
        an uncommitted night.
      </p>
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
            Rates are not open for these dates. Local seed data opens the next
            121 nights.
          </p>
        )}
      </div>
      <p className="small muted">
        One room per booking. Rate edits apply to new holds only. Website
        allotment is separate from OTA/PMS stock; this prototype does not
        synchronise those systems.
      </p>
    </div>
  );
}
