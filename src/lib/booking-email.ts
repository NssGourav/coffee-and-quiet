import "server-only";
import nodemailer from "nodemailer";
import { withDb } from "./db";
import { getBooking } from "./queries";
import { bookingEmail } from "./booking-email-template";
export function emailConfigured() {
  return process.env.EMAIL_TRANSPORT === "local"
    ? !process.env.VERCEL
    : process.env.EMAIL_TRANSPORT === "smtp" &&
        Boolean(
          process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASSWORD &&
          process.env.EMAIL_FROM,
        );
}
export async function dispatchBookingEmail(userId: string, bookingId: string) {
  if (!emailConfigured()) return;
  const job = await withDb(
    userId,
    async (db) =>
      (
        await db.query("select * from resort.claim_booking_email($1)", [
          bookingId,
        ])
      ).rows[0],
  );
  if (!job) return;
  let accepted = false;
  let sending = false;
  try {
    const booking = await getBooking(userId, bookingId);
    if (!booking || booking.guest_id !== userId)
      throw new Error("Booking unavailable");
    const content = bookingEmail(booking, process.env.APP_ORIGIN!);
    const local =
      process.env.EMAIL_TRANSPORT === "local" && !process.env.VERCEL;
    const port = local
      ? Number(process.env.SMTP_PORT || 54325)
      : Number(process.env.SMTP_PORT || 587);
    if (!local && ![465, 587].includes(port))
      throw new Error("Use encrypted SMTP");
    const transport = nodemailer.createTransport({
      host: local ? "127.0.0.1" : process.env.SMTP_HOST,
      port,
      secure: !local && port === 465,
      requireTLS: !local && port !== 465,
      ...(local
        ? {}
        : {
            auth: {
              user: process.env.SMTP_USER!,
              pass: process.env.SMTP_PASSWORD!,
            },
          }),
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    sending = true;
    const info = await transport.sendMail({
      from: local
        ? "Coffee & Quiet <bookings@resort.example>"
        : process.env.EMAIL_FROM!,
      to: job.recipient,
      messageId: `<booking-${booking.id}@${new URL(process.env.APP_ORIGIN!).hostname}>`,
      ...content,
    });
    if (!info.accepted?.length)
      throw Object.assign(new Error("Email not accepted"), {
        code: "EREJECTED",
      });
    accepted = true;
    await withDb(userId, (db) =>
      db.query("select resort.finish_booking_email($1,$2,$3,$4)", [
        bookingId,
        job.attempt_id,
        "sent",
        info.messageId,
      ]),
    );
  } catch (error) {
    // Never expose provider replies or addresses in logs. If acceptance was recorded
    // but saving failed, leave "sending" for reconciliation instead of duplicating mail.
    const failure = error as {
      code?: string;
      command?: string;
      responseCode?: number;
    };
    const definiteRejection =
      !sending ||
      ["EAUTH", "EDNS", "EENVELOPE", "EMESSAGE", "EREJECTED"].includes(
        failure.code ?? "",
      ) ||
      failure.command === "CONN" ||
      (failure.responseCode ?? 0) >= 400;
    if (!accepted && definiteRejection)
      await withDb(userId, (db) =>
        db.query("select resort.finish_booking_email($1,$2,$3)", [
          bookingId,
          job.attempt_id,
          "failed",
        ]),
      ).catch(() => {});
  }
}
export async function bookingEmailStatus(userId: string, bookingId: string) {
  return withDb(
    userId,
    async (db) =>
      (
        await db.query(
          "select status,attempts,sent_at,last_attempt_at from resort.booking_emails where booking_id=$1",
          [bookingId],
        )
      ).rows[0] ?? null,
  );
}
