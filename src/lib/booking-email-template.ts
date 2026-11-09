import { formatDate, nightsBetween, rupees, type Booking } from "./domain";
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function isDemoEmail(email: string) {
  return /@(?:[^@]+\.)?(?:example|invalid|test|localhost)$|@(?:example\.com|example\.org|example\.net)$/i.test(
    email,
  );
}
export function bookingEmail(booking: Booking, origin: string) {
  if (booking.status !== "confirmed")
    throw new Error("Only confirmed bookings can be emailed");
  const base = new URL(origin);
  if (!["https:", "http:"].includes(base.protocol))
    throw new Error("Invalid application origin");
  const url = new URL(`/bookings/${booking.id}`, base).href;
  const nights = nightsBetween(booking.check_in, booking.check_out).length;
  const subtotal = booking.nights.reduce((sum, n) => sum + n.base_paise, 0);
  const tax = booking.nights.reduce((sum, n) => sum + n.tax_paise, 0);
  if (subtotal + tax !== booking.total_paise)
    throw new Error("Booking totals do not match");
  const reference = booking.id.toUpperCase();
  const text = `Coffee & Quiet — booking confirmation\n\nDear ${booking.guest_name},\nYour booking is confirmed.\n\nBooking reference: ${reference}\n${booking.room_name} · Room only\nCheck-in: ${formatDate(booking.check_in)}\nCheck-out: ${formatDate(booking.check_out)}\n1 room · ${nights} ${nights === 1 ? "night" : "nights"}\nGuests: ${booking.adults} adults, ${booking.children} children\n\nRoom subtotal: ${rupees(subtotal)}\nGST: ${rupees(tax)}\nBooking total: ${rupees(booking.total_paise)}\nAmount charged: ${rupees(0)}\n\nNo money was charged and no amount is due.\n\nView your saved booking (sign-in required): ${url}\n`;
  const e = escapeHtml;
  const row = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #e0e5db;color:#677568">${e(label)}</td><td style="padding:10px 0;border-bottom:1px solid #e0e5db;text-align:right;${bold ? "font-weight:bold;" : ""}">${e(value)}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f5ef;color:#294536;font-family:Arial,sans-serif;padding:24px 12px"><table role="presentation" style="max-width:600px;width:100%;margin:auto;background:#fff;border:1px solid #dce2d6;border-collapse:collapse"><tr><td style="padding:30px"><p style="font-family:Georgia,serif;font-size:32px;margin:0">coffee &amp; quiet</p><p style="font-size:10px;letter-spacing:3px">CHIKKAMAGALURU</p><h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.2">Your quiet escape is confirmed.</h1><p>Dear ${e(booking.guest_name)},</p><p>Thank you for choosing Coffee & Quiet. Here are your stay details.</p><table role="presentation" style="width:100%;background:#eef2e8;padding:16px;margin:24px 0"><tr><td><strong>${e(booking.room_name)}</strong><p>1 room · ${nights} ${nights === 1 ? "night" : "nights"} · Room only</p><p>Check-in: <strong>${e(formatDate(booking.check_in))}</strong><br/>Check-out: <strong>${e(formatDate(booking.check_out))}</strong></p><p>${booking.adults} adults · ${booking.children} children</p></td></tr></table><table role="presentation" style="width:100%;border-collapse:collapse">${row("Room subtotal", rupees(subtotal))}${row("GST", rupees(tax))}${row("Booking total", rupees(booking.total_paise), true)}${row("Amount charged", rupees(0))}</table><p style="padding:16px;background:#f6f5ef;font-size:13px;line-height:1.6">No money was charged and no amount is due.</p><p style="font-size:12px;word-break:break-all">Booking reference<br/><strong>${e(reference)}</strong></p><p style="margin-top:28px"><a href="${e(url)}" style="display:inline-block;background:#294536;color:#fff;padding:16px 24px;text-decoration:none">View your saved booking →</a></p><p style="font-size:12px;color:#677568">Sign in with the account used for this booking to see its details.</p></td></tr></table></body></html>`;
  return {
    subject: `Coffee & Quiet — booking ${booking.id.slice(0, 8).toUpperCase()} confirmed`,
    text,
    html,
  };
}
