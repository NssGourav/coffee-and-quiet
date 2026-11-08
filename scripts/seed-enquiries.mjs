import { readFileSync } from "node:fs";
import pg from "pg";
const config = JSON.parse(readFileSync(".local/database.json", "utf8"));
const { accounts } = JSON.parse(
  readFileSync(".local/reviewer-accounts.json", "utf8"),
);
const db = new pg.Client({ connectionString: config.ownerUrl });
await db.connect();
try {
  const samples = [
    "Venue for my sister's wedding in Feb 2027, about 250 guests, 2 nights",
    "Is a villa free 14-16 Nov for 2 adults and a child?",
    "Team of 45 wants a January offsite with a conference hall.",
    "Synthetic complaint: my room was not clean and I need the manager to help.",
    "Hello, could you help me arrange something?",
  ];
  for (let i = 0; i < samples.length; i++) {
    await db.query(
      "insert into resort.enquiries(id,guest_id,message,original_message,gm_alert,category,owner) values($1,$2,$3,$3,$4,$5,$6) on conflict(id) do nothing",
      [
        `10000000-0000-4000-8000-00000000000${i + 1}`,
        accounts[0].id,
        samples[i],
        i === 3,
        i === 3 ? "complaint" : "unsorted",
        i === 3 ? "GM" : "GM · review",
      ],
    );
  }
  console.log(
    "Five synthetic enquiries seeded; existing staff work preserved.",
  );
} finally {
  await db.end();
}
