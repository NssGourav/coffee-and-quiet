import Image from "next/image";
import Link from "next/link";
import { SearchForm } from "@/components/ui";
import { findStays } from "@/lib/queries";
import {
  searchSchema,
  dateString,
  indiaToday,
  addDays,
  rupees,
  type Stay,
} from "@/lib/domain";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const today = indiaToday();
  const fallback = {
    checkIn: addDays(today, 10),
    checkOut: addDays(today, 12),
    adults: 2,
    children: 0,
  };
  const parsed = searchSchema.safeParse({
    checkIn: params.checkIn ?? fallback.checkIn,
    checkOut: params.checkOut ?? fallback.checkOut,
    adults: params.adults ?? 2,
    children: params.children ?? 0,
  });
  const search = parsed.success
    ? parsed.data
    : {
        ...fallback,
        checkIn: dateString.safeParse(params.checkIn).success
          ? String(params.checkIn)
          : fallback.checkIn,
        checkOut: dateString.safeParse(params.checkOut).success
          ? String(params.checkOut)
          : fallback.checkOut,
        adults: [1, 2, 3, 4].includes(Number(params.adults))
          ? Number(params.adults)
          : fallback.adults,
        children: [0, 1, 2, 3].includes(Number(params.children))
          ? Number(params.children)
          : fallback.children,
      };
  let stays: Stay[] = [];
  let error = parsed.success ? "" : parsed.error.issues[0].message;
  if (!error) {
    try {
      stays = await findStays(search);
    } catch {
      error =
        "Availability is temporarily unavailable. Please try again shortly.";
    }
  }
  const query = new URLSearchParams({
    ...search,
    adults: String(search.adults),
    children: String(search.children),
  }).toString();
  return (
    <>
      <section className="hero">
        <Image
          src="/images/hills.webp"
          alt="Green hills and a winding path in the Western Ghats; illustrative landscape"
          fill
          preload
          sizes="100vw"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow light">IN THE HILLS OF CHIKKAMAGALURU</p>
          <h1>
            Let the world
            <br />
            wait a little.
          </h1>
          <p>
            Quiet rooms. Coffee country.
            <br />A few days that are entirely yours.
          </p>
          <a href="#stays" className="hero-link">
            Find your corner of the hills <span aria-hidden>↓</span>
          </a>
        </div>
        <span className="hero-caption">
          A slower kind of stay · Illustrative landscape
        </span>
      </section>
      <div className="search-wrap">
        <SearchForm search={search} minDate={today} />
      </div>
      <section className="stays-section wrap" id="stays">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ROOM TO UNWIND</p>
            <h2>Find a stay that feels like you.</h2>
          </div>
          <p>Your stay, with all taxes included.</p>
        </div>
        {error ? (
          <div className="notice error" role="alert">
            {error}
          </div>
        ) : stays.length === 0 ? (
          <div className="notice">
            <h3>A little more room is needed.</h3>
            <p>
              No room type fits this group. Try fewer guests per room;
              multi-room bookings are outside this first version.
            </p>
          </div>
        ) : (
          <div className="stay-grid">
            {stays.map((stay, i) => (
              <article className="stay-card" key={stay.id}>
                <Link
                  className="room-photo"
                  href={`/rooms/${stay.id}?${query}`}
                >
                  <Image
                    src={stay.image_path}
                    alt={`Illustrative interior for ${stay.name}`}
                    fill
                    sizes="(max-width: 650px) 100vw, (max-width: 1000px) 50vw, 33vw"
                  />
                  <span className="photo-label">
                    0{i + 1} / {stay.id === "garden-villa" ? "VILLA" : "ROOM"}
                  </span>
                </Link>
                <div className="room-copy">
                  <div className="room-title">
                    <h3>
                      <Link href={`/rooms/${stay.id}?${query}`}>
                        {stay.name}
                      </Link>
                    </h3>
                    <span>Up to {stay.capacity} guests</span>
                  </div>
                  <p>{stay.description}</p>
                  <div className="room-price">
                    <div>
                      {stay.available > 0 ? (
                        <>
                          <strong>{rupees(stay.total)}</strong>
                          <small>
                            for {stay.nights.length} nights · incl. GST
                          </small>
                        </>
                      ) : (
                        <>
                          <strong>Unavailable</strong>
                          <small>Try another date</small>
                        </>
                      )}
                    </div>
                    <Link
                      className="circle-link"
                      aria-label={`View ${stay.name}`}
                      href={`/rooms/${stay.id}?${query}`}
                    >
                      ↗
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="availability-note">
          Availability is live for the website’s allotted rooms. Your selection
          is reserved only when a hold is created.
        </p>
      </section>
      <section className="quiet-note wrap">
        <p className="eyebrow">THE ESTATE, AT YOUR PACE</p>
        <h2>
          Wake up somewhere
          <br />
          you don’t need to rush.
        </h2>
        <p>
          Find a little breathing space among the coffee trees. Explore our
          rooms and villas, choose your dates, and settle into the slower rhythm
          of the hills.
        </p>
      </section>
    </>
  );
}
