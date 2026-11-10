import { NavigationLink as Link } from "@/components/navigation-link";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { currentUser } from "@/lib/supabase";
import { getBooking } from "@/lib/queries";
import { effectiveStatus } from "@/lib/domain";
import { BookingSummary } from "@/components/ui";
import { BookingEmailStatus } from "@/components/booking-email-status";
import { bookingEmailStatus, emailConfigured } from "@/lib/booking-email";
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
  const mail =
    status === "confirmed" && booking.guest_id === user.id
      ? await bookingEmailStatus(user.id, id)
      : null;
  const title =
    status === "confirmed"
      ? "Your quiet escape is confirmed."
      : status === "expired"
        ? "Your hold has expired."
        : status === "failed"
          ? "Your booking wasn’t completed."
          : "Your room is on hold.";
  return (
    <div className="wrap page confirmation">
      {status !== "confirmed" && (
        <span className={`status ${status}`}>
          {status === "held"
            ? "Awaiting confirmation"
            : status === "expired"
              ? "Expired"
              : "Not completed"}
        </span>
      )}
      <h1>{title}</h1>
      <p className="muted">
        {status === "confirmed"
          ? "Your confirmation is saved. No money was charged."
          : status === "held"
            ? "Confirm your booking before your hold expires."
            : "This room has been released. Check availability to start a new booking."}
      </p>
      {status === "confirmed" && booking.guest_id === user.id && (
        <BookingEmailStatus
          bookingId={id}
          status={mail?.status ?? "none"}
          attempts={mail?.attempts ?? 0}
          configured={Boolean(emailConfigured())}
          lastAttempt={
            mail?.last_attempt_at
              ? new Date(mail.last_attempt_at).toISOString()
              : null
          }
        />
      )}
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
            Complete booking →
          </Link>
        ) : (
          <Link className="button" href="/#stays">
            Explore more stays →
          </Link>
        )}
        <Link href="/bookings">View bookings</Link>
      </div>
    </div>
  );
}
