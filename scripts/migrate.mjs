import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";
const local = JSON.parse(readFileSync(".local/database.json", "utf8"));
for (const connectionString of [local.ownerUrl, local.testUrl]) {
  const db = new pg.Client({ connectionString });
  await db.connect();
  try {
    await db.query(
      "create table if not exists public.resort_migrations(name text primary key, applied_at timestamptz not null default now())",
    );
    for (const name of readdirSync("db/migrations")
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      if (
        (
          await db.query(
            "select 1 from public.resort_migrations where name=$1",
            [name],
          )
        ).rowCount
      )
        continue;
      await db.query("begin");
      try {
        await db.query(readFileSync(`db/migrations/${name}`, "utf8"));
        await db.query(
          "insert into public.resort_migrations(name) values($1)",
          [name],
        );
        await db.query("commit");
      } catch (e) {
        await db.query("rollback");
        throw e;
      }
    }
    // Password is locally generated hexadecimal; no user input or secret logging.
    if (!/^[a-f0-9]{64}$/.test(local.appPassword))
      throw new Error("Invalid local password format");
    await db.query(
      `alter role resort_app login password '${local.appPassword}'`,
    );
  } finally {
    await db.end();
  }
}
console.log("Development and isolated test migrations applied.");
