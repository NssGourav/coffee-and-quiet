"use client";

import { useState } from "react";
import {
  addDays,
  checkOutRange,
  dateString,
  formatDate,
  maxAdvanceDays,
  type SearchInput,
} from "@/lib/domain";

export function SearchForm({
  search,
  minDate,
}: {
  search: SearchInput;
  minDate: string;
}) {
  const [checkIn, setCheckIn] = useState(search.checkIn);
  const lastCheckIn = addDays(minDate, maxAdvanceDays);
  const checkoutRange =
    dateString.safeParse(checkIn).success &&
    checkIn >= minDate &&
    checkIn <= lastCheckIn
      ? checkOutRange(checkIn)
      : undefined;

  return (
    <form action="/#stays" className="search-form">
      <label>
        Check-in
        <input
          type="date"
          name="checkIn"
          value={checkIn}
          onChange={(event) => setCheckIn(event.currentTarget.value)}
          min={minDate}
          max={lastCheckIn}
          required
        />
      </label>
      <label>
        Check-out
        <input
          type="date"
          name="checkOut"
          defaultValue={search.checkOut}
          min={checkoutRange?.first ?? minDate}
          max={checkoutRange?.last}
          aria-describedby="checkout-guidance"
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
      <p id="checkout-guidance" className="search-guidance" aria-live="polite">
        {checkoutRange
          ? `Check-out dates for your stay: ${formatDate(checkoutRange.first)} to ${formatDate(checkoutRange.last)}.`
          : "Choose a check-in date to see your check-out options."}
      </p>
    </form>
  );
}
