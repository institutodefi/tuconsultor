-- ═══════════════════════════════════════════════════════════════════════════
-- v63 · TAREAS DE LOS PLANES DE IGUALDAD Y DIVERSIDAD
--
-- Hasta ahora `tareas_catalogo` tenía unas 200 tareas por modelo para las ISO,
-- pero los planes no tenían ninguna: se podían seleccionar en el calculador y
-- no había nada que planificar ni que enumerar en la oferta.
--
-- Horas del desglose facilitado: 101 h el Plan de Igualdad, 147 h el de
-- Diversidad (46 h de tareas que no existen en Igualdad).
--
-- Se cargan para los DOS modelos con forma de proyecto:
--   · Apoyo        → bolsa de horas, el proyecto completo
--   · Implantación → misma estructura, ejecutada por fases
--
-- NO se cargan para Relación, Implicación ni Compromiso: son modelos de
-- mantenimiento recurrente y un plan de igualdad no se «mantiene» con la misma
-- lista de tareas con que se implanta. Si quieres una lista de mantenimiento
-- (seguimiento anual, revisión de indicadores, actualización del registro),
-- hacen falta esas horas: no me las invento.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Catálogo de normas al día con el motor de cálculo ──
insert into normas_catalogo (id, nombre, descripcion, nivel, h_apoyo, activa) values
  ('igualdad',   'Plan de Igualdad',   'Plan de igualdad de empresa',                                'J3', 101, true),
  ('diversidad', 'Plan de Diversidad', 'Diversidad, equidad e inclusión · se integra con el de Igualdad', 'J3', 147, true)
on conflict (id) do update
  set nombre = excluded.nombre, descripcion = excluded.descripcion,
      nivel = excluded.nivel, h_apoyo = excluded.h_apoyo, activa = excluded.activa;

-- ── 2 · Tareas ──
-- Se borran antes las de estos dos planes para poder reejecutar la migración
-- sin duplicar ni dejar restos de una carga anterior.
delete from tareas_catalogo
 where norma_id in ('igualdad','diversidad') and modelo in ('Apoyo','Implantación');

