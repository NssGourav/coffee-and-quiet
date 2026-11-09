import { authClient } from "@/lib/supabase";
import { withDb } from "@/lib/db";
import { verificationSchema } from "@/lib/registration";
import { errorResponse, HttpError, readInput } from "@/lib/http";
export async function POST(request: Request) {
  try {
    const input = await readInput(request, verificationSchema);
    const client = await authClient();
    const { data, error } = await client.auth.verifyOtp({
      ...input,
      type: "signup",
    });
    if (error || !data.user?.email_confirmed_at || !data.session)
      throw new HttpError(
        400,
        "This code is invalid or expired. Check your email or request a new code.",
      );
    await withDb(data.user.id, (db) =>
      db.query("select resort.ensure_guest($1)", ["Guest"]),
    );
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
