-- ════════════════════════════════════════════════════════════════════════════
-- v145 · Catálogo de tareas para las tres normas que no lo tenían
--
-- El Anexo I de las ofertas se monta desde `tareas_catalogo`. Tres normas del
-- catálogo comercial no tenían ni una fila: UNE 93200 (cartas de servicios),
-- UNE 66181 (calidad de la formación virtual) y Madrid Excelente. Una oferta
-- de cualquiera de ellas salía con el Anexo I vacío: precio sin trabajo.
--
-- Las tres siguen el mismo mapa de procesos que ISO 9001 —contexto, riesgos,
-- objetivos, desempeño, mejora, personas, documentación, certificación—, que
-- es exactamente lo que ya hacía el catálogo estático con UNE 93200. Se clonan
-- las filas de 9001, incluida la de coordinación y kickoff de la v144.
--
-- Idempotente: no inserta si la norma ya tiene filas.
-- ════════════════════════════════════════════════════════════════════════════

insert into tareas_catalogo
  (norma_id, modelo, titulo, tipo, horas_base, orden, proceso, subproceso, descripcion, definicion, subtareas, nivel)
select n.id, t.modelo, t.titulo, t.tipo, t.horas_base, t.orden, t.proceso, t.subproceso,
       t.descripcion, t.definicion, t.subtareas, t.nivel
  from (values ('une93200'), ('une66181'), ('madridexcelente')) as n(id)
  cross join lateral (select * from tareas_catalogo where norma_id = '9001') t
 where not exists (select 1 from tareas_catalogo c where c.norma_id = n.id);

-- Comprobación: ninguna norma comercial debe quedarse sin catálogo.
--   select norma_id, count(*) from tareas_catalogo group by 1 order by 1;
