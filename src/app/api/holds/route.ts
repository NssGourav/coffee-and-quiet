import { holdSchema } from "@/lib/domain";
import { withDb } from "@/lib/db";
import { errorResponse, readInput, requireUser } from "@/lib/http";
export async function POST(request: Request) {
  try {
    const data = await readInput(request, holdSchema);
    const user = await requireUser();
    const id = await withDb(user.id, async (db) => {
      await db.query("select resort.ensure_guest($1)", [data.guestName]);
      return (
        await db.query(
          "select resort.create_hold($1,$2,$3,$4,$5,$6,$7,$8,$9) as id",
          [
            data.roomType,
            data.checkIn,
            data.checkOut,
            data.adults,
            data.children,
            data.guestName,
            data.idempotencyKey,
            data.expectedTotal,
            data.expectedVersions,
          ],
        )
      ).rows[0].id;
    });
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
