import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import { profile } from "@/lib/queries";
import { withDb } from "@/lib/db";
import { StaffNav } from "@/components/ui";
export default async function Inbox({
  searchParams,
}: {
  searchParams: Promise<{ lane?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/staff/enquiries");
  if ((await profile(user.id))?.role !== "staff")
    return (
      <div className="wrap page">
        <h1>Staff access required.</h1>
      </div>
    );
  const lane = (await searchParams).lane;
  const rows = await withDb(
    user.id,
    async (db) =>
      (
        await db.query(
          "select * from resort.enquiries order by gm_alert desc,created_at desc limit 200",
        )
      ).rows,
  );
  const shown = rows.filter((e) =>
    lane === "gm"
      ? e.gm_alert || e.category === "unsorted"
      : lane === "review"
        ? e.status !== "sent"
        : lane === "sent"
          ? e.status === "sent"
          : true,
  );
  return (
    <div className="wrap page staff-page">
      <StaffNav />
      <p className="eyebrow">RESERVATIONS & EVENT SALES</p>
      <h1>Every conversation, cared for.</h1>
      <p className="body-copy">
        Review enquiries, correct routing and approve replies. Complaints and
        uncertain requests stay visible to the manager.
      </p>
      <nav className="inbox-tabs" aria-label="Inbox filters">
        {[
          ["", "All enquiries"],
          ["review", "Needs attention"],
          ["gm", "GM & unsorted"],
          ["sent", "Saved replies"],
        ].map(([v, l]) => (
          <Link
            className={(!lane && !v) || lane === v ? "selected" : ""}
            href={`/staff/enquiries${v ? "?lane=" + v : ""}`}
            key={v}
          >
            {l}
          </Link>
        ))}
      </nav>
      <div className="enquiry-list">
        {shown.length ? (
          shown.map((e) => (
            <Link
              key={e.id}
              href={`/staff/enquiries/${e.id}`}
              className="enquiry-card"
            >
              <div>
                <span className="status">{e.category}</span>{" "}
                {e.gm_alert && <span className="status failed">GM alert</span>}
                <p>{e.message}</p>
                <span className="small muted">
                  {e.owner} ·{" "}
                  {new Date(e.created_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </span>
              </div>
              <span className="status">{e.status}</span>
            </Link>
          ))
        ) : (
          <div className="panel">
            <h2>No enquiries in this lane.</h2>
            <p>
              New guest requests will appear here. Try another filter or open
              the guest enquiry form.
            </p>
            <Link href="/enquire">Open enquiry form ↗</Link>
          </div>
        )}
      </div>
    </div>
  );
}
