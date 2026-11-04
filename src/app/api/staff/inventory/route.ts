import { inventorySchema } from "@/lib/domain";
import { withDb } from "@/lib/db";
import { errorResponse, readInput, requireStaff } from "@/lib/http";
export async function POST(request: Request) {
  try {
    const data = await readInput(request, inventorySchema);
    const user = await requireStaff();
    await withDb(user.id, (db) =>
      db.query("select resort.update_inventory($1,$2,$3,$4,$5)", [
        data.roomType,
        data.night,
        data.allotment,
        data.ratePaise,
        data.version,
      ]),
    );
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
