import { after } from "next/server";
import { z } from "zod";
import { withDb } from "@/lib/db";
import { requireUser, readInput, errorResponse, HttpError } from "@/lib/http";
import { dispatchBookingEmail, emailConfigured } from "@/lib/booking-email";
import { isDemoEmail } from "@/lib/booking-email-template";
export const maxDuration = 60;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await readInput(request, z.strictObject({}));
    const user = await requireUser();
    const { id } = await params;
    z.uuid().parse(id);
    if (!user.email || !user.email_confirmed_at)
      throw new HttpError(
        403,
        "Verify your email before requesting a confirmation.",
      );
    if (!emailConfigured())
      throw new HttpError(
        503,
        "Email delivery is not connected yet. Your booking remains saved.",
      );
    const email = user.email;
    await withDb(user.id, (db) =>
      db.query("select resort.queue_booking_email($1,$2,$3)", [
        id,
        email,
        isDemoEmail(email),
      ]),
    );
    after(() => dispatchBookingEmail(user.id, id).catch(() => {}));
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
