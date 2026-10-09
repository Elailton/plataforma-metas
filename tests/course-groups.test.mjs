import { test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { PGlite } from "@electric-sql/pglite"
import {
  fixture,
  migrations,
  applyMigration,
  asRole,
} from "./helpers/database.mjs"
import {
  normalizeSubmission,
  groupFromAvailability,
} from "../lib/groups/questionnaire.mjs"
const A = "00000000-0000-4000-8000-000000000001",
  S = "00000000-0000-4000-8000-000000000002",
  O = "00000000-0000-4000-8000-000000000003",
  C = "00000000-0000-4000-8000-000000000010",
  C2 = "00000000-0000-4000-8000-000000000011",
  G1 = "00000000-0000-4000-8000-000000000020",
  G2 = "00000000-0000-4000-8000-000000000021",
  GB = "00000000-0000-4000-8000-000000000022",
  ID = "00000000-0000-4000-8000-000000000030"
let db, enrollment
const admin = (op) => asRole(db, A, "authenticated", op),
  student = (op) => asRole(db, S, "authenticated", op)
function payload(code = "de_2_a_3h") {
  return {
    answers: Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [
        `q${String(i + 1).padStart(2, "0")}`,
        i === 0 ? code : "answer",
      ]),
    ),
    labels: Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [
        `q${String(i + 1).padStart(2, "0")}`,
        "Resposta",
      ]),
    ),
  }
}
beforeEach(async () => {
  db = new PGlite()
  await db.exec(fixture)
  for (const m of migrations) await applyMigration(db, m)
  await applyMigration(db, "20260912000100_goal_release_guard.sql")
  await db.exec(
    "alter table courses add column updated_at timestamptz default now()",
  )
  await applyMigration(db, "20261009000100_course_groups.sql")
  await db.exec(
    `insert into auth.users(id,email) values ('${A}','admin@test.invalid'),('${S}','student@test.invalid'),('${O}','other@test.invalid');update profiles set role='admin' where id='${A}';insert into courses(id,name,status) values ('${C}','A','published'),('${C2}','B','published');insert into goals(id,course_id,status,target_groups) values('${G1}','${C}','published',array[1]::smallint[]),('${G2}','${C}','published',array[2]::smallint[]),('${GB}','${C}','published',array[1,2]::smallint[]);insert into goal_items(id,goal_id) values('${G1}','${G1}'),('${G2}','${G2}'),('${GB}','${GB}');`,
  )
  await admin(() =>
    db.query("select admin_enroll_existing_student($1,$2)", [
      "student@test.invalid",
      C,
    ]),
  )
  enrollment = (
    await db.query(
      "select id from enrollments where user_id=$1 and course_id=$2",
      [S, C],
    )
  ).rows[0].id
})
afterEach(async () => db?.close())
async function enable() {
  await admin(() =>
    db.query("select admin_set_course_groups($1,true,'[]')", [C]),
  )
}
async function assign(group) {
  await admin(() =>
    db.query("select admin_set_enrollment_group($1,$2,$3::smallint)", [
      enrollment,
      C,
      group,
    ]),
  )
}
async function visible() {
  return (
    await student(() => db.query("select id from goals order by id"))
  ).rows.map((r) => r.id)
}
test("group activation is opt-in; unassigned sees no goals, items or links", async () => {
  assert.deepEqual(await visible(), [G1, G2, GB])
  await enable()
  assert.deepEqual(await visible(), [])
  assert.equal(
    (await student(() => db.query("select * from goal_items"))).rows.length,
    0,
  )
})
test("exclusive and shared goals are enforced for direct links and completion writes", async () => {
  await enable()
  await assign(1)
  assert.deepEqual(await visible(), [G1, GB])
  assert.equal(
    (
      await student(() =>
        db.query("select id from goal_items where id=$1", [G2]),
      )
    ).rows.length,
    0,
  )
  await assert.rejects(
    student(() =>
      db.query(
        "insert into student_goal_item_completions(user_id,goal_item_id) values($1,$2)",
        [S, G2],
      ),
    ),
  )
  await student(() =>
    db.query(
      "insert into student_goal_item_completions(user_id,goal_item_id) values($1,$2)",
      [S, G1],
    ),
  )
  await assign(2)
  assert.deepEqual(await visible(), [G2, GB])
  assert.equal(
    (await db.query("select * from student_goal_item_completions")).rows.length,
    1,
  )
  await assign(null)
  assert.deepEqual(await visible(), [])
})
test("students cannot choose group, enable grouping or import another student's submission", async () => {
  await enable()
  await assert.rejects(
    student(() =>
      db.query("select admin_set_enrollment_group($1,$2,2::smallint)", [
        enrollment,
        C,
      ]),
    ),
  )
  await assert.rejects(
    student(() =>
      db.query("select admin_set_course_groups($1,false,'[]')", [C]),
    ),
  )
  await student(() =>
    db.query("update enrollments set study_group=2 where id=$1", [enrollment]),
  )
  assert.equal(
    (
      await db.query("select study_group from enrollments where id=$1", [
        enrollment,
      ])
    ).rows[0].study_group,
    null,
  )
  await assert.rejects(
    asRole(db, O, "authenticated", () =>
      db.query("select save_course_questionnaire($1,$2,$3)", [
        enrollment,
        ID,
        payload(),
      ]),
    ),
  )
})
test("first questionnaire defines group, is idempotent and cannot be changed by student", async () => {
  await enable()
  await student(() =>
    db.query("select save_course_questionnaire($1,$2,$3)", [
      enrollment,
      ID,
      payload(),
    ]),
  )
  assert.deepEqual(await visible(), [G1, GB])
  await student(() =>
    db.query("select save_course_questionnaire($1,$2,$3)", [
      enrollment,
      ID,
      payload(),
    ]),
  )
  assert.equal(
    (await db.query("select * from course_questionnaire_submissions")).rows
      .length,
    1,
  )
  await assert.rejects(
    student(() =>
      db.query("select save_course_questionnaire($1,gen_random_uuid(),$2)", [
        enrollment,
        payload("mais_6h"),
      ]),
    ),
  )
  assert.equal(
    (
      await student(() =>
        db.query("select * from course_questionnaire_submissions"),
      )
    ).rows.length,
    0,
  )
})
test("admin reassignment wins over later imports including unassigned", async () => {
  await enable()
  await assign(2)
  await admin(() =>
    db.query("select save_course_questionnaire($1,$2,$3)", [
      enrollment,
      ID,
      payload(),
    ]),
  )
  assert.deepEqual(await visible(), [G2, GB])
  await assign(null)
  await admin(() =>
    db.query("select save_course_questionnaire($1,gen_random_uuid(),$2)", [
      enrollment,
      payload("mais_6h"),
    ]),
  )
  assert.deepEqual(await visible(), [])
})
test("groups never bypass blocks, unpublished courses or affect another course", async () => {
  await enable()
  await assign(1)
  await admin(() =>
    db.query("select admin_enroll_existing_student($1,$2)", [
      "student@test.invalid",
      C2,
    ]),
  )
  await db.query(
    "insert into goals(id,course_id,status) values($1,$1,'published')",
    [C2],
  )
  await admin(() =>
    db.query(
      "select admin_set_course_access_block($1,$2,true,'Bloqueio de teste')",
      [enrollment, C],
    ),
  )
  assert.deepEqual(await visible(), [C2])
})
test("atomic goal save stores targets and rolls back invalid groups", async () => {
  const subject = "00000000-0000-4000-8000-000000000040"
  await db.query("insert into subjects(id,course_id) values($1,$2)", [
    subject,
    C,
  ])
  const goal = { title: "Meta", status: "draft", target_groups: [2] },
    items = [{ subject_id: subject, material_ids: [] }]
  const save = () =>
    admin(() =>
      db.query("select admin_save_goal(null,$1,$2,$3,null) as id", [
        C,
        goal,
        items,
      ]),
    )
  const result = await save()
  assert.deepEqual(
    (
      await db.query("select target_groups from goals where id=$1", [
        result.rows[0].id,
      ])
    ).rows[0].target_groups,
    [2],
  )
  goal.target_groups = []
  await assert.rejects(save())
  assert.equal(
    (await db.query("select count(*)::int n from goals where title='Meta'"))
      .rows[0].n,
    1,
  )
})
test("import derives group only from q01 and rejects incomplete and inconsistent payload", () => {
  assert.equal(groupFromAvailability("de_3_a_4h"), 1)
  assert.equal(groupFromAvailability("de_4_a_6h"), 2)
  assert.throws(() => groupFromAvailability("8"))
  const raw = {
    id_envio: ID,
    email: " STUDENT@Test.Invalid ",
    grupo: "Grupo 2",
    respostas: JSON.stringify(payload().answers),
    ...payload().labels,
    q01: "Mais de 2 até 3 horas",
  }
  assert.equal(normalizeSubmission(raw).group, 1)
  assert.equal(normalizeSubmission(raw).email, "student@test.invalid")
  assert.throws(() => normalizeSubmission({ ...raw, q01: "Mais de 6 horas" }))
  assert.throws(() => normalizeSubmission({ ...raw, q20: null }))
})


