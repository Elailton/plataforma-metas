-- Diagnóstico SOMENTE LEITURA: matrículas de um curso cuja origem não pode ser confirmada.
-- Não altera nada. Não exibe e-mail, nome ou payload: apenas IDs internos e indicadores.
-- Uso: substituir o course_id abaixo e executar no SQL Editor do Supabase.
with target as (select 'fec9bb24-aaab-41ce-a98b-a039c3905ee2'::uuid as course_id)
select
  e.id as enrollment_id,
  e.user_id,
  e.status,
  e.source,
  e.enrolled_at,
  exists (select 1 from public.manual_course_grants g
          where g.user_id = e.user_id and g.course_id = e.course_id and g.status = 'active') as manual_ativo,
  (select count(*) from public.hotmart_entitlements h
    where h.user_id = e.user_id and h.course_id = e.course_id and h.status = 'active') as compras_ativas,
  (select count(*) from public.hotmart_entitlements h
    where h.user_id = e.user_id and h.course_id = e.course_id and h.status = 'active' and h.offer_code is null) as compras_ativas_sem_oferta,
  exists (select 1 from public.course_access_blocks b
          where b.user_id = e.user_id and b.course_id = e.course_id and b.released_at is null) as bloqueado,
  case
    when exists (select 1 from public.manual_course_grants g
                 where g.user_id = e.user_id and g.course_id = e.course_id and g.status = 'active') then 'concessão manual'
    when exists (select 1 from public.hotmart_entitlements h
                 where h.user_id = e.user_id and h.course_id = e.course_id and h.status = 'active' and h.offer_code is not null) then 'compra com oferta registrada'
    when exists (select 1 from public.hotmart_entitlements h
                 where h.user_id = e.user_id and h.course_id = e.course_id and h.status = 'active') then 'compra sem oferta registrada (anterior à mudança): conferir na Hotmart'
    when e.status = 'active' then 'sem direito que sustente o acesso: conferir'
    else 'inativa'
  end as diagnostico
from public.enrollments e
join target t on t.course_id = e.course_id
order by diagnostico, e.enrolled_at;
