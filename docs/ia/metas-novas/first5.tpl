with gv(gk, g, title, due) as (values
<GV>),
iv(gk, pos, code, t8, n, mins, extra, mats) as (values
<IV>),
tv(code, name) as (values
<TV>),
gins as (insert into public.goals (course_id, title, status, due_date, target_groups)
  select '<CID>', gv.title, 'published', gv.due::date, array[gv.g]::smallint[] from gv
  where not exists (select 1 from public.goals x where x.course_id='<CID>' and x.title=gv.title and x.target_groups=array[gv.g]::smallint[])
  returning id, title, target_groups),
gl as (select gins.id, gv.gk from gins join gv on gv.title=gins.title and gins.target_groups=array[gv.g]::smallint[]),
nr as (select gl.id goal_id, iv.*, t.id topic_id, t.subject_id
  from iv join gl on gl.gk=iv.gk
  join public.syllabus_topics t on left(t.id::text,8)=iv.t8 and t.subject_id in (select id from public.subjects where course_id='<CID>')),
ins as (insert into public.goal_items (goal_id, subject_id, topic_id, subtopic_id, instructions, suggested_questions, position)
  select goal_id, subject_id, coalesce((select p.parent_topic_id from public.syllabus_topics p where p.id=nr.topic_id), topic_id),
   case when (select p.parent_topic_id from public.syllabus_topics p where p.id=nr.topic_id) is not null then topic_id end,
   case code
    when 'A' then '{AULAS} (~'||mins||' min'||case when split_part(gk,'-',1)='1' then ' em 1,5x' else '' end||'). Anotação dirigida: {NOTA}{BLOCO}'
    when 'Q1' then 'Questões — 1ª resolução de «{TT}»: resolva '||n||' questões no caderno do Qconcursos deste assunto (link nos materiais deste item), sem consultar o material (~'||mins||' min). Estudo reverso: confira o gabarito, leia os comentários das que errou e das que acertou com dúvida e identifique o motivo de cada erro (desatenção, leitura do comando ou conteúdo). Registre no caderno de erros o que faltou.'
    when 'QC' then 'Questões — «{TT}» (parte vista hoje): resolva '||n||' questões do caderno do Qconcursos deste assunto (link nos materiais deste item) sobre o que você acabou de estudar, sem consultar o material (~'||mins||' min). Faça o estudo reverso das que errar e registre no caderno de erros.'
    when 'RF' then 'Prática de «{TT}»: resolva mais '||n||' questões ainda não resolvidas do caderno do Qconcursos deste assunto (link nos materiais deste item) (~'||mins||' min), com estudo reverso das que errar.'
   end, n, pos
  from nr returning id, goal_id, position),
mt as (select nr.goal_id, nr.pos, x.tok, x.ord from nr cross join lateral unnest(string_to_array(nr.mats, ';')) with ordinality x(tok, ord)),
gim as (insert into public.goal_item_materials (goal_item_id, material_id, position)
  select ins.id, m.id, mt.ord - 1 from ins join mt on mt.goal_id=ins.goal_id and mt.pos=ins.position
  join lateral (select m.id from public.materials m where m.course_id='<CID>' and (
     (split_part(mt.tok,':',1)='v' and m.type='videoaula' and m.description like 'Trilha: '||(select name from tv where tv.code=split_part(mt.tok,':',2))||' | Ordem: '||lpad(split_part(mt.tok,':',3),3,'0')||'%')
  or (split_part(mt.tok,':',1)='q' and m.description like '%Chave: '||split_part(mt.tok,':',2))
  or (mt.tok='tu' and m.title='Tutorial: Caderno de Erros (PDF)')) order by m.created_at limit 1) m on true
  returning 1)
select (select count(*) from gins) metas, (select count(*) from ins) itens, (select count(*) from iv) esperados, (select count(*) from nr) resolvidos, (select count(*) from gim) materiais, (select count(*) from mt) mat_esperados
