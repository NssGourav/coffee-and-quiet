import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap page">
      <p className="eyebrow">A DIFFERENT PATH</p>
      <h1>We couldn’t find that stay.</h1>
      <p>The page may be unavailable or private to another guest.</p>
      <Link className="button" href="/">
        Return to the estate →
      </Link>
    </div>
  );
}
