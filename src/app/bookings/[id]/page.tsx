import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { currentUser } from "@/lib/supabase";
import { getBooking } from "@/lib/queries";
import { effectiveStatus } from "@/lib/domain";
import { BookingSummary } from "@/components/ui";
export default async function Confirmation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=/bookings/${id}`);
  const booking = await getBooking(user.id, id);
  if (!booking) notFound();
  const status = effectiveStatus(booking.status, booking.expires_at);
  const title =
    status === "confirmed"
      ? "Your quiet escape is confirmed."
      : status === "expired"
        ? "Your hold has expired."
        : status === "failed"
          ? "Your test payment did not go through."
          : "Your room is on hold.";
  return (
    <div className="wrap page confirmation">
      {status !== "confirmed" && (
        <span className={`status ${status}`}>
          {status === "held"
            ? "Awaiting test payment"
            : status === "expired"
              ? "Expired"
              : "Payment failed"}
        </span>
      )}
      <h1>{title}</h1>
      <p className="muted">
        {status === "confirmed"
          ? "Your confirmation is saved. No money was charged and no message was sent."
          : status === "held"
            ? "Finish the simulation before your hold expires."
            : "This room has been released. Check availability to start a new booking."}
      </p>
      <div className="panel">
        <BookingSummary booking={booking} />
        <p className="small booking-reference">
          Booking reference
          <br />
          <strong>{id}</strong>
        </p>
      </div>
      <div className="confirmation-actions">
        {status === "held" && booking.guest_id === user.id ? (
          <Link className="button" href={`/checkout/${id}`}>
            Complete test payment →
          </Link>
        ) : (
          <Link className="button" href="/#stays">
            Explore more stays →
          </Link>
        )}
        <Link href="/bookings">View bookings</Link>
      </div>
      <p className="small muted">
        {booking.policy_snapshot.replace("Synthetic assessment booking. ", "")}
      </p>
    </div>
  );
}
