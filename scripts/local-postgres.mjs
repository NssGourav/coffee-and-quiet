import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import pg from "pg";

// Dedicated, ignored cluster. Never touch the user's existing PostgreSQL databases.
const root = resolve(".local");
const data = resolve(root, "postgres");
const port = 55439;
const run = (bin, args) => {
  const r = spawnSync(bin, args, { stdio: "pipe", encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${bin} failed: ${r.stderr || r.stdout}`);
};
mkdirSync(root, { recursive: true, mode: 0o700 });
if (process.argv[2] === "stop") {
  run("pg_ctl", ["-D", data, "stop", "-m", "fast"]);
  console.log("Assessment PostgreSQL stopped.");
  process.exit(0);
}
if (!existsSync(resolve(data, "PG_VERSION"))) {
  const password = randomBytes(32).toString("hex");
  writeFileSync(resolve(root, "pg-password"), password, { mode: 0o600 });
  run("initdb", [
    "-D",
    data,
    "-U",
    "resort_owner",
    "--auth=scram-sha-256",
    `--pwfile=${resolve(root, "pg-password")}`,
  ]);
}
if (spawnSync("pg_ctl", ["-D", data, "status"], { stdio: "pipe" }).status !== 0)
  run("pg_ctl", [
    "-D",
    data,
    "-l",
    resolve(root, "postgres.log"),
    "-o",
    `-h 127.0.0.1 -p ${port} -c unix_socket_directories=''`,
    "start",
  ]);
const password = readFileSync(resolve(root, "pg-password"), "utf8").trim();
const ownerUrl = `postgresql://resort_owner:${password}@127.0.0.1:${port}/postgres`;
const client = new pg.Client({ connectionString: ownerUrl });
await client.connect();
for (const name of ["resort_dev", "resort_test"]) {
  if (
    !(await client.query("select 1 from pg_database where datname=$1", [name]))
      .rowCount
  )
    await client.query(`create database ${name}`);
}
await client.end();
const config = {
  ownerUrl: ownerUrl.replace("/postgres", "/resort_dev"),
  testUrl: ownerUrl.replace("/postgres", "/resort_test"),
  appPassword: randomBytes(32).toString("hex"),
};
if (!existsSync(resolve(root, "database.json")))
  writeFileSync(resolve(root, "database.json"), JSON.stringify(config), {
    mode: 0o600,
  });
const saved = JSON.parse(readFileSync(resolve(root, "database.json"), "utf8"));
if (!existsSync(".env.local"))
  writeFileSync(
    ".env.local",
    `DATABASE_URL=postgresql://resort_app:${saved.appPassword}@127.0.0.1:${port}/resort_dev\nTEST_DATABASE_URL=${saved.testUrl}\nAPP_ORIGIN=http://127.0.0.1:3000\n`,
    { mode: 0o600 },
  );
console.log(
  "Dedicated PostgreSQL ready on 127.0.0.1:55439; local configuration saved without printing credentials.",
);
