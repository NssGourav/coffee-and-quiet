import { z } from "zod";
import { getBooking } from "@/lib/queries";
import { errorResponse, requireUser, HttpError } from "@/lib/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    z.uuid().parse(id);
    const booking = await getBooking(user.id, id);
    if (!booking) throw new HttpError(404, "Booking not found.");
    return Response.json(booking, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
