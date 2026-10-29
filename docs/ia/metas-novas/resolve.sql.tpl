update public.goal_items i set instructions =
 replace(replace(replace(replace(i.instructions,
  '{AULAS}', coalesce((select case when count(*)=1 then 'Assista à aula: '||min(split_part(m.title,' — ',1)) else 'Assista, nesta ordem, às aulas: '||string_agg(split_part(m.title,' — ',1),'; ' order by gim.position) end
     from public.goal_item_materials gim join public.materials m on m.id=gim.material_id where gim.goal_item_id=i.id and m.type='videoaula'),'')),
  '{BLOCO}', case when exists(select 1 from public.goal_item_materials gim join public.materials m on m.id=gim.material_id where gim.goal_item_id=i.id and m.type='videoaula' and (m.title ilike 'bloco%' or m.title ilike 'questões%' or m.title ilike '%bloco de quest%')) then ' No bloco de questões, pause e resolva cada questão antes de ver a correção.' else '' end),
  '{TT}', coalesce(rtrim((select coalesce(st.title,t.title) from public.syllabus_topics t left join public.syllabus_topics st on st.id=i.subtopic_id where t.id=i.topic_id),'.'),'')),
  '{NOTA}', coalesce((select (regexp_match(o.instructions, 'Anotação dirigida: (.*?)(?: Este assunto| No bloco|$)'))[1]
     from public.goal_items o where o.topic_id=i.topic_id and o.id<>i.id and o.instructions like '%Anotação dirigida: %' and o.instructions not like '%{NOTA}%'
     order by (o.subtopic_id is not distinct from i.subtopic_id) desc, o.archived_at nulls first limit 1),
   'anote os conceitos, as regras e as exceções destacados pelo professor e os pontos em que teve dúvida.'))
where i.archived_at is null and i.instructions like '%{%' and i.goal_id in (select id from public.goals where course_id='{cid}')
