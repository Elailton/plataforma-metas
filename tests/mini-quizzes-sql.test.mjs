import assert from "node:assert/strict"
import { test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { applyMigration, asRole, fixture, migrations } from "./helpers/database.mjs"
import { seedSql, USERS } from "./helpers/rls-scenario.mjs"

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const COURSE_A = id(100)
const COURSE_B = id(101)
const SUBJECT_A = id(110)
const SUBJECT_B = id(111)
const TOPIC_A = id(120)
const TOPIC_B = id(122)
const QUIZ = { published: id(900), draft: id(901), otherCourse: id(902) }
const Q = { one: id(910), two: id(911), three: id(912), draft: id(913), other: id(914) }

async function setup() {
  const db = new PGlite()
  await db.exec(fixture)
  for (const name of migrations) await applyMigration(db, name)
  await applyMigration(db, "20260912000100_goal_release_guard.sql")
  await db.exec("alter table courses add column updated_at timestamptz default now()")
  await applyMigration(db, "20261009000100_course_groups.sql")
  await applyMigration(db, "20261009000200_hotmart_offer_authorization.sql")
  await db.exec("alter table goals add constraint goals_status_check check (status in ('draft','published'))")
  await applyMigration(db, "20261009000300_goal_archive_status.sql")
  await applyMigration(db, "20261009000400_orientation_goal_save.sql")
  await applyMigration(db, "20261010000100_rls_performance.sql")
  await applyMigration(db, "20261010000200_goal_group_rls_performance.sql")
  await db.exec(seedSql)
  await applyMigration(db, "20261013000200_mini_quizzes.sql")

  const alts = (n = 4) => JSON.stringify(["A", "B", "C", "D", "E"].slice(0, n).map((key) => ({ key, text: `Alternativa ${key}` })))
  await db.exec(`
    insert into public.mini_quizzes (id, course_id, subject_id, topic_id, title, status) values
      ('${QUIZ.published}', '${COURSE_A}', '${SUBJECT_A}', '${TOPIC_A}', 'Publicado', 'published'),
      ('${QUIZ.draft}', '${COURSE_A}', '${SUBJECT_A}', null, 'Rascunho', 'draft'),
      ('${QUIZ.otherCourse}', '${COURSE_B}', '${SUBJECT_B}', null, 'Curso B', 'published');
    insert into public.mini_quiz_questions (id, quiz_id, position, statement, alternatives) values
      ('${Q.one}', '${QUIZ.published}', 0, 'Questão 1', '${alts()}'),
      ('${Q.two}', '${QUIZ.published}', 1, 'Questão 2', '${alts()}'),
      ('${Q.three}', '${QUIZ.published}', 2, 'Questão 3', '${alts(5)}'),
      ('${Q.draft}', '${QUIZ.draft}', 0, 'Rascunho', '${alts()}'),
      ('${Q.other}', '${QUIZ.otherCourse}', 0, 'Outro curso', '${alts()}');
    insert into public.mini_quiz_answer_keys (question_id, correct_key, explanation) values
      ('${Q.one}', 'A', 'Comentário 1'), ('${Q.two}', 'B', 'Comentário 2'), ('${Q.three}', 'E', 'Comentário 3'),
      ('${Q.draft}', 'A', null), ('${Q.other}', 'C', null);
  `)
  return db
}

const asStudent = (db, user, sql, params = []) => asRole(db, user, "authenticated", () => db.query(sql, params))
const submit = (db, user, quizId, answers) =>
  asStudent(db, user, "select public.submit_mini_quiz($1, $2::jsonb) as r", [quizId, JSON.stringify(answers)]).then((res) => res.rows[0].r)

test("aluno só vê mini simulados publicados dos cursos com acesso efetivo e nunca o gabarito", async () => {
  const db = await setup()
  try {
    const visible = async (user) =>
      (await asStudent(db, user, "select id from public.mini_quizzes order by id")).rows.map((row) => row.id)
    assert.deepEqual(await visible(USERS.groupOne), [QUIZ.published])
    assert.deepEqual(await visible(USERS.groupTwo), [QUIZ.published, QUIZ.otherCourse])
    assert.deepEqual(await visible(USERS.blocked), [])
    assert.deepEqual(await visible(USERS.suspended), [])
    assert.deepEqual(await visible(USERS.nobody), [])
    assert.equal((await visible(USERS.admin)).length, 3)

    const questions = await asStudent(db, USERS.groupOne, "select id from public.mini_quiz_questions")
    assert.equal(questions.rows.length, 3)
    const keys = await asStudent(db, USERS.groupOne, "select * from public.mini_quiz_answer_keys")
    assert.equal(keys.rows.length, 0)
    const adminKeys = await asStudent(db, USERS.admin, "select * from public.mini_quiz_answer_keys")
    assert.equal(adminKeys.rows.length, 5)
  } finally {
    await db.close()
  }
})

test("envio corrige no banco, guarda respostas e respeita o intervalo de 7 dias", async () => {
  const db = await setup()
  try {
    const result = await submit(db, USERS.groupOne, QUIZ.published, { [Q.one]: "A", [Q.two]: "C", [Q.three]: null })
    assert.equal(result.correct, 1)
    assert.equal(result.answered, 2)
    assert.equal(result.total, 3)
    assert.equal(result.attempt_number, 1)
    assert.equal(result.is_first_of_month, true)

    await assert.rejects(submit(db, USERS.groupOne, QUIZ.published, { [Q.one]: "A" }), /MINI_QUIZ_COOLDOWN/)

    // Outro aluno não é afetado pelo intervalo do colega.
    const other = await submit(db, USERS.groupTwo, QUIZ.published, { [Q.one]: "A", [Q.two]: "B", [Q.three]: "E" })
    assert.equal(other.correct, 3)

    // Passados 8 dias, nova tentativa é aceita; no mesmo mês não é a primeira do mês.
    await db.query(
      "update public.mini_quiz_attempts set submitted_at = submitted_at - interval '8 days' where user_id = $1",
      [USERS.groupOne],
    )
    const second = await submit(db, USERS.groupOne, QUIZ.published, { [Q.one]: "A", [Q.two]: "B", [Q.three]: "E" })
    assert.equal(second.attempt_number, 2)
    assert.equal(second.correct, 3)
    assert.equal(second.is_first_of_month, false)

    // Mudança de mês: a próxima conta como primeira do mês.
    await db.query(
      "update public.mini_quiz_attempts set submitted_at = submitted_at - interval '40 days', month_start = (month_start - interval '1 month')::date where user_id = $1",
      [USERS.groupOne],
    )
    const third = await submit(db, USERS.groupOne, QUIZ.published, {})
    assert.equal(third.is_first_of_month, true)
    assert.equal(third.answered, 0)
    assert.equal(third.correct, 0)

    const answers = await asStudent(
      db,
      USERS.groupOne,
      "select count(*)::int as n from public.mini_quiz_attempt_answers",
    )
    assert.equal(answers.rows[0].n, 9)
    const foreign = await asStudent(
      db,
      USERS.otherCourse,
      "select count(*)::int as n from public.mini_quiz_attempt_answers",
    )
    assert.equal(foreign.rows[0].n, 0)
  } finally {
    await db.close()
  }
})

test("envio recusa rascunho, curso sem acesso, bloqueio e respostas inválidas", async () => {
  const db = await setup()
  try {
    await assert.rejects(submit(db, USERS.groupOne, QUIZ.draft, {}), /MINI_QUIZ_NOT_AVAILABLE/)
    await assert.rejects(submit(db, USERS.groupOne, QUIZ.otherCourse, {}), /MINI_QUIZ_NOT_AVAILABLE/)
    await assert.rejects(submit(db, USERS.blocked, QUIZ.published, {}), /MINI_QUIZ_NOT_AVAILABLE/)
    await assert.rejects(submit(db, USERS.nobody, QUIZ.published, {}), /MINI_QUIZ_NOT_AVAILABLE/)
    await assert.rejects(submit(db, USERS.groupOne, QUIZ.published, { [Q.one]: "E" }), /MINI_QUIZ_INVALID_ANSWERS/)
    await assert.rejects(submit(db, USERS.groupOne, QUIZ.published, { [Q.other]: "A" }), /MINI_QUIZ_INVALID_ANSWERS/)
    await assert.rejects(
      asStudent(db, null, "select public.submit_mini_quiz($1, '{}'::jsonb)", [QUIZ.published]),
      /permission denied|MINI_QUIZ_AUTH_REQUIRED/,
    )

    // Escrita direta em tentativas é negada; só a RPC grava.
    await assert.rejects(
      asStudent(
        db,
        USERS.groupOne,
        "insert into public.mini_quiz_attempts (user_id, quiz_id, course_id, attempt_number, is_first_of_month, month_start, correct_count, answered_count, total_count) values ($1, $2, $3, 1, true, current_date, 3, 3, 3)",
        [USERS.groupOne, QUIZ.published, COURSE_A],
      ),
      /permission denied|row-level security/,
    )
    const count = await db.query("select count(*)::int as n from public.mini_quiz_attempts")
    assert.equal(count.rows[0].n, 0)
  } finally {
    await db.close()
  }
})

test("revisão devolve gabarito e comentários só da própria tentativa", async () => {
  const db = await setup()
  try {
    const result = await submit(db, USERS.groupOne, QUIZ.published, { [Q.one]: "B" })
    const own = await asStudent(db, USERS.groupOne, "select * from public.mini_quiz_attempt_review($1)", [result.attempt_id])
    assert.equal(own.rows.length, 3)
    assert.deepEqual(own.rows.map((row) => row.correct_key), ["A", "B", "E"])
    assert.equal(own.rows[0].chosen_key, "B")
    assert.equal(own.rows[0].is_correct, false)
    assert.equal(own.rows[0].explanation, "Comentário 1")

    const stranger = await asStudent(db, USERS.groupTwo, "select * from public.mini_quiz_attempt_review($1)", [result.attempt_id])
    assert.equal(stranger.rows.length, 0)
    const strangerQuestions = await asStudent(db, USERS.groupTwo, "select * from public.mini_quiz_attempt_questions($1)", [result.attempt_id])
    assert.equal(strangerQuestions.rows.length, 0)
    const admin = await asStudent(db, USERS.admin, "select * from public.mini_quiz_attempt_review($1)", [result.attempt_id])
    assert.equal(admin.rows.length, 3)
  } finally {
    await db.close()
  }
})

test("salvamento administrativo é atômico, versiona e arquiva questões removidas", async () => {
  const db = await setup()
  try {
    const save = (user, quizId, quiz, questions, expected = null) =>
      asStudent(db, user, "select public.admin_save_mini_quiz($1, $2, $3::jsonb, $4::jsonb, $5) as id", [
        quizId,
        COURSE_A,
        JSON.stringify(quiz),
        JSON.stringify(questions),
        expected,
      ]).then((res) => res.rows[0].id)
    const alternatives = [
      { key: "A", text: "Certo" },
      { key: "B", text: "Errado" },
    ]
    const quiz = { subject_id: SUBJECT_A, topic_id: TOPIC_A, title: "Novo", status: "published" }

    await assert.rejects(save(USERS.groupOne, null, quiz, [{ statement: "X", alternatives, correct_key: "A" }]), /MINI_QUIZ_ADMIN_REQUIRED/)
    await assert.rejects(save(USERS.admin, null, { ...quiz, subject_id: SUBJECT_B }, []), /MINI_QUIZ_EMPTY|MINI_QUIZ_INVALID_SUBJECT/)
    await assert.rejects(
      save(USERS.admin, null, { ...quiz, topic_id: TOPIC_B }, [{ statement: "X", alternatives, correct_key: "A" }]),
      /MINI_QUIZ_INVALID_TOPIC/,
    )
    await assert.rejects(
      save(USERS.admin, null, quiz, [{ statement: "X", alternatives, correct_key: "C" }]),
      /MINI_QUIZ_INVALID_KEY/,
    )

    const quizId = await save(USERS.admin, null, quiz, [
      { statement: "Primeira", alternatives, correct_key: "A", explanation: "Porque sim" },
      { statement: "Segunda", alternatives, correct_key: "B" },
    ])
    const stored = await db.query("select id, position from public.mini_quiz_questions where quiz_id = $1 order by position", [quizId])
    assert.equal(stored.rows.length, 2)

    const attempt = await submit(db, USERS.groupOne, quizId, { [stored.rows[0].id]: "A", [stored.rows[1].id]: "A" })
    assert.equal(attempt.correct, 1)

    const { rows: version } = await db.query("select updated_at from public.mini_quizzes where id = $1", [quizId])
    await save(
      USERS.admin,
      quizId,
      { ...quiz, title: "Novo (editado)" },
      [{ id: stored.rows[0].id, statement: "Primeira editada", alternatives, correct_key: "A" }],
      version[0].updated_at,
    )
    const after = await db.query(
      "select id, statement, archived_at is not null as archived from public.mini_quiz_questions where quiz_id = $1 order by position, statement",
      [quizId],
    )
    assert.deepEqual(after.rows.map((row) => [row.statement, row.archived]), [
      ["Primeira editada", false],
      ["Segunda", true],
    ])
    // Histórico preservado: a tentativa continua com as duas respostas.
    const history = await db.query("select count(*)::int as n from public.mini_quiz_attempt_answers where attempt_id = $1", [attempt.attempt_id])
    assert.equal(history.rows[0].n, 2)
    // O aluno não vê mais a questão arquivada.
    const studentView = await asStudent(db, USERS.groupOne, "select id from public.mini_quiz_questions where quiz_id = $1", [quizId])
    assert.equal(studentView.rows.length, 1)

    await assert.rejects(
      save(USERS.admin, quizId, quiz, [{ id: stored.rows[0].id, statement: "Y", alternatives, correct_key: "A" }], version[0].updated_at),
      /MINI_QUIZ_VERSION_CONFLICT/,
    )
    // Mini simulado com tentativas não pode ser excluído (somente arquivado).
    await assert.rejects(db.query("delete from public.mini_quizzes where id = $1", [quizId]), /foreign key|violates/)
  } finally {
    await db.close()
  }
})

test("simulado semanal: cada grupo vê só o seu, só a partir da data, e as respostas guardam a disciplina da questão", async () => {
  const db = await setup()
  try {
    await applyMigration(db, "20261021000100_mini_quiz_weekly_groups.sql")
    const W = { g1: id(950), g2: id(951), future: id(952) }
    const WQ = { g1: id(960), g2: id(961), future: id(962) }
    const alts = JSON.stringify(["A", "B", "C", "D"].map((key) => ({ key, text: `Alternativa ${key}` })))
    await db.exec(`
      insert into public.mini_quizzes (id, course_id, subject_id, title, status, target_groups, release_date, week_number) values
        ('${W.g1}', '${COURSE_A}', null, 'Semana 1 G1', 'published', array[1]::smallint[], current_date - 1, 1),
        ('${W.g2}', '${COURSE_A}', null, 'Semana 1 G2', 'published', array[2]::smallint[], current_date - 1, 1),
        ('${W.future}', '${COURSE_A}', null, 'Semana 2 G1', 'published', array[1]::smallint[], current_date + 30, 2);
      insert into public.mini_quiz_questions (id, quiz_id, position, statement, alternatives, subject_id, topic_id) values
        ('${WQ.g1}', '${W.g1}', 0, 'Semanal G1', '${alts}', '${SUBJECT_A}', '${TOPIC_A}'),
        ('${WQ.g2}', '${W.g2}', 0, 'Semanal G2', '${alts}', '${SUBJECT_A}', null),
        ('${WQ.future}', '${W.future}', 0, 'Futuro', '${alts}', '${SUBJECT_A}', null);
      insert into public.mini_quiz_answer_keys (question_id, correct_key) values
        ('${WQ.g1}', 'A'), ('${WQ.g2}', 'A'), ('${WQ.future}', 'A');
    `)
    const weekly = async (user) =>
      (await asStudent(db, user, "select id from public.mini_quizzes where subject_id is null order by id")).rows.map((row) => row.id)
    assert.deepEqual(await weekly(USERS.groupOne), [W.g1])
    assert.deepEqual(await weekly(USERS.groupTwo), [W.g2])
    assert.equal((await weekly(USERS.admin)).length, 3)

    // Questões herdam o filtro do simulado.
    const questions = await asStudent(db, USERS.groupOne, "select id from public.mini_quiz_questions where quiz_id in ($1, $2, $3)", [W.g1, W.g2, W.future])
    assert.deepEqual(questions.rows.map((row) => row.id), [WQ.g1])

    // Não envia simulado do outro grupo nem antes da data.
    await assert.rejects(submit(db, USERS.groupOne, W.g2, {}), /MINI_QUIZ_NOT_AVAILABLE/)
    await assert.rejects(submit(db, USERS.groupOne, W.future, {}), /MINI_QUIZ_NOT_AVAILABLE/)

    const result = await submit(db, USERS.groupOne, W.g1, { [WQ.g1]: "A" })
    assert.equal(result.correct, 1)
    const answer = await db.query("select subject_id, topic_id from public.mini_quiz_attempt_answers where question_id = $1", [WQ.g1])
    assert.deepEqual(answer.rows[0], { subject_id: SUBJECT_A, topic_id: TOPIC_A })

    // Questão com assunto de outra disciplina é recusada.
    await assert.rejects(
      db.exec(`insert into public.mini_quiz_questions (quiz_id, position, statement, alternatives, subject_id, topic_id)
               values ('${W.g1}', 1, 'X', '${alts}', '${SUBJECT_A}', '${TOPIC_B}')`),
      /MINI_QUIZ_INVALID_TOPIC/,
    )
  } finally {
    await db.close()
  }
})

test("diagnóstico semanal: tempo medido pelo banco, tentativa única e ranking só de quem aceitou", async () => {
  const db = await setup()
  try {
    await applyMigration(db, "20261021000100_mini_quiz_weekly_groups.sql")
    await applyMigration(db, "20261021000200_mini_quiz_timer_ranking.sql")
    const ANA = id(21)
    const BRUNO = id(22)
    const W = id(950)
    const WQ = [id(960), id(961)]
    const alts = JSON.stringify(["A", "B"].map((key) => ({ key, text: key })))
    await db.exec(`
      insert into auth.users (id, email) values ('${ANA}', 'ana@test.invalid'), ('${BRUNO}', 'bruno@test.invalid');
      update public.profiles set full_name = 'Ana Maria Souza' where id = '${ANA}';
      update public.profiles set full_name = 'Carlos Lima Neto' where id = '${USERS.groupOne}';
      insert into public.enrollments (user_id, course_id, status, study_group) values
        ('${ANA}', '${COURSE_A}', 'active', 1), ('${BRUNO}', '${COURSE_A}', 'active', 1);
      insert into public.mini_quizzes (id, course_id, subject_id, title, status, target_groups, release_date, week_number)
        values ('${W}', '${COURSE_A}', null, 'Semana 1', 'published', array[1]::smallint[], current_date - 1, 1);
      insert into public.mini_quiz_questions (id, quiz_id, position, statement, alternatives, subject_id) values
        ('${WQ[0]}', '${W}', 0, 'Q1', '${alts}', '${SUBJECT_A}'), ('${WQ[1]}', '${W}', 1, 'Q2', '${alts}', '${SUBJECT_A}');
      insert into public.mini_quiz_answer_keys (question_id, correct_key) values ('${WQ[0]}', 'A'), ('${WQ[1]}', 'B');
    `)
    const start = (user, ranking) =>
      asStudent(db, user, "select public.start_mini_quiz($1, $2) as r", [W, ranking]).then((res) => res.rows[0].r)
    const ago = (user, seconds) =>
      db.query(`update public.mini_quiz_starts set started_at = started_at - make_interval(secs => $2) where user_id = $1`, [user, seconds])
    const allRight = { [WQ[0]]: "A", [WQ[1]]: "B" }

    assert.equal((await start(USERS.groupOne, true)).resumed, false)
    // Recarregar não zera o tempo nem muda a escolha do ranking.
    const resumed = await start(USERS.groupOne, false)
    assert.equal(resumed.resumed, true)
    assert.equal(resumed.show_in_ranking, true)
    await ago(USERS.groupOne, 600)
    assert.equal((await submit(db, USERS.groupOne, W, allRight)).duration_seconds, 600)

    await start(ANA, true)
    await ago(ANA, 900)
    await submit(db, ANA, W, allRight)

    await start(BRUNO, false)
    await submit(db, BRUNO, W, {})

    const ranking = (user, limit = 10) =>
      asStudent(db, user, "select * from public.mini_quiz_ranking($1, $2)", [W, limit]).then((res) => res.rows)
    const rows = await ranking(BRUNO)
    assert.deepEqual(
      rows.map((row) => [row.rank, row.display_name, row.correct_count, row.duration_seconds, row.is_me, row.participants]),
      [[1, "Carlos N.", 2, 600, false, 2], [2, "Ana S.", 2, 900, false, 2]],
    )
    // Fora do topo, a própria linha também volta.
    assert.deepEqual((await ranking(ANA, 1)).map((row) => [row.rank, row.is_me]), [[1, false], [2, true]])

    // Outro grupo não vê o ranking nem inicia; o diagnóstico semanal não pode ser refeito, nem depois de dias.
    await assert.rejects(ranking(USERS.groupTwo), /MINI_QUIZ_NOT_AVAILABLE/)
    await assert.rejects(start(USERS.groupTwo, true), /MINI_QUIZ_NOT_AVAILABLE/)
    await db.query("update public.mini_quiz_attempts set submitted_at = submitted_at - interval '30 days' where user_id = $1", [BRUNO])
    await assert.rejects(start(BRUNO, true), /MINI_QUIZ_ALREADY_DONE/)
    await assert.rejects(submit(db, BRUNO, W, {}), /MINI_QUIZ_ALREADY_DONE/)

    // Sem iniciar (sem cronômetro), o envio é recusado.
    await db.exec(`insert into auth.users (id, email) values ('${id(23)}', 'c@test.invalid');
      insert into public.enrollments (user_id, course_id, status, study_group) values ('${id(23)}', '${COURSE_A}', 'active', 1);`)
    await assert.rejects(submit(db, id(23), W, allRight), /MINI_QUIZ_NOT_STARTED/)

    // Início só é gravado pela função; cada aluno lê apenas o próprio.
    await assert.rejects(
      asStudent(db, ANA, "insert into public.mini_quiz_starts (user_id, quiz_id) values ($1, $2)", [ANA, W]),
      /permission denied/,
    )
    const own = await asStudent(db, ANA, "select count(*)::int as n from public.mini_quiz_starts")
    assert.equal(own.rows[0].n, 1)
  } finally {
    await db.close()
  }
})

test("grupo 3 (teste): vê o grupo espelhado e o que é só de teste; fica fora do ranking dos alunos", async () => {
  const db = await setup()
  try {
    await applyMigration(db, "20261021000100_mini_quiz_weekly_groups.sql")
    await applyMigration(db, "20261021000200_mini_quiz_timer_ranking.sql")
    await applyMigration(db, "20261022000100_test_group_and_group_settings.sql")
    const TESTER = id(31)
    const W = { g1: id(950), test: id(951) }
    const alts = JSON.stringify(["A", "B"].map((key) => ({ key, text: key })))
    await db.exec(`
      insert into auth.users (id, email) values ('${TESTER}', 'teste@test.invalid');
      insert into public.enrollments (user_id, course_id, status, study_group, mirror_group) values ('${TESTER}', '${COURSE_A}', 'active', 3, 1);
      insert into public.mini_quizzes (id, course_id, subject_id, title, status, target_groups, release_date, week_number) values
        ('${W.g1}', '${COURSE_A}', null, 'Semana 1', 'published', array[1]::smallint[], current_date - 1, 1),
        ('${W.test}', '${COURSE_A}', null, 'Semana 2 (teste)', 'published', array[3]::smallint[], current_date - 1, 2);
      insert into public.mini_quiz_questions (id, quiz_id, position, statement, alternatives, subject_id) values
        ('${id(960)}', '${W.g1}', 0, 'Q', '${alts}', '${SUBJECT_A}'), ('${id(961)}', '${W.test}', 0, 'Q', '${alts}', '${SUBJECT_A}');
      insert into public.mini_quiz_answer_keys (question_id, correct_key) values ('${id(960)}', 'A'), ('${id(961)}', 'A');
    `)
    const weekly = async (user) =>
      (await asStudent(db, user, "select id from public.mini_quizzes where subject_id is null order by id")).rows.map((row) => row.id)
    assert.deepEqual(await weekly(TESTER), [W.g1, W.test])
    assert.deepEqual(await weekly(USERS.groupOne), [W.g1])
    assert.deepEqual(await weekly(USERS.groupTwo), [])

    // Teste e aluno fazem o diagnóstico do G1 com ranking: o teste só aparece para si mesmo.
    for (const user of [TESTER, USERS.groupOne]) {
      await asStudent(db, user, "select public.start_mini_quiz($1, true)", [W.g1])
      await submit(db, user, W.g1, { [id(960)]: "A" })
    }
    const names = async (user) =>
      (await asStudent(db, user, "select is_me from public.mini_quiz_ranking($1)", [W.g1])).rows.map((row) => row.is_me)
    assert.deepEqual(await names(USERS.groupOne), [true])
    assert.equal((await names(TESTER)).length, 2)

    // Configuração por grupo: só o administrador grava; o aluno lê as do seu curso.
    await db.exec(`insert into public.course_group_settings (course_id, study_group, disabled_features, notice)
      values ('${COURSE_A}', 1, array['relatorio'], 'Aviso G1')`)
    await assert.rejects(db.exec(`insert into public.course_group_settings (course_id, study_group, disabled_features) values ('${COURSE_A}', 2, array['inexistente'])`))
    const read = await asStudent(db, USERS.groupOne, "select disabled_features from public.course_group_settings")
    assert.deepEqual(read.rows[0].disabled_features, ["relatorio"])
    await assert.rejects(
      asStudent(db, USERS.groupOne, "insert into public.course_group_settings (course_id, study_group) values ($1, 2)", [COURSE_A]),
    )
    assert.equal((await asStudent(db, USERS.otherCourse, "select count(*)::int as n from public.course_group_settings")).rows[0].n, 0)
  } finally {
    await db.close()
  }
})
