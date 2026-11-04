import { SignInForm } from "@/components/forms";
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const p = await searchParams;
  return (
    <div className="wrap page signin-page">
      <p className="eyebrow">WELCOME BACK</p>
      <h1>A little closer to your stay.</h1>
      <section className="panel">
        <h2>Sign in</h2>
        <SignInForm next={p.next ?? "/"} />
      </section>
    </div>
  );
}
