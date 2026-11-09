"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const labels = {
  room: "Room booking",
  wedding: "Wedding",
  offsite: "Company offsite",
  complaint: "Complaint",
  unsorted: "Unsorted",
};
async function post(url: string, data: object) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || "Please try again.");
  return body;
}
export function EnquiryForm() {
  const [message, setMessage] = useState(""),
    [complaint, setComplaint] = useState(false),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <form
      className="panel stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setResult("");
        try {
          await post("/api/enquiries", { message, complaint });
          setSaved(true);
          setResult(
            "Your enquiry is saved. Our team will review it. No booking has been made.",
          );
        } catch (e) {
          setResult((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Your enquiry
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          minLength={8}
          maxLength={3000}
          required
          placeholder="Tell us about your stay, wedding or team gathering. Include dates and guest counts if you know them."
          disabled={saved}
        />
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={complaint}
          onChange={(e) => setComplaint(e.target.checked)}
          disabled={saved}
        />
        This is a complaint — alert the manager
      </label>
      <p className="small muted">
        Please do not include passport, payment or sensitive personal
        information.
      </p>
      <button className="button" disabled={busy || saved}>
        {busy ? "Saving…" : saved ? "Enquiry saved" : "Send enquiry"}
      </button>
      {result && (
        <p role="status" className="notice">
          {result}
        </p>
      )}
    </form>
  );
}
type Enquiry = {
  original_message: string;
  id: string;
  message: string;
  category: keyof typeof labels;
  gm_alert: boolean;
  version: number;
  draft: string;
  status: string;
  note: string;
  extraction: Record<string, unknown>;
};
export function EnquiryEditor({ enquiry: e }: { enquiry: Enquiry }) {
  const router = useRouter();
  const [message, setMessage] = useState(e.message),
    [category, setCategory] = useState(e.category),
    [draft, setDraft] = useState(e.draft),
    [complaint, setComplaint] = useState(e.gm_alert),
    [busy, setBusy] = useState(""),
    [notice, setNotice] = useState(""),
    [approved, setApproved] = useState(false);
  async function act(action: string) {
    setBusy(action);
    setNotice("");
    try {
      const r = await post(`/api/staff/enquiries/${e.id}`, {
        action,
        version: e.version,
        ...(action === "save"
          ? { message, category, complaint }
          : action === "send"
            ? { draft }
            : {}),
      });
      setNotice(
        r.manual
          ? "AI could not complete this request. Your enquiry is safe; review manually or retry."
          : "Saved.",
      );
      router.refresh();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy("");
    }
  }
  const dirty =
    message !== e.message ||
    category !== e.category ||
    complaint !== e.gm_alert;
  return (
    <div className="enquiry-columns">
      <section className="panel stack">
        <p className="eyebrow">ENQUIRY DETAILS</p>
        {e.original_message !== message && (
          <div className="notice">
            <strong>Originally submitted</strong>
            <p>{e.original_message}</p>
          </div>
        )}
        <label>
          Guest message
          <textarea
            aria-label="Guest message"
            rows={7}
            value={message}
            maxLength={3000}
            onChange={(v) => setMessage(v.target.value)}
            disabled={e.status === "sent" || !!busy}
          />
        </label>
        <label>
          Route to
          <select
            value={category}
            onChange={(v) => setCategory(v.target.value as typeof category)}
            disabled={e.status === "sent" || !!busy}
          >
            {Object.entries(labels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={complaint}
            disabled={e.gm_alert || e.status === "sent" || !!busy}
            onChange={(v) => setComplaint(v.target.checked)}
          />
          Alert GM about a complaint
        </label>
        {e.status !== "sent" && (
          <button
            className="button secondary"
            disabled={!!busy || !dirty}
            onClick={() => act("save")}
          >
            Save correction & routing
          </button>
        )}
        <div className="divider" />
        <h2>Extracted details</h2>
        {["dates", "guests", "budget", "evidence"].map((k) => (
          <p key={k}>
            <strong>{k[0].toUpperCase() + k.slice(1)}:</strong>{" "}
            {typeof e.extraction[k] === "string" && e.extraction[k]
              ? String(e.extraction[k])
              : "Not provided / needs review"}
          </p>
        ))}
        <p className="small muted">
          Dates remain exactly as written. A missing year or day needs
          clarification.
        </p>
      </section>
      <section className="panel stack">
        <p className="eyebrow">STAFF REVIEW</p>
        <h2>{e.status === "sent" ? "Saved reply" : "A thoughtful reply."}</h2>
        {e.note && <p className="notice">{e.note}</p>}
        {e.status !== "sent" && (
          <button
            className="button secondary"
            disabled={!!busy || dirty}
            onClick={() => act("analyse")}
          >
            {busy === "analyse"
              ? "Reading & drafting locally…"
              : "Classify & draft with AI"}
          </button>
        )}
        {e.status !== "sent" && (
          <QuoteHelper
            onAdd={(text) => {
              setDraft((d) => d + "\n\n" + text);
              setApproved(false);
            }}
          />
        )}
        <label>
          Reply
          <textarea
            aria-label="Reply"
            rows={12}
            maxLength={5000}
            value={draft}
            onChange={(v) => {
              setDraft(v.target.value);
              setApproved(false);
            }}
            disabled={e.status === "sent" || !!busy}
          />
        </label>
        {e.status !== "sent" && (
          <>
            <p className="small muted">
              AI drafts ask for clarification. Check rates and availability in
              the staff desk before adding any quote. Sending is simulated.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={approved}
                onChange={(v) => setApproved(v.target.checked)}
              />
              I reviewed the reply and checked its facts
            </label>
            <button
              className="button"
              disabled={
                !!busy || dirty || !approved || draft.trim().length < 10
              }
              onClick={() => act("send")}
            >
              {busy === "send" ? "Saving…" : "Approve & simulate send"}
            </button>
          </>
        )}
        {busy === "analyse" && (
          <p role="status">
            Local processing may take a few minutes. Your enquiry is already
            saved.
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
      </section>
    </div>
  );
}

function QuoteHelper({ onAdd }: { onAdd: (text: string) => void }) {
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState("");
  return (
    <details>
      <summary>Check an accommodation quote</summary>
      <p className="small muted">
        Enter dates confirmed by the guest, including the year. Event and
        wedding packages need a staff quote.
      </p>
      <form
        className="stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setResult("");
          const data = Object.fromEntries(new FormData(event.currentTarget));
          try {
            const r = await post("/api/staff/quote", data);
            setResult(r.text);
          } catch (e) {
            setResult((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Room type
          <select name="roomType">
            <option value="estate-room">Estate Room</option>
            <option value="terrace-room">Terrace Room</option>
            <option value="garden-villa">Garden Villa</option>
          </select>
        </label>
        <label>
          Confirmed check-in
          <input type="date" name="checkIn" required />
        </label>
        <label>
          Confirmed check-out
          <input type="date" name="checkOut" required />
        </label>
        <label>
          Adults
          <input
            type="number"
            name="adults"
            min={1}
            max={4}
            defaultValue={2}
            required
          />
        </label>
        <label>
          Children
          <input
            type="number"
            name="children"
            min={0}
            max={3}
            defaultValue={0}
            required
          />
        </label>
        <button className="button secondary" disabled={busy}>
          {busy ? "Checking rates…" : "Calculate from rate table"}
        </button>
      </form>
      {result && (
        <p
          className="notice"
          role="status"
          style={{ whiteSpace: "pre-line", marginTop: 16 }}
        >
          {result}
        </p>
      )}
      {result.includes("Checked ") ||
      result.includes("is unavailable for the complete stay") ? (
        <button className="button secondary" onClick={() => onAdd(result)}>
          Add checked result to reply
        </button>
      ) : null}
    </details>
  );
}