test("direct material relations and unpublished goals stay hidden", async () => {
 await db.query("insert into materials(id,course_id) values($1,$2)",[ID,C])
 await db.query("insert into goal_item_materials(goal_item_id,material_id) values($1,$2)",[G2,ID])
 await enable();await assign(1)
 assert.equal((await student(()=>db.query("select * from goal_item_materials where goal_item_id=$1",[G2]))).rows.length,0)
 await assign(2)
 assert.equal((await student(()=>db.query("select * from goal_item_materials where goal_item_id=$1",[G2]))).rows.length,1)
 await db.query("update goals set status='draft' where id=$1",[G2])
 assert.equal((await student(()=>db.query("select * from goal_item_materials where goal_item_id=$1",[G2]))).rows.length,0)
 await db.query("update courses set status='archived' where id=$1",[C])
 assert.deepEqual(await visible(),[])
})

test("email lookup refuses administrator accounts and non-admin callers", async () => {
 await assert.rejects(admin(()=>db.query("select admin_find_student_by_email('admin@test.invalid')")))
 await assert.rejects(student(()=>db.query("select admin_find_student_by_email('other@test.invalid')")))
 assert.equal((await admin(()=>db.query("select admin_find_student_by_email(' STUDENT@Test.Invalid ') as id"))).rows[0].id,S)
})

test("orientação sem itens salva e edita com controle de versão e permissão", async () => {
 await applyMigration(db,"20261009000400_orientation_goal_save.sql")
 const goal={title:"Comece por aqui",description:"Orientações iniciais",status:"published",target_groups:[1,2]}
 const id=(await admin(()=>db.query("select admin_save_goal(null,$1,$2,'[]',null) as id",[C,goal]))).rows[0].id
 const version=(await db.query("select updated_at from goals where id=$1",[id])).rows[0].updated_at
 await admin(()=>db.query("select admin_save_goal($1,$2,$3,'[]',$4)",[id,C,{...goal,description:"Orientações revisadas"},version]))
 assert.equal((await db.query("select description from goals where id=$1",[id])).rows[0].description,"Orientações revisadas")
 await assert.rejects(admin(()=>db.query("select admin_save_goal(null,$1,$2,'[]',null)",[C,{...goal,description:" "}])),/descrição de orientação/)
 await assert.rejects(student(()=>db.query("select admin_save_goal(null,$1,$2,'[]',null)",[C,goal])),/administradores/)
})
