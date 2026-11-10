import Image from "next/image";
import { NavigationLink as Link } from "@/components/navigation-link";
import { notFound } from "next/navigation";
import { searchSchema, indiaToday, addDays } from "@/lib/domain";
import { findStays } from "@/lib/queries";
import { Steps, StaySummary } from "@/components/ui";
export default async function Room({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { slug } = await params,
    p = await searchParams,
    today = indiaToday();
  const parsed = searchSchema.safeParse({
    checkIn: p.checkIn ?? addDays(today, 10),
    checkOut: p.checkOut ?? addDays(today, 12),
    adults: p.adults ?? 2,
    children: p.children ?? 0,
  });
  if (!parsed.success)
    return (
      <div className="wrap page">
        <h1>Check your dates.</h1>
        <p>Choose a stay of 1–14 nights with valid guest counts.</p>
        <Link className="button" href="/">
          Back to search
        </Link>
      </div>
    );
  const stays = await findStays(parsed.data),
    stay = stays.find((r) => r.id === slug);
  if (!stay) notFound();
  const query = new URLSearchParams({
    ...parsed.data,
    adults: String(parsed.data.adults),
    children: String(parsed.data.children),
  });
  return (
    <div className="wrap page">
      <Steps active={1} />
      <Link href={`/?${query}#stays`} className="back-link">
        ← All stays
      </Link>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">YOUR CORNER OF THE ESTATE</p>
          <h1>{stay.name}</h1>
        </div>
        <span>
          Up to {stay.capacity} guests · 1{" "}
          {slug === "garden-villa" ? "villa" : "room"}
        </span>
      </div>
      <div className="detail-grid">
        <div>
          <div className="detail-photo">
            <Image
              src={stay.image_path}
              alt={`Illustrative ${stay.name} interior`}
              fill
              preload
              sizes="(max-width: 800px) 100vw, 65vw"
            />
          </div>
          <h2>Settle into a slower rhythm.</h2>
          <p className="body-copy">{stay.description}</p>
          <div className="room-facts">
            <div>
              <strong>Room only</strong>
              <span>One clear rate plan</span>
            </div>
            <div>
              <strong>{stay.capacity} guests</strong>
              <span>Maximum occupancy</span>
            </div>
          </div>
          <p className="small muted">
            Photography is illustrative.{" "}
            <Link href="/credits">About this website</Link>.
          </p>
        </div>
        <aside className="panel">
          <StaySummary stay={stay} search={parsed.data} />
          {stay.available > 0 ? (
            <>
              <p className="available">Available for your dates</p>
              <Link
                className="button"
                href={`/checkout?roomType=${stay.id}&${query}`}
              >
                Choose this stay <span aria-hidden>→</span>
              </Link>
            </>
          ) : (
            <div className="notice">
              <p>No website allotment remains for every night of this stay.</p>
              <Link href={`/?${query}#stays`}>Change dates or room</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
