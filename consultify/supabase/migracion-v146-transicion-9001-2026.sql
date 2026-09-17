-- ════════════════════════════════════════════════════════════════════════════
-- v146 · Catálogo de tareas del servicio «Transición a ISO 9001:2026»
--
-- La norma nueva (`9001-transicion`) es un servicio para quien ya está
-- certificado en la versión 2015. Sin tareas en `tareas_catalogo` sus ofertas
-- saldrían con el Anexo I vacío —el mismo fallo que arreglamos en la v145—,
-- porque el catálogo estático de respaldo no la conoce.
--
-- Diez tareas, 24 horas, que es lo que se estimó al dar de alta el servicio.
-- Solo para «Implantación» (el proyecto de transición) y «Apoyo» (la bolsa de
-- horas cuando la auditoría está encima): transitar no es un mantenimiento
-- recurrente, así que en Relación, Implicación y Compromiso no aplica.
--
-- La tarea de coordinación y kickoff repite el patrón de la v144: 3 h y nivel
-- Senior, porque quien arranca una transición habla con la dirección.
--
-- Idempotente: no inserta si la norma ya tiene filas.
-- ════════════════════════════════════════════════════════════════════════════

-- La norma va primero: `tareas_catalogo.norma_id` tiene clave ajena contra
-- `normas_catalogo`, así que sin el alta previa las tareas se rechazan.
insert into normas_catalogo (id, nombre, descripcion, nivel, h_apoyo, activa)
values ('9001-transicion', 'Transición a ISO 9001:2026',
        'Para sistemas ya certificados en la versión 2015', 'J3', 24, true)
on conflict (id) do nothing;

insert into tareas_catalogo
  (norma_id, modelo, titulo, tipo, horas_base, orden, proceso, subproceso, nivel)
select '9001-transicion', m.modelo, t.titulo, 'produccion', t.horas, t.orden, t.proceso, t.subproceso, t.nivel
  from (values ('Implantación'), ('Apoyo')) as m(modelo)
  cross join (values
    ('PO2 GESTIÓN DEL PROYECTO',   'S0 PO2 COORDINACIÓN Y KICKOFF',
     'Coordinación y kickoff del proyecto', 3.0, 0, 'Senior'),
    ('1. Diagnóstico',             'Análisis de diferencias contra ISO 9001:2026',
     'Análisis de diferencias contra ISO 9001:2026', 4.0, 1, null),
    ('2. Riesgos y oportunidades', 'Separación de la metodología (6.1.2 y 6.1.3)',
     'Separación de la metodología de riesgos y oportunidades', 3.0, 2, null),
    ('2. Riesgos y oportunidades', 'Evaluación de la eficacia por separado (9.1.3 y 9.3)',
     'Evaluación de la eficacia de riesgos y oportunidades por separado', 2.0, 3, null),
    ('3. Gestión del cambio',      'Revisión del procedimiento de cambios (6.3)',
     'Revisión del procedimiento de gestión del cambio', 2.0, 4, null),
    ('4. Cultura y ética',         'Política, sensibilización y evidencias (5.1.1, 7.3 y 7.1.4)',
     'Cultura de la calidad y comportamiento ético', 3.0, 5, null),
    ('5. Documentación',           'Actualización de la información documentada afectada',
     'Actualización de la información documentada', 3.0, 6, null),
    ('6. Verificación',            'Auditoría interna sobre los requisitos nuevos',
     'Auditoría interna sobre los requisitos nuevos', 3.0, 7, null),
    ('6. Verificación',            'Revisión por la dirección de la transición',
     'Revisión por la dirección de la transición', 1.0, 8, null),
    ('7. Certificación',           'Preparación de la auditoría de transición',
     'Preparación de la auditoría de transición', 0.5, 9, null)
  ) as t(proceso, subproceso, titulo, horas, orden, nivel)
 where not exists (select 1 from tareas_catalogo c where c.norma_id = '9001-transicion');

-- Comprobación:
--   select modelo, count(*), sum(horas_base) from tareas_catalogo
--    where norma_id = '9001-transicion' group by 1;
