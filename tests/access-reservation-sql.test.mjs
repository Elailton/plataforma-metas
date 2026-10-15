import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID, createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"

test("PostgreSQL: reserva atômica, ID único, limites por e-mail/IP e RPC privada", async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create table access_resend_requests(id bigint generated always as identity primary key,email_hash text not null,ip_hash text not null,outcome text not null,created_at timestamptz not null default now());
      alter table access_resend_requests enable row level security;
      grant select,insert on access_resend_requests to service_role;`)
    await db.exec(await readFile(new URL("../supabase/migrations/20261015192149_atomic_access_recovery.sql", import.meta.url), "utf8"))
    const hash = value => createHash("sha256").update(value).digest("hex")
    const reserve = async (email, ip, key = randomUUID()) => (await db.query("select reserve_access_resend($1,$2,$3) as result", [key, hash(email), hash(ip)])).rows[0].result
    const key = randomUUID()
    assert.equal((await reserve("a", "1", key)).accepted, true)
    assert.equal((await reserve("a", "1", key)).accepted, false)
    for (let i = 0; i < 2; i++) assert.equal((await reserve("a", String(i))).accepted, true)
    assert.equal((await reserve("a", "unlimited")).accepted, false)
    const concurrent = await Promise.all(Array.from({ length: 6 }, (_, i) => reserve("parallel", `ip-${i}`)))
    assert.equal(concurrent.filter(row => row.accepted).length, 3)
    for (let i = 0; i < 10; i++) assert.equal((await reserve(`email-${i}`, "shared-ip")).accepted, true)
    assert.equal((await reserve("different-email", "shared-ip")).accepted, false)
    await db.exec("set role anon")
    await assert.rejects(reserve("anon", "anon"), /permission denied/)
    await assert.rejects(db.query("select * from access_resend_requests"), /permission denied/)
    await db.exec("reset role; set role service_role")
    assert.equal((await reserve("service", "service")).accepted, true)
  } finally { await db.close() }
})
