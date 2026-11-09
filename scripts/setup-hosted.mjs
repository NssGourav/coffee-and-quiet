// Explicit, one-time provisioning for a fresh synthetic review deployment.
// Owner/service credentials are never part of the application runtime.
import fs from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
const required = [
  "HOSTED_OWNER_DATABASE_URL",
  "DATABASE_SSL_CA",
  "HOSTED_APP_PASSWORD",
  "HOSTED_REVIEWER_PASSWORD",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
for (const name of required)
  if (!process.env[name]) throw new Error(`Missing ${name}`);
if (process.env.ALLOW_HOSTED_SETUP !== "1")
  throw new Error(
    "Set ALLOW_HOSTED_SETUP=1 for the intended new review project.",
  );
const url = new URL(process.env.HOSTED_OWNER_DATABASE_URL);
if (
  !url.hostname.endsWith(".pooler.supabase.com") ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL.endsWith(".supabase.co")
)
  throw new Error("Expected hosted Supabase endpoints.");
const appPassword = process.env.HOSTED_APP_PASSWORD;
if (!/^[a-f0-9]{64}$/.test(appPassword))
  throw new Error(
    "Application password must be a generated 32-byte hex value.",
  );
const db = new pg.Client({
  connectionString: url.toString(),
  ssl: { ca: process.env.DATABASE_SSL_CA, rejectUnauthorized: true },
  connectionTimeoutMillis: 15000,
});
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const accounts = [
  {
    email: "guest.a@resort.example",
    name: "Synthetic Guest A",
    role: "guest",
    gm: false,
  },
  {
    email: "guest.b@resort.example",
    name: "Synthetic Guest B",
    role: "guest",
    gm: false,
  },
  {
    email: "reservations@resort.example",
    name: "Synthetic Reservations",
    role: "staff",
    gm: false,
  },
  { email: "gm@resort.example", name: "Synthetic GM", role: "staff", gm: true },
];
await db.connect();
try {
  await db.query("create schema if not exists resort");
  await db.query(
    "create table if not exists resort.schema_migrations(name text primary key,applied_at timestamptz not null default now())",
  );
  for (const name of fs
    .readdirSync("db/migrations")
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    if (
      (
        await db.query("select 1 from resort.schema_migrations where name=$1", [
          name,
        ])
      ).rowCount
    )
      continue;
    await db.query("begin");
    try {
      await db.query(fs.readFileSync("db/migrations/" + name, "utf8"));
      await db.query("insert into resort.schema_migrations(name) values($1)", [
        name,
      ]);
      await db.query("commit");
      console.log("Applied", name);
    } catch (e) {
      await db.query("rollback");
      throw e;
    }
  }
  await db.query(`alter role resort_app login password '${appPassword}'`);
  await db.query("revoke all on resort.schema_migrations from resort_app");
  await db.query("grant connect on database postgres to resort_app");
  await db.query(fs.readFileSync("db/seed.sql", "utf8"));
  const existing = await admin.auth.admin.listUsers();
  if (existing.error) throw new Error("Could not list hosted review users.");
  for (const a of accounts) {
    const found = existing.data.users.find((u) => u.email === a.email);
    const result = found
      ? await admin.auth.admin.updateUserById(found.id, {
          password: process.env.HOSTED_REVIEWER_PASSWORD,
          email_confirm: true,
        })
      : await admin.auth.admin.createUser({
          email: a.email,
          password: process.env.HOSTED_REVIEWER_PASSWORD,
          email_confirm: true,
          user_metadata: { display_name: a.name },
        });
    if (result.error || !result.data.user)
      throw new Error("Could not provision synthetic reviewer.");
    a.id = result.data.user.id;
    await db.query(
      "insert into resort.profiles(id,display_name,role,is_gm) values($1,$2,$3,$4) on conflict(id) do update set display_name=excluded.display_name,role=excluded.role,is_gm=excluded.is_gm",
      [a.id, a.name, a.role, a.gm],
    );
  }
  const samples = [
    "Venue for my sister's wedding in Feb 2027, about 250 guests, 2 nights",
    "Is a villa free 14-16 Nov for 2 adults and a child?",
    "Team of 45 wants a January offsite with a conference hall.",
    "Synthetic complaint: my room was not clean and I need the manager to help.",
    "Hello, could you help me arrange something?",
  ];
  for (let i = 0; i < samples.length; i++)
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
  fs.mkdirSync(".local", { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    ".local/hosted-reviewer-accounts.json",
    JSON.stringify(
      { accounts, password: process.env.HOSTED_REVIEWER_PASSWORD },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    "Hosted migrations, synthetic inventory and reviewer accounts prepared; no credentials printed.",
  );
} finally {
  await db.end();
}
