import { readFileSync } from "node:fs";
import pg from "pg";
const local = JSON.parse(readFileSync(".local/database.json", "utf8"));
const db = new pg.Client({ connectionString: local.ownerUrl });
await db.connect();
try {
  await db.query(readFileSync("db/seed.sql", "utf8"));
} finally {
  await db.end();
}
console.log(
  "Synthetic room types and 121 days of rates seeded. Existing values preserved.",
);
