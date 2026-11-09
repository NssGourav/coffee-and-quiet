import { SignUpForm } from "@/components/sign-up-form";
import { SignInLandscape } from "@/components/sign-in-landscape";
export default async function SignUp({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const p = await searchParams;
  return (
    <div className="signin-page">
      <SignInLandscape />
      <section className="signin-content" aria-labelledby="signup-title">
        <div className="signin-inner">
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h1 id="signup-title">
            Your next stay
            <br />
            starts here.
          </h1>
          <p className="signin-intro">
            Create a guest account to save your stays and hear from us.
          </p>
          <SignUpForm
            next={p.next ?? "/"}
            enabled={process.env.SIGNUP_ENABLED === "true"}
          />
        </div>
      </section>
    </div>
  );
}
