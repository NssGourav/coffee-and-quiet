"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="wrap page">
      <p className="eyebrow">LET’S TRY THAT AGAIN</p>
      <h1>We couldn’t load this page.</h1>
      <p>The service may be temporarily unavailable. Please retry.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
