// Cenário compartilhado para comparar a visibilidade RLS antes e depois de uma migração.
// Tudo é feito com SELECTs (inclusive tentativas de escrita, que são desfeitas),
// para que o mesmo roteiro rode em PGlite (CI) ou em um Postgres descartável.

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

export const USERS = {
  admin: id(1),
  groupOne: id(2), // curso A (grupos ativos), grupo 1
  blocked: id(3), // curso A ativo, mas com bloqueio administrativo aberto
  otherCourse: id(4), // somente curso B
  suspended: id(5), // curso A suspenso
  draftCourse: id(6), // matrícula ativa apenas no curso C (rascunho)
  groupTwo: id(7), // curso A, grupo 2
  nobody: id(8), // conta sem matrícula
}

const C = { a: id(100), b: id(101), draft: id(102) }
const SUBJ = { a: id(110), b: id(111), draft: id(112) }
const TOPIC = { a: id(120), aChild: id(121), b: id(122), draft: id(123) }
const MAT = { a: id(130), b: id(131), draft: id(132), orphan: id(133) }
const GOAL = { aG1: id(140), aG2: id(141), aDraft: id(142), aFuture: id(143), b: id(144), aArchived: id(145) }
const ITEM = { aG1: id(150), aG1Archived: id(151), aG2: id(152), aDraft: id(153), aFuture: id(154), b: id(155) }

export const seedSql = `
  insert into auth.users (id, email) values
    ('${USERS.admin}', 'admin@test.invalid'),
    ('${USERS.groupOne}', 'g1@test.invalid'),
    ('${USERS.blocked}', 'blocked@test.invalid'),
    ('${USERS.otherCourse}', 'other@test.invalid'),
    ('${USERS.suspended}', 'suspended@test.invalid'),
    ('${USERS.draftCourse}', 'draft@test.invalid'),
    ('${USERS.groupTwo}', 'g2@test.invalid'),
    ('${USERS.nobody}', 'nobody@test.invalid');
  update public.profiles set role = 'admin' where id = '${USERS.admin}';

  insert into public.courses (id, name, status) values
    ('${C.a}', 'Curso A', 'published'), ('${C.b}', 'Curso B', 'published'), ('${C.draft}', 'Curso C', 'draft');
  update public.courses set groups_enabled = true where id = '${C.a}';

  insert into public.enrollments (user_id, course_id, status, study_group) values
    ('${USERS.groupOne}', '${C.a}', 'active', 1),
    ('${USERS.blocked}', '${C.a}', 'active', 1),
    ('${USERS.otherCourse}', '${C.b}', 'active', null),
    ('${USERS.suspended}', '${C.a}', 'suspended', 1),
    ('${USERS.draftCourse}', '${C.draft}', 'active', null),
    ('${USERS.groupTwo}', '${C.a}', 'active', 2),
    ('${USERS.groupTwo}', '${C.b}', 'active', null);

  insert into public.course_access_blocks (user_id, course_id, reason, blocked_by)
    values ('${USERS.blocked}', '${C.a}', 'Teste de bloqueio', '${USERS.admin}');

  insert into public.subjects (id, course_id) values
    ('${SUBJ.a}', '${C.a}'), ('${SUBJ.b}', '${C.b}'), ('${SUBJ.draft}', '${C.draft}');
  insert into public.syllabus_topics (id, subject_id) values
    ('${TOPIC.a}', '${SUBJ.a}'), ('${TOPIC.aChild}', '${SUBJ.a}'), ('${TOPIC.b}', '${SUBJ.b}'), ('${TOPIC.draft}', '${SUBJ.draft}');
  insert into public.materials (id, course_id) values
    ('${MAT.a}', '${C.a}'), ('${MAT.b}', '${C.b}'), ('${MAT.draft}', '${C.draft}'), ('${MAT.orphan}', null);

  insert into public.goals (id, course_id, status, due_date, target_groups) values
    ('${GOAL.aG1}', '${C.a}', 'published', null, array[1]::smallint[]),
    ('${GOAL.aG2}', '${C.a}', 'published', null, array[2]::smallint[]),
    ('${GOAL.aDraft}', '${C.a}', 'draft', null, array[1,2]::smallint[]),
    ('${GOAL.aFuture}', '${C.a}', 'published', current_date + 30, array[1,2]::smallint[]),
    ('${GOAL.b}', '${C.b}', 'published', null, array[1,2]::smallint[]),
    ('${GOAL.aArchived}', '${C.a}', 'archived', null, array[1,2]::smallint[]);
  insert into public.goal_items (id, goal_id, subject_id, topic_id) values
    ('${ITEM.aG1}', '${GOAL.aG1}', '${SUBJ.a}', '${TOPIC.a}'),
    ('${ITEM.aG1Archived}', '${GOAL.aG1}', '${SUBJ.a}', '${TOPIC.aChild}'),
    ('${ITEM.aG2}', '${GOAL.aG2}', '${SUBJ.a}', '${TOPIC.a}'),
    ('${ITEM.aDraft}', '${GOAL.aDraft}', '${SUBJ.a}', '${TOPIC.a}'),
    ('${ITEM.aFuture}', '${GOAL.aFuture}', '${SUBJ.a}', '${TOPIC.a}'),
    ('${ITEM.b}', '${GOAL.b}', '${SUBJ.b}', '${TOPIC.b}');
  update public.goal_items set archived_at = now() where id = '${ITEM.aG1Archived}';
  insert into public.goal_item_materials (goal_item_id, material_id) values
    ('${ITEM.aG1}', '${MAT.a}'), ('${ITEM.aG2}', '${MAT.a}'), ('${ITEM.aDraft}', '${MAT.a}'),
    ('${ITEM.aG1Archived}', '${MAT.a}'), ('${ITEM.b}', '${MAT.b}');

  insert into public.student_goal_item_completions (user_id, goal_item_id) values
    ('${USERS.groupOne}', '${ITEM.aG1}'), ('${USERS.groupTwo}', '${ITEM.aG2}'),
    ('${USERS.otherCourse}', '${ITEM.b}'), ('${USERS.blocked}', '${ITEM.aG1}');

  -- Tentativas de escrita executadas com as permissões de quem chama e sempre desfeitas.
  create function public.rls_try_insert_completion(requested_item uuid) returns text
  language plpgsql security invoker set search_path = '' as $$
  begin
    insert into public.student_goal_item_completions (user_id, goal_item_id)
    values (auth.uid(), requested_item);
    raise exception 'rls_probe_inserted';
  exception
    when unique_violation then return 'duplicate';
    when others then
      if sqlerrm = 'rls_probe_inserted' then return 'allowed'; end if;
      return 'denied';
  end $$;
  create function public.rls_try_delete_completions() returns integer
  language plpgsql security invoker set search_path = '' as $$
  declare affected integer;
  begin
    delete from public.student_goal_item_completions where true;
    get diagnostics affected = row_count;
    raise exception 'rls_probe_deleted:%', affected;
  exception when others then
    if sqlerrm like 'rls_probe_deleted:%' then return split_part(sqlerrm, ':', 2)::integer; end if;
    return -1;
  end $$;
  create function public.rls_try_update_profiles() returns integer
  language plpgsql security invoker set search_path = '' as $$
  declare affected integer;
  begin
    update public.profiles set full_name = full_name where true;
    get diagnostics affected = row_count;
    raise exception 'rls_probe_updated:%', affected;
  exception when others then
    if sqlerrm like 'rls_probe_updated:%' then return split_part(sqlerrm, ':', 2)::integer; end if;
    return -1;
  end $$;
  grant execute on function public.rls_try_insert_completion(uuid) to authenticated;
  grant execute on function public.rls_try_delete_completions() to authenticated;
  grant execute on function public.rls_try_update_profiles() to authenticated;
`

