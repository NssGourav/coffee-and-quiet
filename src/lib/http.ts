import "server-only";
import { z } from "zod";
import { currentUser } from "./supabase";
import { profile } from "./queries";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return user;
}
export async function requireStaff() {
  const user = await requireUser();
  const p = await profile(user.id);
  if (p?.role !== "staff") throw new HttpError(403, "Staff access required.");
  return user;
}
export async function readInput<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const origin = process.env.APP_ORIGIN;
  if (!origin || request.headers.get("origin") !== origin)
    throw new HttpError(403, "This request came from an unexpected origin.");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Expected JSON.");
  if (Number(request.headers.get("content-length")) > 8192)
    throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing request.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  let data: unknown;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
  return schema.parse(data);
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError)
    return Response.json(
      { error: error.issues[0]?.message ?? "Check the form fields." },
      { status: 400 },
    );
  const e = error as { code?: string; message?: string };
  if (["P0001", "22023", "42501"].includes(e.code ?? ""))
    return Response.json(
      { error: e.message },
      { status: e.code === "42501" ? 403 : e.code === "22023" ? 400 : 409 },
    );
  // No raw DB errors, request data, auth tokens, or connection strings in response/log.
  return Response.json(
    {
      error:
        "The service is temporarily unavailable. Your details are still here; please try again.",
    },
    { status: 503 },
  );
}
