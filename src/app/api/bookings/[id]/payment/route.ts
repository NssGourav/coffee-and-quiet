import { z } from "zod";
import { after } from "next/server";
import { dispatchBookingEmail } from "@/lib/booking-email";
import { isDemoEmail } from "@/lib/booking-email-template";
export const maxDuration = 60;
import { paymentSchema } from "@/lib/domain";
import { withDb } from "@/lib/db";
import { errorResponse, readInput, requireUser } from "@/lib/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const data = await readInput(request, paymentSchema);
    const user = await requireUser();
    const { id } = await params;
    z.uuid().parse(id);
    const status = await withDb(user.id, async (db) => {
      const status = (
        await db.query("select resort.simulate_payment($1,$2,$3) as status", [
          id,
          data.eventId,
          data.outcome,
        ])
      ).rows[0].status;
      if (status === "confirmed" && user.email && user.email_confirmed_at) {
        await db.query("select resort.queue_booking_email($1,$2,$3)", [
          id,
          user.email,
          isDemoEmail(user.email),
        ]);
      }
      return status;
    });
    if (status === "confirmed")
      after(() => dispatchBookingEmail(user.id, id).catch(() => {}));
    return Response.json({ status });
  } catch (e) {
    return errorResponse(e);
  }
}
