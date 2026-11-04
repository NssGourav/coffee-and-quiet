import Link from "next/link";
import { searchSchema } from "@/lib/domain";
import { findStays } from "@/lib/queries";
import { currentUser } from "@/lib/supabase";
import { Steps, StaySummary } from "@/components/ui";
import { SignInForm, HoldForm } from "@/components/forms";
export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams,
    parsed = searchSchema.safeParse(params);
  if (!parsed.success)
    return (
      <div className="wrap page">
        <h1>Choose your stay first.</h1>
        <Link className="button" href="/#stays">
          Find a stay
        </Link>
      </div>
    );
  const user = await currentUser(),
    stay = (await findStays(parsed.data)).find((s) => s.id === params.roomType);
  if (!stay)
    return (
      <div className="wrap page">
        <h1>This room does not fit your selection.</h1>
        <Link href="/">Change your stay</Link>
      </div>
    );
  return (
    <div className="wrap page narrow">
      <Steps active={2} />
      <div className="section-heading">
        <div>
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h1>Your stay, your details.</h1>
        </div>
      </div>
      <div className="checkout-grid">
        <section className="panel">
          <h2>{user ? "Who’s checking in?" : "Sign in to save your stay."}</h2>
          {stay.available === 0 ? (
            <div className="notice error">
              <p>This stay is no longer available for all nights.</p>
              <Link href="/#stays">Choose another stay</Link>
            </div>
          ) : user ? (
            <HoldForm stay={stay} search={parsed.data} />
          ) : (
            <>
              <p className="muted">
                Your booking will be private to your account and authorised
                reservations staff.
              </p>
              <SignInForm next="/checkout" inline />
            </>
          )}
        </section>
        <aside className="panel summary-panel">
          <StaySummary stay={stay} search={parsed.data} />
        </aside>
      </div>
    </div>
  );
}
