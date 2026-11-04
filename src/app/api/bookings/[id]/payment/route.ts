import { z } from "zod";
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
    const status = await withDb(
      user.id,
      async (db) =>
        (
          await db.query("select resort.simulate_payment($1,$2,$3) as status", [
            id,
            data.eventId,
            data.outcome,
          ])
        ).rows[0].status,
    );
    return Response.json({ status });
  } catch (e) {
    return errorResponse(e);
  }
}
