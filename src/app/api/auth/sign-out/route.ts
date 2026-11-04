import { z } from "zod";
import { authClient } from "@/lib/supabase";
import { errorResponse, readInput } from "@/lib/http";
export async function POST(request: Request) {
  try {
    await readInput(request, z.object({}));
    await (await authClient()).auth.signOut();
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