const itemList = Object.values(ITEM)

export const snapshotQueries = [
  "select id::text as v from public.profiles order by 1",
  "select user_id::text || ':' || course_id::text as v from public.enrollments order by 1",
  "select id::text as v from public.courses order by 1",
  "select id::text as v from public.subjects order by 1",
  "select id::text as v from public.syllabus_topics order by 1",
  "select id::text as v from public.materials order by 1",
  "select id::text as v from public.goals order by 1",
  "select id::text as v from public.goal_items order by 1",
  "select goal_item_id::text || ':' || material_id::text as v from public.goal_item_materials order by 1",
  "select user_id::text || ':' || goal_item_id::text as v from public.student_goal_item_completions order by 1",
  "select count(*)::text as v from public.course_access_blocks",
  "select count(*)::text as v from public.hotmart_product_mappings",
  ...itemList.map((item) => `select public.rls_try_insert_completion('${item}') as v`),
  "select public.rls_try_delete_completions()::text as v",
  "select public.rls_try_update_profiles()::text as v",
]

/** Script psql equivalente, para validar em um Postgres descartável fora do CI. */
export function psqlSnapshotScript(label) {
  const lines = []
  for (const [name, user] of Object.entries(USERS)) {
    lines.push("set role authenticated;")
    lines.push(`select set_config('request.jwt.claim.sub', '${user}', false);`)
    snapshotQueries.forEach((query, index) => {
      lines.push(`\\echo ${label}|${name}|${index}`)
      lines.push(`select coalesce(string_agg(v, ','), '') from (${query}) q;`)
    })
    lines.push("reset role;")
  }
  return lines.join("\n")
}

export async function takeSnapshot(db, asRole) {
  const result = {}
  for (const [name, user] of Object.entries(USERS)) {
    result[name] = []
    for (const query of snapshotQueries) {
      const { rows } = await asRole(db, user, "authenticated", () => db.query(query))
      result[name].push(rows.map((row) => row.v).join(","))
    }
  }
  return result
}
