import assert from "node:assert/strict"
import { beforeEach, afterEach, test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { fixture, migrations, applyMigration, asRole } from "./helpers/database.mjs"
import { processHotmartEvent } from "../lib/hotmart/core.mjs"

const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`
const ADMIN = id(1), STUDENT = id(2), OTHER = id(3), COURSE = id(10), COURSE2 = id(11)
const SUBJECT = id(20), SUBJECT2 = id(21), TOPIC = id(30), TOPIC2 = id(31), MATERIAL = id(40), MATERIAL2 = id(41)
let db
const admin = (operation) => asRole(db, ADMIN, "authenticated", operation)
const student = (operation) => asRole(db, STUDENT, "authenticated", operation)
const service = (operation) => asRole(db, null, "service_role", operation)

beforeEach(async () => {
  db = new PGlite()
  await db.exec(fixture)
  for (const name of migrations) await applyMigration(db, name)
  await db.exec(`
    insert into auth.users(id,email) values ('${ADMIN}','admin@test.invalid'), ('${STUDENT}','student@test.invalid'), ('${OTHER}','other@test.invalid');
    update profiles set role='admin' where id='${ADMIN}';
    insert into courses values ('${COURSE}','Course A','published'), ('${COURSE2}','Course B','published');
    insert into subjects values ('${SUBJECT}','${COURSE}'), ('${SUBJECT2}','${COURSE2}');
    insert into syllabus_topics values ('${TOPIC}','${SUBJECT}'), ('${TOPIC2}','${SUBJECT2}');
    insert into materials values ('${MATERIAL}','${COURSE}'), ('${MATERIAL2}','${COURSE2}');
    insert into enrollments(user_id,course_id,status,source) values ('${STUDENT}','${COURSE}','active','manual');
  `)
})
afterEach(async () => { await db?.close() })

const item = (overrides = {}) => ({ subject_id: SUBJECT, topic_id: TOPIC, instructions: "Estudar",
  suggested_questions: 10, material_ids: [MATERIAL], ...overrides })
async function save(goalId = null, items = [item()], overrides = {}) {
  const version = goalId ? (await db.query("select updated_at::text as version from goals where id=$1", [goalId])).rows[0]?.version : null
  return (await admin(() => db.query("select admin_save_goal($1,$2,$3,$4,$5) as id", [goalId,
    overrides.courseId ?? COURSE, { title: "Meta", status: "published", ...overrides.goal }, items,
    overrides.version ?? version]))).rows[0].id
}
async function currentItems(goalId) {
  return (await db.query("select * from goal_items where goal_id=$1 and archived_at is null order by position", [goalId])).rows
}
async function completedGoal() {
  const goalId = await save(null, [item(), item({ instructions: "Revisar" })])
  const items = await currentItems(goalId)
  await student(() => db.query("insert into student_goal_item_completions(user_id,goal_item_id) values($1,$2)", [STUDENT, items[0].id]))
  return { goalId, items }
}

test("editar texto, prazo, materiais e ordem mantém IDs e conclusões exatas", async () => {
  const { goalId, items } = await completedGoal()
  const before = (await db.query("select * from student_goal_item_completions")).rows
  await save(goalId, [item({ id: items[1].id }), item({ id: items[0].id, instructions: "Texto corrigido", material_ids: [] })],
    { goal: { title: "Título corrigido", due_date: "2026-10-01" } })
  assert.deepEqual((await currentItems(goalId)).map((i) => i.id), [items[1].id, items[0].id])
  assert.deepEqual((await db.query("select * from student_goal_item_completions")).rows, before)
  assert.equal((await db.query("select title from goals where id=$1", [goalId])).rows[0].title, "Título corrigido")
})

test("remover item arquiva histórico; incluir item não herda conclusões", async () => {
  const { goalId, items } = await completedGoal()
  await save(goalId, [item({ id: items[1].id }), item()])
  assert.ok((await db.query("select archived_at from goal_items where id=$1", [items[0].id])).rows[0].archived_at)
  assert.equal((await db.query("select * from student_goal_item_completions")).rows.length, 1)
  assert.equal((await student(() => db.query("select id from goal_items where id=$1", [items[0].id]))).rows.length, 0)
  assert.equal((await student(() => db.query("select * from goal_item_materials where goal_item_id=$1", [items[0].id]))).rows.length, 0)
  await assert.rejects(student(() => db.query("insert into student_goal_item_completions(user_id,goal_item_id) values($1,$2)", [STUDENT, items[0].id])), /row-level security/)
  assert.equal((await student(() => db.query("delete from student_goal_item_completions where goal_item_id=$1 returning id", [items[0].id]))).rows.length, 0)
})

test("trocar tópico cria nova identidade e não atribui progresso ao novo tópico", async () => {
  const { goalId, items } = await completedGoal()
  await db.query("insert into syllabus_topics values($1,$2)", [id(32), SUBJECT])
  await save(goalId, [item({ id: items[0].id, topic_id: id(32) }), item({ id: items[1].id })])
  const next = (await currentItems(goalId))[0]
  assert.notEqual(next.id, items[0].id)
  assert.equal(next.topic_id, id(32))
  assert.equal((await db.query("select goal_item_id from student_goal_item_completions")).rows[0].goal_item_id, items[0].id)
})

test("falha no último material desfaz título, novos itens, links e arquivamento", async () => {
  const { goalId, items } = await completedGoal()
  const before = (await db.query("select * from goal_items order by id")).rows
  const goalBefore = (await db.query("select * from goals")).rows
  await assert.rejects(save(goalId, [item({ id: items[0].id }), item({ material_ids: [MATERIAL2] })], { goal: { title: "Não salvar" } }), /material/)
  assert.deepEqual((await db.query("select * from goal_items order by id")).rows, before)
  assert.deepEqual((await db.query("select * from goals")).rows, goalBefore)
  assert.equal((await db.query("select * from student_goal_item_completions")).rows.length, 1)
})

test("IDs adulterados, item duplicado e versão antiga são rejeitados atomicamente", async () => {
  const { goalId, items } = await completedGoal()
  const another = await save()
  const foreignItem = (await currentItems(another))[0].id
  await assert.rejects(save(goalId, [item({ id: foreignItem })]), /não pertence/)
  await assert.rejects(save(goalId, [item({ id: items[0].id }), item({ id: items[0].id })]), /repetido/)
  await assert.rejects(save(goalId, [item({ subject_id: SUBJECT2 })]), /disciplina/)
  await assert.rejects(save(goalId, [item({ topic_id: TOPIC2 })]), /tópico/)
  await assert.rejects(save(goalId, [item()], { courseId: COURSE2 }), /neste curso/)
  await assert.rejects(save(goalId, [item()], { version: "2000-01-01T00:00:00Z" }), /Recarregue/)
  assert.equal((await currentItems(goalId)).length, 2)
})

test("aluno/anon não usam RPC e exclusão antiga não apaga progresso", async () => {
  const { goalId, items } = await completedGoal()
  await assert.rejects(student(() => db.query("select admin_save_goal(null,$1,$2,$3,null)", [COURSE, { title: "Ataque", status: "published" }, [item()]])), /administradores/)
  await assert.rejects(asRole(db, null, "anon", () => db.query("select admin_save_goal(null,$1,'{}','[]',null)", [COURSE])), /permission denied/)
  await assert.rejects(admin(() => db.query("delete from goal_items where id=$1", [items[0].id])), /foreign key/)
  await assert.rejects(admin(() => db.query("delete from goals where id=$1", [goalId])), /foreign key/)
  assert.equal((await db.query("select * from student_goal_item_completions")).rows.length, 1)
})

test("RLS oculta meta rascunho/arquivada, itens e links; admin continua vendo", async () => {
  const { goalId, items } = await completedGoal()
  for (const status of ["draft", "archived"]) {
    await db.query("update goals set status=$1 where id=$2", [status, goalId])
    for (const table of ["goals", "goal_items", "goal_item_materials"]) {
      assert.equal((await student(() => db.query(`select * from ${table}`))).rows.length, 0, table)
      assert.ok((await admin(() => db.query(`select * from ${table}`))).rows.length > 0, table)
    }
    await assert.rejects(student(() => db.query("insert into student_goal_item_completions(user_id,goal_item_id) values($1,$2)", [STUDENT, items[1].id])), /row-level security/)
  }
  await db.query("update goals set status='published' where id=$1", [goalId])
  assert.equal((await student(() => db.query("select * from goal_items"))).rows.length, 2)
  assert.equal((await student(() => db.query("select * from student_goal_item_completions"))).rows.length, 1)
})

test("RLS oculta todo conteúdo de curso não publicado e de outro curso", async () => {
  await completedGoal()
  for (const status of ["draft", "archived"]) {
    await db.query("update courses set status=$1 where id=$2", [status, COURSE])
    for (const table of ["courses", "subjects", "syllabus_topics", "materials", "goals", "goal_items", "goal_item_materials"]) {
      assert.equal((await student(() => db.query(`select * from ${table}`))).rows.length, 0, table)
    }
    assert.equal((await student(() => db.query("select has_active_enrollment($1) as allowed", [COURSE]))).rows[0].allowed, false)
  }
  await db.query("update courses set status='published' where id=$1", [COURSE])
  assert.equal((await student(() => db.query("select * from courses"))).rows.length, 1)
  assert.equal((await student(() => db.query("select * from student_goal_item_completions where user_id=$1", [OTHER]))).rows.length, 0)
})

async function commercial(status, time, user = null, transaction = "HP-pending", course = COURSE, product = "product") {
  return (await service(() => db.query("select * from apply_hotmart_entitlement_event($1,$2,$3,$4,null,'buyer',$5,$6,$7)",
    [transaction, user, course, product, status, `event-${time}`, new Date(1700000000000 + time * 1000).toISOString()]))).rows[0]
}

test("SQL: refund sem conta persiste; aprovação antiga/igual não concede acesso", async () => {
  assert.equal((await commercial("revoked", 3)).enrollment_status, null)
  for (const time of [1, 3]) {
    const result = await commercial("active", time, OTHER)
    assert.equal(result.event_applied, false)
    assert.equal(result.entitlement_status, "revoked")
    assert.equal(result.enrollment_status, null)
  }
  assert.equal((await db.query("select * from enrollments where user_id=$1", [OTHER])).rows.length, 0)
  assert.equal((await commercial("active", 4, OTHER)).enrollment_status, "active")
  assert.equal((await db.query("select * from hotmart_entitlements")).rows.length, 1)
})

test("SQL: refund que consultou conta antes da criação reconcilia aprovação concorrente", async () => {
  await commercial("active", 1, OTHER)
  assert.equal((await commercial("revoked", 2, null)).enrollment_status, "revoked")
  const entitlement = (await db.query("select * from hotmart_entitlements")).rows[0]
  assert.equal(entitlement.user_id, OTHER)
  assert.equal(entitlement.status, "revoked")
  await assert.rejects(commercial("active", 3, STUDENT), /identity conflict/)
  await assert.rejects(commercial("revoked", 3, OTHER, "HP-pending", COURSE2), /identity conflict/)
})

test("SQL: pending é privado e nunca pode ficar ativo sem perfil; admin não é matriculado", async () => {
  await commercial("revoked", 2)
  assert.equal((await student(() => db.query("select * from hotmart_entitlements"))).rows.length, 0)
  await assert.rejects(student(() => db.exec("update hotmart_entitlements set status='active'")), /permission denied/)
  await assert.rejects(student(() => db.exec("select apply_hotmart_entitlement_event('X',null,null,'p',null,null,'revoked','e',now())")), /permission denied/)
  await assert.rejects(commercial("active", 3), /require a student/)
  await assert.rejects(commercial("active", 3, ADMIN), /require a student/)
  await assert.rejects(db.exec("update hotmart_entitlements set status='active'"), /hotmart_pending_not_active/)
})

test("as duas migrations preservam contas, conteúdo, matrículas, direitos, bloqueios e progresso", async () => {
  await db.close()
  db = new PGlite()
  await db.exec(fixture)
  for (const name of migrations.slice(0, 4)) await applyMigration(db, name)
  await db.exec(`
    insert into auth.users(id,email) values ('${ADMIN}','admin@test.invalid'), ('${STUDENT}','student@test.invalid');
    update profiles set role='admin' where id='${ADMIN}';
    insert into courses values ('${COURSE}','Curso existente','published');
    insert into subjects values ('${SUBJECT}','${COURSE}');
    insert into materials values ('${MATERIAL}','${COURSE}');
    insert into goals(id,course_id,title,status) values ('${id(50)}','${COURSE}','Meta existente','published');
    insert into goal_items(id,goal_id,subject_id) values ('${id(60)}','${id(50)}','${SUBJECT}');
    insert into goal_item_materials(goal_item_id,material_id) values ('${id(60)}','${MATERIAL}');
    insert into student_goal_item_completions(user_id,goal_item_id) values ('${STUDENT}','${id(60)}');
  `)
  await commercial("active", 1, STUDENT)
  await admin(() => db.query("select admin_enroll_existing_student('student@test.invalid',$1)", [COURSE]))
  const enrollmentId = (await db.query("select id from enrollments")).rows[0].id
  await admin(() => db.query("select admin_set_course_access_block($1,$2,true,'Análise em curso')", [enrollmentId, COURSE]))
  const tables = ["auth.users", "profiles", "courses", "subjects", "materials", "goals", "goal_items", "goal_item_materials",
    "student_goal_item_completions", "enrollments", "manual_course_grants", "hotmart_entitlements", "course_access_blocks"]
  const before = {}
  for (const table of tables) before[table] = (await db.query(`select * from ${table}`)).rows
  for (const name of migrations.slice(4)) await applyMigration(db, name)
  for (const table of tables) {
    const after = (await db.query(`select * from ${table}`)).rows
    if (table === "goal_items") for (const row of after) { assert.equal(row.archived_at, null); delete row.archived_at }
    assert.deepEqual(after, before[table], table)
  }
})

test("núcleo real + SQL: reembolso anterior à conta, aprovação antiga e posterior válida", async () => {
  let invited = 0, userId = null
  const repository = {
    async claimEvent() { return { claimed: true, status: "processing" } },
    async finishEvent() {}, async failEvent() {},
    async findProductMapping() { return { courseId: COURSE, active: true } },
    async findUserByEmail() { return userId },
    async getProfileRole() { return "student" }, async ensureStudentProfile() { return "student" },
    async inviteStudent() { invited++; userId = OTHER; return OTHER },
    async findEntitlement(transaction) {
      const row = (await db.query("select *, last_event_creation_date::text as time from hotmart_entitlements where transaction=$1", [transaction])).rows[0]
      return row ? { userId: row.user_id, courseId: row.course_id, productUcode: row.product_ucode, status: row.status, eventCreationDate: row.time } : null
    },
    async applyEntitlementEvent(input) {
      const row = (await service(() => db.query("select * from apply_hotmart_entitlement_event($1,$2,$3,$4,null,null,$5,$6,$7)",
        [input.transaction, input.userId, input.courseId, input.productUcode, input.status, input.eventId, input.eventCreationDate]))).rows[0]
      return { applied: row.event_applied, entitlementStatus: row.entitlement_status, enrollmentStatus: row.enrollment_status }
    },
  }
  const event = (type, time) => ({ id: `${type}-${time}`, event: type, version: "2.0.0", creation_date: 1700000000000 + time * 1000,
    data: { product: { ucode: "product" }, purchase: { transaction: "HP-integrated" }, buyer: { email: "other@test.invalid" } } })
  await processHotmartEvent(event("PURCHASE_REFUNDED", 2), repository)
  assert.equal((await processHotmartEvent(event("PURCHASE_APPROVED", 1), repository)).outcome, "ignored")
  assert.equal(invited, 0)
  assert.equal((await processHotmartEvent(event("PURCHASE_APPROVED", 3), repository)).enrollmentStatus, "active")
  assert.equal(invited, 1)
})
