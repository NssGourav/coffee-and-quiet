import { SignInForm } from "@/components/forms";
import { SignInLandscape } from "@/components/sign-in-landscape";
import { NavigationLink as Link } from "@/components/navigation-link";
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const p = await searchParams;
  return (
    <div className="signin-page">
      <SignInLandscape />
      <section className="signin-content" aria-labelledby="signin-title">
        <div className="signin-inner">
          <p className="eyebrow">YOUR STAY STARTS HERE</p>
          <h1 id="signin-title">
            A little closer
            <br />
            to your stay.
          </h1>
          <p className="signin-intro">
            Welcome back. The hills can wait.
            <br />A moment here, and you’re on your way.
          </p>
          <SignInForm next={p.next ?? "/"} />
          <Link href="/#stays" className="signin-back">
            <span aria-hidden="true">←</span> Explore our stays
          </Link>
          <div className="signin-footnote">
            <span aria-hidden="true">✳</span> A slower pace. A place to return
            to.
          </div>
        </div>
      </section>
    </div>
  );
}
