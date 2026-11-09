import { z } from "zod";
export const signupSchema = z.strictObject({
  email: z.email().trim().max(254),
  password: z.string().min(10, "Use at least 10 characters.").max(128),
});
export const verificationSchema = z.strictObject({
  email: z.email().trim().max(254),
  token: z
    .string()
    .regex(/^\d{6}$/, "Enter the six-digit code from your email."),
});
export function safeReturnPath(value: string) {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return "/";
  return value;
}
