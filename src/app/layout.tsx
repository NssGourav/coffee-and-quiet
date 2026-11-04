import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/lib/supabase";
import { profile } from "@/lib/queries";
import { SignOut } from "@/components/forms";
export const metadata: Metadata = {
  title: {
    default: "Coffee & Quiet — A stay in the hills",
    template: "%s · Coffee & Quiet",
  },
  description:
    "A synthetic hill resort booking assessment, set in Chikkamagaluru. Real availability, transparent prices, simulated payments.",
};
export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  let staff = false;
  if (user) {
    try {
      staff = (await profile(user.id))?.role === "staff";
    } catch {
      /* page exposes service failure without leaking details */
    }
  }
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="demo-banner">
          ASSESSMENT PREVIEW{" "}
          <span>Fictional resort · synthetic data · simulated payments</span>
        </div>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Coffee and Quiet home">
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <path
                d="M20 33V14M20 22C7 24 5 10 5 8c11 0 17 6 15 14ZM20 17C19 7 29 4 35 5c0 10-6 15-15 12Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
            <span>
              coffee & quiet<small>CHIKKAMAGALURU</small>
            </span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/#stays">Our stays</Link>
            {user && (
              <Link href="/bookings">{staff ? "Bookings" : "My bookings"}</Link>
            )}
            {staff && <Link href="/staff/inventory">Staff desk</Link>}
            {user ? (
              <SignOut />
            ) : (
              <Link className="nav-signin" href="/sign-in">
                Sign in <span aria-hidden>↗</span>
              </Link>
            )}
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div>
            <span className="footer-brand">coffee & quiet</span>
            <p>A little closer to the hills.</p>
          </div>
          <p>
            Assessment prototype for the supplied resort brief.
            <br />
            Room details and policies are assumptions. Photos are illustrative.
            <br />
            <Link href="/credits">Image credits & demo details</Link>
          </p>
          <Link href="/staff/inventory">Reservations staff ↗</Link>
        </footer>
      </body>
    </html>
  );
}
