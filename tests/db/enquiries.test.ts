import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";
const config = JSON.parse(readFileSync(".local/database.json", "utf8"));
const owner = new pg.Pool({ connectionString: config.testUrl });
const app = new pg.Pool({
  connectionString: config.testUrl.replace(
    /resort_owner:[^@]+@/,
    `resort_app:${config.appPassword}@`,
  ),
});
const staff = randomUUID(),
  guest = randomUUID(),
  other = randomUUID();
async function actor(id: string, fn: (db: pg.PoolClient) => Promise<unknown>) {
  const db = await app.connect();
  try {
    await db.query("begin");
    await db.query("select set_config('app.user_id',$1,true)", [id]);
    const r = await fn(db);
    await db.query("commit");
    return r;
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    db.release();
  }
}
before(async () => {
  assert.equal(
    (await owner.query("select current_database() name")).rows[0].name,
    "resort_test",
  );
  for (const [id, role] of [
    [staff, "staff"],
    [guest, "guest"],
    [other, "guest"],
  ])
    await owner.query(
      "insert into resort.profiles(id,display_name,role) values($1,'Synthetic enquiry test',$2)",
      [id, role],
    );
});
after(async () => {
  await owner.query(
    "delete from resort.enquiry_audit where enquiry_id in(select id from resort.enquiries where guest_id=$1)",
    [guest],
  );
  await owner.query("delete from resort.enquiries where guest_id=$1", [guest]);
  await owner.query("delete from resort.profiles where id=any($1::uuid[])", [
    [staff, guest, other],
  ]);
  await owner.end();
  await app.end();
});
async function create() {
  return (await actor(
    guest,
    async (db) =>
      (
        await db.query(
          "select resort.create_enquiry('A synthetic wedding enquiry for next year',false) id",
        )
      ).rows[0].id,
  )) as string;
}
async function change(
  id: string,
  version: number,
  action: string,
  data: object,
) {
  return actor(staff, (db) =>
    db.query("select resort.change_enquiry($1,$2,$3,$4)", [
      id,
      version,
      action,
      JSON.stringify(data),
    ]),
  );
}
test("enquiry rows are isolated across guests and deny direct writes", async () => {
  const id = await create();
  await actor(other, async (db) =>
    assert.equal(
      (await db.query("select * from resort.enquiries where id=$1", [id]))
        .rowCount,
      0,
    ),
  );
  await assert.rejects(() =>
    actor(guest, (db) =>
      db.query("update resort.enquiries set draft='forged' where id=$1", [id]),
    ),
  );
});
test("competing edit and AI result cannot both overwrite the same revision", async () => {
  const id = await create();
  const results = await Promise.allSettled([
    change(id, 1, "save", {
      message: "Corrected synthetic enquiry details",
      category: "offsite",
    }),
    change(id, 1, "ai", {
      category: "wedding",
      draft: "Synthetic test draft",
      extraction: {},
      note: "Stubbed database race test, not real AI",
    }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    (
      await owner.query("select version from resort.enquiries where id=$1", [
        id,
      ])
    ).rows[0].version,
    2,
  );
});
test("failure preserves explicit complaint alert and allows manual review", async () => {
  const id = await create();
  await change(id, 1, "save", {
    message: "Synthetic complaint for the manager",
    category: "complaint",
    complaint: true,
  });
  await change(id, 2, "failure", {});
  const row = (
    await owner.query("select * from resort.enquiries where id=$1", [id])
  ).rows[0];
  assert.equal(
    row.original_message,
    "A synthetic wedding enquiry for next year",
  );
  assert.equal(row.gm_alert, true);
  assert.equal(row.category, "complaint");
  assert.equal(row.owner, "GM");
  assert.equal(row.status, "manual");
});
test("duplicate send race saves one immutable reply and one send audit", async () => {
  const id = await create();
  const result = await Promise.allSettled([
    change(id, 1, "send", { draft: "Reviewed synthetic reply one." }),
    change(id, 1, "send", { draft: "Reviewed synthetic reply two." }),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    (
      await owner.query(
        "select count(*)::int n from resort.enquiry_audit where enquiry_id=$1 and action='send'",
        [id],
      )
    ).rows[0].n,
    1,
  );
  await assert.rejects(() =>
    change(id, 2, "save", {
      message: "Cannot rewrite a sent enquiry",
      category: "room",
    }),
  );
});
