-- ═══════════════════════════════════════════════════════════════════════════
-- ¿POR QUÉ NO LLEGAN LAS EMPRESAS A BREVO?
--
-- Brevo identifica cada contacto por su CORREO. Una empresa sin correo no puede
-- ser un contacto de Brevo: no es un fallo del código, es cómo funciona Brevo.
--
-- Esto dice cuántas se pueden subir y cuántas no.
-- ═══════════════════════════════════════════════════════════════════════════

select * from (
  select 1 as n, 'Empresas en total' as dato,
         (select count(*)::text from public.empresas) as valor
  union all
  select 2, 'Con correo (SÍ pueden ir a Brevo)',
         (select count(*)::text from public.empresas where coalesce(btrim(email),'') <> '')
  union all
  select 3, 'SIN correo (no pueden ir)',
         (select count(*)::text from public.empresas where coalesce(btrim(email),'') = '')
  union all
  select 4, 'Cuáles no tienen correo',
         coalesce((select string_agg(nombre, ' · ') from public.empresas
                    where coalesce(btrim(email),'') = '' limit 10), '—')
  union all
  select 5, 'Contactos con correo Y consentimiento',
         (select count(*)::text from public.contactos
           where coalesce(btrim(email),'') <> '' and consentimiento_marketing is true)
  union all
  select 6, 'Contactos con correo SIN consentimiento',
         (select count(*)::text from public.contactos
           where coalesce(btrim(email),'') <> '' and coalesce(consentimiento_marketing, false) is false)
) t order by n;
