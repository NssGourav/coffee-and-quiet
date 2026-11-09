import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { currentUser } from "@/lib/supabase";
import { profile } from "@/lib/queries";
import { withDb } from "@/lib/db";
import { StaffNav } from "@/components/ui";
import { EnquiryEditor } from "@/components/enquiries";
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/staff/enquiries");
  if ((await profile(user.id))?.role !== "staff")
    return (
      <div className="wrap page">
        <h1>Staff access required.</h1>
      </div>
    );
  const id = (await params).id;
  if (!z.uuid().safeParse(id).success) notFound();
  const { enquiry, audit } = await withDb(user.id, async (db) => ({
    enquiry: (
      await db.query("select * from resort.enquiries where id=$1", [id])
    ).rows[0],
    audit: (
      await db.query(
        "select a.action,a.created_at,p.display_name from resort.enquiry_audit a left join resort.profiles p on p.id=a.actor_id where enquiry_id=$1 order by a.id desc",
        [id],
      )
    ).rows,
  }));
  if (!enquiry) notFound();
  return (
    <div className="wrap page staff-page">
      <StaffNav />
      <Link href="/staff/enquiries">← Back to inbox</Link>
      <p className="eyebrow" style={{ marginTop: 16 }}>
        {enquiry.owner} · {enquiry.status}
      </p>
      <h1>One enquiry. A personal reply.</h1>
      {enquiry.gm_alert && (
        <p className="notice error">
          GM alert: this complaint needs the manager’s attention.
        </p>
      )}
      <EnquiryEditor
        key={enquiry.version}
        enquiry={JSON.parse(JSON.stringify(enquiry))}
      />
      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Activity</h2>
        <ul>
          {audit.map((a, i) => (
            <li key={i}>
              {a.action} · {a.display_name || "Staff member"} ·{" "}
              {new Date(a.created_at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
