import { authClient } from "@/lib/supabase";
import { signupSchema } from "@/lib/registration";
import { errorResponse, HttpError, readInput } from "@/lib/http";
export async function POST(request: Request) {
  try {
    const input = await readInput(request, signupSchema);
    if (process.env.SIGNUP_ENABLED !== "true")
      throw new HttpError(
        503,
        "New accounts are temporarily unavailable. Please try again later.",
      );
    const client = await authClient();
    const { data, error } = await client.auth.signUp(input);
    if (error)
      throw new HttpError(
        error.status === 429 ? 429 : 400,
        error.status === 429
          ? "Please wait before requesting another code."
          : "We couldn’t start signup. Try again later, or sign in if you already have an account.",
      );
    // Public signup must never silently bypass email verification.
    if (data.session) {
      await client.auth.signOut();
      throw new HttpError(
        503,
        "Email verification is not ready. Please try again later.",
      );
    }
    return Response.json({
      ok: true,
      message:
        "If this address can create an account, a verification code is on its way. Existing users can sign in.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