insert into tareas_catalogo (norma_id, modelo, titulo, proceso, subproceso, descripcion, tipo, horas_base, orden) values
  ('igualdad','Apoyo','1. Compromiso de la organización - Decisión y comunicación del compromiso · Definición del equipo de trabajo','1. Compromiso de la organización','Decisión y comunicación del compromiso · Definición del equipo de trabajo',NULL,'gestion',4,1),
  ('igualdad','Apoyo','2. Comité o Comisión Permanente de Igualdad - Creación del equipo de trabajo','2. Comité o Comisión Permanente de Igualdad','Creación del equipo de trabajo',NULL,'gestion',2,2),
  ('igualdad','Apoyo','3. Diagnóstico - Planificación','3. Diagnóstico','Planificación',NULL,'produccion',5,3),
  ('igualdad','Apoyo','3. Diagnóstico - Recogida de información','3. Diagnóstico','Recogida de información',NULL,'produccion',5,4),
  ('igualdad','Apoyo','3. Diagnóstico - Análisis y presentación de propuestas','3. Diagnóstico','Análisis y presentación de propuestas',NULL,'produccion',5,5),
  ('igualdad','Apoyo','4. Programación - Elaboración del Plan de Igualdad','4. Programación','Elaboración del Plan de Igualdad',NULL,'produccion',15,6),
  ('igualdad','Apoyo','4. Programación - Planificación del Plan','4. Programación','Planificación del Plan',NULL,'produccion',20,7),
  ('igualdad','Apoyo','5. Implantación - Ejecución de las acciones previstas','5. Implantación','Ejecución de las acciones previstas',NULL,'produccion',5,8),
  ('igualdad','Apoyo','5. Implantación - Comunicación, seguimiento y control','5. Implantación','Comunicación, seguimiento y control',NULL,'produccion',10,9),
  ('igualdad','Apoyo','6. Evaluación - Análisis de los resultados obtenidos','6. Evaluación','Análisis de los resultados obtenidos',NULL,'produccion',5,10),
  ('igualdad','Apoyo','6. Evaluación - Recomendaciones de mejora','6. Evaluación','Recomendaciones de mejora',NULL,'produccion',5,11),
  ('igualdad','Apoyo','Medidas transversales (fases 1-6) - Comunicación interna','Medidas transversales (fases 1-6)','Comunicación interna',NULL,'coordinacion',5,12),
  ('igualdad','Apoyo','Medidas transversales (fases 1-6) - Comunicación e imagen externa','Medidas transversales (fases 1-6)','Comunicación e imagen externa',NULL,'coordinacion',5,13),
  ('igualdad','Apoyo','Medidas transversales (fases 1-6) - Formación','Medidas transversales (fases 1-6)','Formación',NULL,'coordinacion',5,14),
  ('igualdad','Apoyo','Medidas transversales (fases 1-6) - Seguimiento','Medidas transversales (fases 1-6)','Seguimiento',NULL,'coordinacion',5,15),
  ('igualdad','Implantación','1. Compromiso de la organización - Decisión y comunicación del compromiso · Definición del equipo de trabajo','1. Compromiso de la organización','Decisión y comunicación del compromiso · Definición del equipo de trabajo',NULL,'gestion',4,1),
  ('igualdad','Implantación','2. Comité o Comisión Permanente de Igualdad - Creación del equipo de trabajo','2. Comité o Comisión Permanente de Igualdad','Creación del equipo de trabajo',NULL,'gestion',2,2),
  ('igualdad','Implantación','3. Diagnóstico - Planificación','3. Diagnóstico','Planificación',NULL,'produccion',5,3),
  ('igualdad','Implantación','3. Diagnóstico - Recogida de información','3. Diagnóstico','Recogida de información',NULL,'produccion',5,4),
  ('igualdad','Implantación','3. Diagnóstico - Análisis y presentación de propuestas','3. Diagnóstico','Análisis y presentación de propuestas',NULL,'produccion',5,5),
  ('igualdad','Implantación','4. Programación - Elaboración del Plan de Igualdad','4. Programación','Elaboración del Plan de Igualdad',NULL,'produccion',15,6),
  ('igualdad','Implantación','4. Programación - Planificación del Plan','4. Programación','Planificación del Plan',NULL,'produccion',20,7),
  ('igualdad','Implantación','5. Implantación - Ejecución de las acciones previstas','5. Implantación','Ejecución de las acciones previstas',NULL,'produccion',5,8),
  ('igualdad','Implantación','5. Implantación - Comunicación, seguimiento y control','5. Implantación','Comunicación, seguimiento y control',NULL,'produccion',10,9),
  ('igualdad','Implantación','6. Evaluación - Análisis de los resultados obtenidos','6. Evaluación','Análisis de los resultados obtenidos',NULL,'produccion',5,10),
  ('igualdad','Implantación','6. Evaluación - Recomendaciones de mejora','6. Evaluación','Recomendaciones de mejora',NULL,'produccion',5,11),
  ('igualdad','Implantación','Medidas transversales (fases 1-6) - Comunicación interna','Medidas transversales (fases 1-6)','Comunicación interna',NULL,'coordinacion',5,12),
  ('igualdad','Implantación','Medidas transversales (fases 1-6) - Comunicación e imagen externa','Medidas transversales (fases 1-6)','Comunicación e imagen externa',NULL,'coordinacion',5,13),
  ('igualdad','Implantación','Medidas transversales (fases 1-6) - Formación','Medidas transversales (fases 1-6)','Formación',NULL,'coordinacion',5,14),
  ('igualdad','Implantación','Medidas transversales (fases 1-6) - Seguimiento','Medidas transversales (fases 1-6)','Seguimiento',NULL,'coordinacion',5,15),
  ('diversidad','Apoyo','1. Compromiso de la organización - Decisión y comunicación del compromiso · Definición del equipo de trabajo','1. Compromiso de la organización','Decisión y comunicación del compromiso · Definición del equipo de trabajo',NULL,'gestion',4,1),
  ('diversidad','Apoyo','2. Comité o Comisión Permanente de Diversidad - Creación del equipo de trabajo','2. Comité o Comisión Permanente de Diversidad','Creación del equipo de trabajo',NULL,'gestion',2,2),
  ('diversidad','Apoyo','3. Diagnóstico - Planificación','3. Diagnóstico','Planificación',NULL,'produccion',5,3),
  ('diversidad','Apoyo','3. Diagnóstico - Recogida de información','3. Diagnóstico','Recogida de información',NULL,'produccion',5,4),
  ('diversidad','Apoyo','3. Diagnóstico - Análisis y presentación de propuestas','3. Diagnóstico','Análisis y presentación de propuestas',NULL,'produccion',5,5),
  ('diversidad','Apoyo','3. Diagnóstico - Análisis por ejes de diversidad','3. Diagnóstico','Análisis por ejes de diversidad','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',6,6),
  ('diversidad','Apoyo','3. Diagnóstico - Cumplimiento LGD y accesibilidad','3. Diagnóstico','Cumplimiento LGD y accesibilidad','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',4,7),
  ('diversidad','Apoyo','3. Diagnóstico - Encuesta de clima inclusivo','3. Diagnóstico','Encuesta de clima inclusivo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,8),
  ('diversidad','Apoyo','4. Programación - Elaboración del Plan de Diversidad','4. Programación','Elaboración del Plan de Diversidad',NULL,'produccion',15,9),
  ('diversidad','Apoyo','4. Programación - Planificación del Plan','4. Programación','Planificación del Plan',NULL,'produccion',20,10),
  ('diversidad','Apoyo','4. Programación - Medidas planificadas LGTBI y protocolo de acoso','4. Programación','Medidas planificadas LGTBI y protocolo de acoso','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',8,11),
  ('diversidad','Apoyo','4. Programación - Política DEI y código de conducta','4. Programación','Política DEI y código de conducta','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,12),
  ('diversidad','Apoyo','5. Implantación - Ejecución de las acciones previstas','5. Implantación','Ejecución de las acciones previstas',NULL,'produccion',5,13),
  ('diversidad','Apoyo','5. Implantación - Comunicación, seguimiento y control','5. Implantación','Comunicación, seguimiento y control',NULL,'produccion',10,14),
  ('diversidad','Apoyo','5. Implantación - Revisión de procesos libres de sesgo','5. Implantación','Revisión de procesos libres de sesgo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,15),
  ('diversidad','Apoyo','6. Evaluación - Análisis de los resultados obtenidos','6. Evaluación','Análisis de los resultados obtenidos',NULL,'produccion',5,16),
  ('diversidad','Apoyo','6. Evaluación - Recomendaciones de mejora','6. Evaluación','Recomendaciones de mejora',NULL,'produccion',5,17),
  ('diversidad','Apoyo','6. Evaluación - Cuadro de indicadores DEI y reporting','6. Evaluación','Cuadro de indicadores DEI y reporting','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',4,18),
  ('diversidad','Apoyo','Medidas transversales (fases 1-6) - Comunicación interna','Medidas transversales (fases 1-6)','Comunicación interna',NULL,'coordinacion',5,19),
  ('diversidad','Apoyo','Medidas transversales (fases 1-6) - Comunicación e imagen externa','Medidas transversales (fases 1-6)','Comunicación e imagen externa',NULL,'coordinacion',5,20),
  ('diversidad','Apoyo','Medidas transversales (fases 1-6) - Formación','Medidas transversales (fases 1-6)','Formación',NULL,'coordinacion',5,21),
  ('diversidad','Apoyo','Medidas transversales (fases 1-6) - Seguimiento','Medidas transversales (fases 1-6)','Seguimiento',NULL,'coordinacion',5,22),
  ('diversidad','Apoyo','Medidas transversales (fases 1-6) - Formación en sesgos inconscientes y liderazgo inclusivo','Medidas transversales (fases 1-6)','Formación en sesgos inconscientes y liderazgo inclusivo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','coordinacion',6,23),
  ('diversidad','Apoyo','Medidas transversales (fases 1-6) - Guía de lenguaje y comunicación inclusiva','Medidas transversales (fases 1-6)','Guía de lenguaje y comunicación inclusiva','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','coordinacion',3,24),
  ('diversidad','Implantación','1. Compromiso de la organización - Decisión y comunicación del compromiso · Definición del equipo de trabajo','1. Compromiso de la organización','Decisión y comunicación del compromiso · Definición del equipo de trabajo',NULL,'gestion',4,1),
  ('diversidad','Implantación','2. Comité o Comisión Permanente de Diversidad - Creación del equipo de trabajo','2. Comité o Comisión Permanente de Diversidad','Creación del equipo de trabajo',NULL,'gestion',2,2),
  ('diversidad','Implantación','3. Diagnóstico - Planificación','3. Diagnóstico','Planificación',NULL,'produccion',5,3),
  ('diversidad','Implantación','3. Diagnóstico - Recogida de información','3. Diagnóstico','Recogida de información',NULL,'produccion',5,4),
  ('diversidad','Implantación','3. Diagnóstico - Análisis y presentación de propuestas','3. Diagnóstico','Análisis y presentación de propuestas',NULL,'produccion',5,5),
  ('diversidad','Implantación','3. Diagnóstico - Análisis por ejes de diversidad','3. Diagnóstico','Análisis por ejes de diversidad','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',6,6),
  ('diversidad','Implantación','3. Diagnóstico - Cumplimiento LGD y accesibilidad','3. Diagnóstico','Cumplimiento LGD y accesibilidad','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',4,7),
  ('diversidad','Implantación','3. Diagnóstico - Encuesta de clima inclusivo','3. Diagnóstico','Encuesta de clima inclusivo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,8),
  ('diversidad','Implantación','4. Programación - Elaboración del Plan de Diversidad','4. Programación','Elaboración del Plan de Diversidad',NULL,'produccion',15,9),
  ('diversidad','Implantación','4. Programación - Planificación del Plan','4. Programación','Planificación del Plan',NULL,'produccion',20,10),
  ('diversidad','Implantación','4. Programación - Medidas planificadas LGTBI y protocolo de acoso','4. Programación','Medidas planificadas LGTBI y protocolo de acoso','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',8,11),
  ('diversidad','Implantación','4. Programación - Política DEI y código de conducta','4. Programación','Política DEI y código de conducta','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,12),
  ('diversidad','Implantación','5. Implantación - Ejecución de las acciones previstas','5. Implantación','Ejecución de las acciones previstas',NULL,'produccion',5,13),
  ('diversidad','Implantación','5. Implantación - Comunicación, seguimiento y control','5. Implantación','Comunicación, seguimiento y control',NULL,'produccion',10,14),
  ('diversidad','Implantación','5. Implantación - Revisión de procesos libres de sesgo','5. Implantación','Revisión de procesos libres de sesgo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,15),
  ('diversidad','Implantación','6. Evaluación - Análisis de los resultados obtenidos','6. Evaluación','Análisis de los resultados obtenidos',NULL,'produccion',5,16),
  ('diversidad','Implantación','6. Evaluación - Recomendaciones de mejora','6. Evaluación','Recomendaciones de mejora',NULL,'produccion',5,17),
  ('diversidad','Implantación','6. Evaluación - Cuadro de indicadores DEI y reporting','6. Evaluación','Cuadro de indicadores DEI y reporting','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',4,18),
  ('diversidad','Implantación','Medidas transversales (fases 1-6) - Comunicación interna','Medidas transversales (fases 1-6)','Comunicación interna',NULL,'coordinacion',5,19),
  ('diversidad','Implantación','Medidas transversales (fases 1-6) - Comunicación e imagen externa','Medidas transversales (fases 1-6)','Comunicación e imagen externa',NULL,'coordinacion',5,20),
  ('diversidad','Implantación','Medidas transversales (fases 1-6) - Formación','Medidas transversales (fases 1-6)','Formación',NULL,'coordinacion',5,21),
  ('diversidad','Implantación','Medidas transversales (fases 1-6) - Seguimiento','Medidas transversales (fases 1-6)','Seguimiento',NULL,'coordinacion',5,22),
  ('diversidad','Implantación','Medidas transversales (fases 1-6) - Formación en sesgos inconscientes y liderazgo inclusivo','Medidas transversales (fases 1-6)','Formación en sesgos inconscientes y liderazgo inclusivo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','coordinacion',6,23),
  ('diversidad','Implantación','Medidas transversales (fases 1-6) - Guía de lenguaje y comunicación inclusiva','Medidas transversales (fases 1-6)','Guía de lenguaje y comunicación inclusiva','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','coordinacion',3,24);

-- ── 3 · Comprobación ──
select norma_id, modelo, count(*) as tareas, sum(horas_base) as horas
  from tareas_catalogo
 where norma_id in ('igualdad','diversidad')
 group by norma_id, modelo
 order by norma_id, modelo;
