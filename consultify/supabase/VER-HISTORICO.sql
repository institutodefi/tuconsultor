-- ═══════════════════════════════════════════════════════════════════════════
-- QUÉ HAY EN EL HISTÓRICO DE OFERTAS
--
-- Un solo pegado: qué ofertas están guardadas y con qué datos. Sirve para
-- comparar con los correos de «Nueva oferta emitida» y ver si falta alguna.
--
-- Si una oferta aparece aquí pero NO en la pantalla del histórico, el problema
-- es de lectura y no de guardado: mira la última consulta.
-- ═══════════════════════════════════════════════════════════════════════════

select
  numero_oferta,
  creado::date                      as fecha,
  left(coalesce(empresa,'—'), 34)   as cliente,
  coalesce(modelo,'—')              as modelo,
  precio,
  coalesce(tipo,'—')                as tipo,
  coalesce(estado,'(sin estado)')   as estado,
  case when url_pdf is null then 'sin PDF' else 'con PDF' end as documento
from public.presupuestos
where numero_oferta is not null
order by creado desc;
