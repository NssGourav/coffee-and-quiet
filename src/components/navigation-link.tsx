"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function NavigationFeedback() {
  const { pending } = useLinkStatus();
  return pending ? (
    <>
      <span className="navigation-progress" aria-hidden="true" />
      <span className="sr-only" role="status">
        Opening page…
      </span>
    </>
  ) : null;
}

// Keep the current screen visible while the next route is being prepared.
export function NavigationLink({
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <NavigationFeedback />
    </Link>
  );
}
