import { NavigationLink as Link } from "@/components/navigation-link";
import { currentUser } from "@/lib/supabase";
import { EnquiryForm } from "@/components/enquiries";
export default async function Enquire() {
  const user = await currentUser();
  return (
    <div className="wrap page narrow">
      <p className="eyebrow">STAYS · CELEBRATIONS · TEAM GATHERINGS</p>
      <h1>Let’s plan something lovely.</h1>
      <p className="body-copy">
        A quiet stay, a wedding among the hills or time away with your team.
        Tell our reservations team what you have in mind.
      </p>
      <p className="muted">
        Our team may use AI to help review your enquiry. Every reply is reviewed
        by a member of staff.
      </p>
      {user ? (
        <EnquiryForm />
      ) : (
        <div className="panel stack">
          <h2>Start a conversation.</h2>
          <p>Sign in with your guest account to send an enquiry.</p>
          <Link href="/sign-in?next=/enquire" className="button">
            Sign in to enquire
          </Link>
        </div>
      )}
    </div>
  );
}
