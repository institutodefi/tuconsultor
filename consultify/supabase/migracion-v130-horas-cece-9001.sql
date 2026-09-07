-- =============================================================================
-- MIGRACIÓN v130 · Horas de la ISO 9001 en CECE (259 h → 56 h)
--
-- Las 22 tareas de la 9001 de CECE se volcaron el 1 de septiembre con una
-- versión del volcado que «anidaba» las tareas iguales de varias normas y
-- sumaba sus horas (S1 PE1: 3 h de 9001 + 3 h de 14001 + 3 h de 27001 = 9 h).
-- Después las tareas de 14001 y 27001 se volcaron también por separado, así
-- que esas horas estaban contadas dos veces: 259 h en la 9001 cuando el
-- catálogo del modelo Relación dice 56 h.
--
-- Se devuelven a las horas del catálogo (por su enlace catalogo_id) las
-- tareas NO integradas cuyas horas son al menos el doble del catálogo: es la
-- huella del anidado, no de un ajuste a mano. Solo afecta a CECE (DICS y
-- FGUP ya cuadran con el catálogo). El volcado actual ya no anida.
--
-- Después de v129. Idempotente.
-- =============================================================================
begin;

update public.cliente_tareas ct
   set horas = tc.horas_base,
       editada_manual = false
  from public.tareas_catalogo tc
 where tc.id = ct.catalogo_id
   and coalesce(ct.integrada, false) = false
   and ct.horas >= tc.horas_base * 2
   and tc.horas_base > 0;

commit;
