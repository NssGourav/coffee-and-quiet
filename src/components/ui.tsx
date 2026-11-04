import Link from "next/link";
import {
  formatDate,
  rupees,
  type SearchInput,
  type Stay,
  type Booking,
} from "@/lib/domain";
export function SearchForm({
  search,
  minDate,
}: {
  search: SearchInput;
  minDate: string;
}) {
  return (
    <form action="/#stays" className="search-form">
      <label>
        Check-in
        <input
          type="date"
          name="checkIn"
          defaultValue={search.checkIn}
          min={minDate}
          required
        />
      </label>
      <label>
        Check-out
        <input
          type="date"
          name="checkOut"
          defaultValue={search.checkOut}
          min={minDate}
          required
        />
      </label>
      <label>
        Adults
        <select name="adults" defaultValue={search.adults}>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "adult" : "adults"}
            </option>
          ))}
        </select>
      </label>
      <label>
        Children
        <select name="children" defaultValue={search.children}>
          {[0, 1, 2, 3].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "child" : "children"}
            </option>
          ))}
        </select>
      </label>
      <button className="button" type="submit">
        Find your stay <span aria-hidden>↗</span>
      </button>
    </form>
  );
}
export function Steps({ active }: { active: 1 | 2 | 3 }) {
  return (
    <ol className="steps" aria-label="Booking progress">
      {["Choose your stay", "Your details", "Review & test payment"].map(
        (s, i) => (
          <li
            key={s}
            aria-current={active === i + 1 ? "step" : undefined}
            className={active === i + 1 ? "active" : ""}
          >
            <span>{i + 1}</span>
            {s}
          </li>
        ),
      )}
    </ol>
  );
}
export function StaySummary({
  stay,
  search,
}: {
  stay: Stay;
  search: SearchInput;
}) {
  return (
    <div className="price-summary">
      <p className="eyebrow">Your stay</p>
      <h2>{stay.name}</h2>
      <p>
        {formatDate(search.checkIn)} — {formatDate(search.checkOut)}
      </p>
      <p className="muted">
        {stay.nights.length} nights · 1{" "}
        {stay.id === "garden-villa" ? "villa" : "room"} · {search.adults} adults
        {search.children > 0 ? ` · ${search.children} children` : ""}
      </p>
      <div className="divider" />
      <p className="small">Room only · demo rate</p>
      <dl className="price-lines">
        {stay.nights.map((n) => (
          <div key={n.night}>
            <dt>
              {formatDate(n.night)} <small>+ {n.gst_bps / 100}% GST</small>
            </dt>
            <dd>{rupees(n.rate_paise)}</dd>
          </div>
        ))}
        <div>
          <dt>Accommodation</dt>
          <dd>{rupees(stay.subtotal)}</dd>
        </div>
        <div>
          <dt>GST</dt>
          <dd>{rupees(stay.tax)}</dd>
        </div>
        <div className="total">
          <dt>Total, including taxes</dt>
          <dd>{rupees(stay.total)}</dd>
        </div>
      </dl>
      <p className="small muted">
        Prices are checked again when your hold is created. Accepted prices stay
        fixed for the hold.
      </p>
    </div>
  );
}
export function BookingSummary({ booking }: { booking: Booking }) {
  return (
    <div className="price-summary">
      <p className="eyebrow">Your saved stay</p>
      <h2>{booking.room_name}</h2>
      <p>
        {formatDate(booking.check_in)} — {formatDate(booking.check_out)}
      </p>
      <p className="muted">
        {booking.nights.length} nights · {booking.adults} adults
        {booking.children > 0 ? ` · ${booking.children} children` : ""}
      </p>
      <div className="divider" />
      <p>{booking.guest_name}</p>
      <p className="small muted">{booking.rate_plan}</p>
      <dl className="price-lines">
        {booking.nights.map((n) => (
          <div key={n.night}>
            <dt>
              {formatDate(n.night)}
              <small>
                GST {n.gst_bps / 100}% · {rupees(n.tax_paise)}
              </small>
            </dt>
            <dd>{rupees(n.base_paise + n.tax_paise)}</dd>
          </div>
        ))}
        <div className="total">
          <dt>Total, including GST</dt>
          <dd>{rupees(booking.total_paise)}</dd>
        </div>
      </dl>
    </div>
  );
}
export function StaffNav() {
  return (
    <nav className="staff-nav" aria-label="Staff">
      <Link href="/staff/inventory">Rates & allotment</Link>
      <Link href="/bookings">Bookings</Link>
    </nav>
  );
}
