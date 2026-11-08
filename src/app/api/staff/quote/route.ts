import { z } from "zod";
import { readInput, requireStaff, errorResponse, HttpError } from "@/lib/http";
import { findStays } from "@/lib/queries";
import { searchSchema, rupees, formatDate } from "@/lib/domain";
export async function POST(request: Request) {
  try {
    await requireStaff();
    const data = await readInput(
      request,
      searchSchema.safeExtend({
        roomType: z.enum(["estate-room", "terrace-room", "garden-villa"]),
      }),
    );
    const stay = (await findStays(data)).find((s) => s.id === data.roomType);
    if (!stay)
      throw new HttpError(400, "Guest count exceeds this room’s capacity.");
    const text =
      stay.available > 0
        ? `${stay.name}, one unit, ${formatDate(data.checkIn)} to ${formatDate(data.checkOut)} (${data.adults} adults, ${data.children} children):\n${stay.nights.map((n) => `${formatDate(n.night)}: ${rupees(n.rate_paise)} + ${rupees(n.tax_paise)} GST (${n.gst_bps / 100}%)`).join("\n")}\nTotal including GST: ${rupees(stay.total)}. Room only. Checked ${new Date().toISOString()}. This is an indicative quote, not a reservation; rates and availability are checked again at booking.`
        : `${stay.name} is unavailable for the complete stay from ${formatDate(data.checkIn)} to ${formatDate(data.checkOut)}. Please share alternative dates.`;
    return Response.json({ text, available: stay.available });
  } catch (e) {
    return errorResponse(e);
  }
}
