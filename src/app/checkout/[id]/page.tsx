import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { currentUser } from "@/lib/supabase";
import { getBooking } from "@/lib/queries";
import { Steps, BookingSummary } from "@/components/ui";
import { PaymentForm } from "@/components/forms";
export default async function Review({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=/checkout/${id}`);
  const booking = await getBooking(user.id, id);
  if (!booking || booking.guest_id !== user.id) notFound();
  return (
    <div className="wrap page narrow">
      <Steps active={3} />
      <p className="eyebrow">ONE LAST LOOK</p>
      <h1>Review your time away.</h1>
      <div className="checkout-grid">
        <section className="panel">
          <h2>A stay to look forward to.</h2>
          <PaymentForm booking={booking} initialNow={Date.now()} />
        </section>
        <aside className="panel summary-panel">
          <BookingSummary booking={booking} />
        </aside>
      </div>
    </div>
  );
}
