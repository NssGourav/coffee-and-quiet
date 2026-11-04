import { z } from "zod";
import { authClient } from "@/lib/supabase";
import { withDb } from "@/lib/db";
import { errorResponse, readInput, HttpError } from "@/lib/http";
const schema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});
export async function POST(request: Request) {
  try {
    const data = await readInput(request, schema);
    const client = await authClient();
    const { data: session, error } = await client.auth.signInWithPassword(data);
    if (error || !session.user)
      throw new HttpError(
        401,
        "Email or password did not match. Please try again.",
      );
    await withDb(session.user.id, (db) =>
      db.query("select resort.ensure_guest($1)", ["Demo guest"]),
    );
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
