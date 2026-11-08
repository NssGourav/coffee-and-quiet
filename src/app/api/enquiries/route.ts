import { z } from "zod";
import { withDb } from "@/lib/db";
import { readInput, requireUser, errorResponse } from "@/lib/http";
export async function POST(request: Request) {
  try {
    const data = await readInput(
      request,
      z.object({
        message: z.string().trim().min(8).max(3000),
        complaint: z.boolean(),
      }),
    );
    const user = await requireUser();
    const id = await withDb(user.id, async (db) => {
      await db.query("select resort.ensure_guest($1)", ["Website guest"]);
      return (
        await db.query("select resort.create_enquiry($1,$2) id", [
          data.message,
          data.complaint,
        ])
      ).rows[0].id;
    });
    return Response.json({ id });
  } catch (e) {
    return errorResponse(e);
  }
}
