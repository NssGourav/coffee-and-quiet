import "server-only";
import pg from "pg";
pg.types.setTypeParser(1082, (value) => value);
const globalDb = globalThis as unknown as { resortPool?: pg.Pool };
function pool() {
  if (!process.env.DATABASE_URL)
    throw new Error("Application database is not configured");
  if (process.env.VERCEL && !process.env.DATABASE_SSL_CA)
    throw new Error("Hosted database requires certificate verification");
  return (globalDb.resortPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.VERCEL ? 1 : 10,
    ...(process.env.DATABASE_SSL_CA
      ? { ssl: { ca: process.env.DATABASE_SSL_CA, rejectUnauthorized: true } }
      : {}),
    connectionTimeoutMillis: 4000,
    statement_timeout: 10000,
  }));
}
export async function withDb<T>(
  actorId: string | null,
  fn: (db: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const db = await pool().connect();
  try {
    await db.query("begin isolation level read committed");
    const {
      rows: [role],
    } = await db.query(
      "select current_user, rolsuper, rolbypassrls from pg_roles where rolname=current_user",
    );
    if (
      role.current_user !== "resort_app" ||
      role.rolsuper ||
      role.rolbypassrls
    )
      throw new Error("Database requires the restricted application role");
    await db.query("select set_config('app.user_id',$1,true)", [actorId ?? ""]);
    const result = await fn(db);
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}
