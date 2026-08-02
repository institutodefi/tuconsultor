-- ═══════════════════════════════════════════════════════════════════════════
-- v66 · VARIANTES «CON SEGUIMIENTO» Y TAREAS DE IMPLANTACIÓN
--
-- Dos cosas:
--
--  1 · Plan de Igualdad y Plan de Diversidad pasan a tener variante CON
--      SEGUIMIENTO: el plan más el acompañamiento del primer año. Son 24 h que
--      hoy se hacen y no se cobran: dos comisiones, revisión de indicadores,
--      informe anual y actualización del registro.
--
--      ⚠ Esas 24 h son MI ESTIMACIÓN, no salen de tu desglose. Revísalas.
--
--  2 · La columna Implantación existe ya en la pantalla de Sistemas, así que
--      las tareas cargadas para ese modelo se pueden ver y editar.
-- ═══════════════════════════════════════════════════════════════════════════

insert into normas_catalogo (id, nombre, descripcion, nivel, h_apoyo, activa) values
  ('igualdad-seg',   'Plan de Igualdad con seguimiento',   'El plan más el seguimiento del primer año', 'J3', 125, true),
  ('diversidad-seg', 'Plan de Diversidad con seguimiento', 'El plan más el seguimiento del primer año', 'J3', 171, true)
on conflict (id) do update
  set nombre = excluded.nombre, descripcion = excluded.descripcion,
      nivel = excluded.nivel, h_apoyo = excluded.h_apoyo, activa = excluded.activa;

delete from tareas_catalogo
 where norma_id in ('igualdad-seg','diversidad-seg') and modelo in ('Apoyo','Implantación');

insert into tareas_catalogo (norma_id, modelo, titulo, proceso, subproceso, descripcion, tipo, horas_base, orden) values
  ('igualdad-seg','Apoyo','1. Compromiso de la organización - Decisión y comunicación del compromiso · Definición del equipo de trabajo','1. Compromiso de la organización','Decisión y comunicación del compromiso · Definición del equipo de trabajo',NULL,'gestion',4,1),
  ('igualdad-seg','Apoyo','2. Comité o Comisión Permanente de Igualdad - Creación del equipo de trabajo','2. Comité o Comisión Permanente de Igualdad','Creación del equipo de trabajo',NULL,'gestion',2,2),
  ('igualdad-seg','Apoyo','3. Diagnóstico - Planificación','3. Diagnóstico','Planificación',NULL,'produccion',5,3),
  ('igualdad-seg','Apoyo','3. Diagnóstico - Recogida de información','3. Diagnóstico','Recogida de información',NULL,'produccion',5,4),
  ('igualdad-seg','Apoyo','3. Diagnóstico - Análisis y presentación de propuestas','3. Diagnóstico','Análisis y presentación de propuestas',NULL,'produccion',5,5),
  ('igualdad-seg','Apoyo','4. Programación - Elaboración del Plan de Igualdad','4. Programación','Elaboración del Plan de Igualdad',NULL,'produccion',15,6),
  ('igualdad-seg','Apoyo','4. Programación - Planificación del Plan','4. Programación','Planificación del Plan',NULL,'produccion',20,7),
  ('igualdad-seg','Apoyo','5. Implantación - Ejecución de las acciones previstas','5. Implantación','Ejecución de las acciones previstas',NULL,'produccion',5,8),
  ('igualdad-seg','Apoyo','5. Implantación - Comunicación, seguimiento y control','5. Implantación','Comunicación, seguimiento y control',NULL,'produccion',10,9),
  ('igualdad-seg','Apoyo','6. Evaluación - Análisis de los resultados obtenidos','6. Evaluación','Análisis de los resultados obtenidos',NULL,'produccion',5,10),
  ('igualdad-seg','Apoyo','6. Evaluación - Recomendaciones de mejora','6. Evaluación','Recomendaciones de mejora',NULL,'produccion',5,11),
  ('igualdad-seg','Apoyo','Medidas transversales (fases 1-6) - Comunicación interna','Medidas transversales (fases 1-6)','Comunicación interna',NULL,'coordinacion',5,12),
  ('igualdad-seg','Apoyo','Medidas transversales (fases 1-6) - Comunicación e imagen externa','Medidas transversales (fases 1-6)','Comunicación e imagen externa',NULL,'coordinacion',5,13),
  ('igualdad-seg','Apoyo','Medidas transversales (fases 1-6) - Formación','Medidas transversales (fases 1-6)','Formación',NULL,'coordinacion',5,14),
  ('igualdad-seg','Apoyo','Medidas transversales (fases 1-6) - Seguimiento','Medidas transversales (fases 1-6)','Seguimiento',NULL,'coordinacion',5,15),
  ('igualdad-seg','Apoyo','7. Seguimiento del primer año - Dos comisiones de seguimiento','7. Seguimiento del primer año','Dos comisiones de seguimiento','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',4,16),
  ('igualdad-seg','Apoyo','7. Seguimiento del primer año - Revisión de indicadores','7. Seguimiento del primer año','Revisión de indicadores','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',6,17),
  ('igualdad-seg','Apoyo','7. Seguimiento del primer año - Informe anual de seguimiento','7. Seguimiento del primer año','Informe anual de seguimiento','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',8,18),
  ('igualdad-seg','Apoyo','7. Seguimiento del primer año - Actualización del registro','7. Seguimiento del primer año','Actualización del registro','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',6,19),
  ('igualdad-seg','Implantación','1. Compromiso de la organización - Decisión y comunicación del compromiso · Definición del equipo de trabajo','1. Compromiso de la organización','Decisión y comunicación del compromiso · Definición del equipo de trabajo',NULL,'gestion',4,1),
  ('igualdad-seg','Implantación','2. Comité o Comisión Permanente de Igualdad - Creación del equipo de trabajo','2. Comité o Comisión Permanente de Igualdad','Creación del equipo de trabajo',NULL,'gestion',2,2),
  ('igualdad-seg','Implantación','3. Diagnóstico - Planificación','3. Diagnóstico','Planificación',NULL,'produccion',5,3),
  ('igualdad-seg','Implantación','3. Diagnóstico - Recogida de información','3. Diagnóstico','Recogida de información',NULL,'produccion',5,4),
  ('igualdad-seg','Implantación','3. Diagnóstico - Análisis y presentación de propuestas','3. Diagnóstico','Análisis y presentación de propuestas',NULL,'produccion',5,5),
  ('igualdad-seg','Implantación','4. Programación - Elaboración del Plan de Igualdad','4. Programación','Elaboración del Plan de Igualdad',NULL,'produccion',15,6),
  ('igualdad-seg','Implantación','4. Programación - Planificación del Plan','4. Programación','Planificación del Plan',NULL,'produccion',20,7),
  ('igualdad-seg','Implantación','5. Implantación - Ejecución de las acciones previstas','5. Implantación','Ejecución de las acciones previstas',NULL,'produccion',5,8),
  ('igualdad-seg','Implantación','5. Implantación - Comunicación, seguimiento y control','5. Implantación','Comunicación, seguimiento y control',NULL,'produccion',10,9),
  ('igualdad-seg','Implantación','6. Evaluación - Análisis de los resultados obtenidos','6. Evaluación','Análisis de los resultados obtenidos',NULL,'produccion',5,10),
  ('igualdad-seg','Implantación','6. Evaluación - Recomendaciones de mejora','6. Evaluación','Recomendaciones de mejora',NULL,'produccion',5,11),
  ('igualdad-seg','Implantación','Medidas transversales (fases 1-6) - Comunicación interna','Medidas transversales (fases 1-6)','Comunicación interna',NULL,'coordinacion',5,12),
  ('igualdad-seg','Implantación','Medidas transversales (fases 1-6) - Comunicación e imagen externa','Medidas transversales (fases 1-6)','Comunicación e imagen externa',NULL,'coordinacion',5,13),
  ('igualdad-seg','Implantación','Medidas transversales (fases 1-6) - Formación','Medidas transversales (fases 1-6)','Formación',NULL,'coordinacion',5,14),
  ('igualdad-seg','Implantación','Medidas transversales (fases 1-6) - Seguimiento','Medidas transversales (fases 1-6)','Seguimiento',NULL,'coordinacion',5,15),
  ('igualdad-seg','Implantación','7. Seguimiento del primer año - Dos comisiones de seguimiento','7. Seguimiento del primer año','Dos comisiones de seguimiento','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',4,16),
  ('igualdad-seg','Implantación','7. Seguimiento del primer año - Revisión de indicadores','7. Seguimiento del primer año','Revisión de indicadores','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',6,17),
  ('igualdad-seg','Implantación','7. Seguimiento del primer año - Informe anual de seguimiento','7. Seguimiento del primer año','Informe anual de seguimiento','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',8,18),
  ('igualdad-seg','Implantación','7. Seguimiento del primer año - Actualización del registro','7. Seguimiento del primer año','Actualización del registro','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',6,19),
  ('diversidad-seg','Apoyo','1. Compromiso de la organización - Decisión y comunicación del compromiso · Definición del equipo de trabajo','1. Compromiso de la organización','Decisión y comunicación del compromiso · Definición del equipo de trabajo',NULL,'gestion',4,1),
  ('diversidad-seg','Apoyo','2. Comité o Comisión Permanente de Diversidad - Creación del equipo de trabajo','2. Comité o Comisión Permanente de Diversidad','Creación del equipo de trabajo',NULL,'gestion',2,2),
  ('diversidad-seg','Apoyo','3. Diagnóstico - Planificación','3. Diagnóstico','Planificación',NULL,'produccion',5,3),
  ('diversidad-seg','Apoyo','3. Diagnóstico - Recogida de información','3. Diagnóstico','Recogida de información',NULL,'produccion',5,4),
  ('diversidad-seg','Apoyo','3. Diagnóstico - Análisis y presentación de propuestas','3. Diagnóstico','Análisis y presentación de propuestas',NULL,'produccion',5,5),
  ('diversidad-seg','Apoyo','3. Diagnóstico - Análisis por ejes de diversidad','3. Diagnóstico','Análisis por ejes de diversidad','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',6,6),
  ('diversidad-seg','Apoyo','3. Diagnóstico - Cumplimiento LGD y accesibilidad','3. Diagnóstico','Cumplimiento LGD y accesibilidad','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',4,7),
  ('diversidad-seg','Apoyo','3. Diagnóstico - Encuesta de clima inclusivo','3. Diagnóstico','Encuesta de clima inclusivo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,8),
  ('diversidad-seg','Apoyo','4. Programación - Elaboración del Plan de Diversidad','4. Programación','Elaboración del Plan de Diversidad',NULL,'produccion',15,9),
  ('diversidad-seg','Apoyo','4. Programación - Planificación del Plan','4. Programación','Planificación del Plan',NULL,'produccion',20,10),
  ('diversidad-seg','Apoyo','4. Programación - Medidas planificadas LGTBI y protocolo de acoso','4. Programación','Medidas planificadas LGTBI y protocolo de acoso','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',8,11),
  ('diversidad-seg','Apoyo','4. Programación - Política DEI y código de conducta','4. Programación','Política DEI y código de conducta','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,12),
  ('diversidad-seg','Apoyo','5. Implantación - Ejecución de las acciones previstas','5. Implantación','Ejecución de las acciones previstas',NULL,'produccion',5,13),
  ('diversidad-seg','Apoyo','5. Implantación - Comunicación, seguimiento y control','5. Implantación','Comunicación, seguimiento y control',NULL,'produccion',10,14),
  ('diversidad-seg','Apoyo','5. Implantación - Revisión de procesos libres de sesgo','5. Implantación','Revisión de procesos libres de sesgo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,15),
  ('diversidad-seg','Apoyo','6. Evaluación - Análisis de los resultados obtenidos','6. Evaluación','Análisis de los resultados obtenidos',NULL,'produccion',5,16),
  ('diversidad-seg','Apoyo','6. Evaluación - Recomendaciones de mejora','6. Evaluación','Recomendaciones de mejora',NULL,'produccion',5,17),
  ('diversidad-seg','Apoyo','6. Evaluación - Cuadro de indicadores DEI y reporting','6. Evaluación','Cuadro de indicadores DEI y reporting','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',4,18),
  ('diversidad-seg','Apoyo','Medidas transversales (fases 1-6) - Comunicación interna','Medidas transversales (fases 1-6)','Comunicación interna',NULL,'coordinacion',5,19),
  ('diversidad-seg','Apoyo','Medidas transversales (fases 1-6) - Comunicación e imagen externa','Medidas transversales (fases 1-6)','Comunicación e imagen externa',NULL,'coordinacion',5,20),
  ('diversidad-seg','Apoyo','Medidas transversales (fases 1-6) - Formación','Medidas transversales (fases 1-6)','Formación',NULL,'coordinacion',5,21),
  ('diversidad-seg','Apoyo','Medidas transversales (fases 1-6) - Seguimiento','Medidas transversales (fases 1-6)','Seguimiento',NULL,'coordinacion',5,22),
  ('diversidad-seg','Apoyo','Medidas transversales (fases 1-6) - Formación en sesgos inconscientes y liderazgo inclusivo','Medidas transversales (fases 1-6)','Formación en sesgos inconscientes y liderazgo inclusivo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','coordinacion',6,23),
  ('diversidad-seg','Apoyo','Medidas transversales (fases 1-6) - Guía de lenguaje y comunicación inclusiva','Medidas transversales (fases 1-6)','Guía de lenguaje y comunicación inclusiva','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','coordinacion',3,24),
  ('diversidad-seg','Apoyo','7. Seguimiento del primer año - Dos comisiones de seguimiento','7. Seguimiento del primer año','Dos comisiones de seguimiento','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',4,25),
  ('diversidad-seg','Apoyo','7. Seguimiento del primer año - Revisión de indicadores','7. Seguimiento del primer año','Revisión de indicadores','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',6,26),
  ('diversidad-seg','Apoyo','7. Seguimiento del primer año - Informe anual de seguimiento','7. Seguimiento del primer año','Informe anual de seguimiento','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',8,27),
  ('diversidad-seg','Apoyo','7. Seguimiento del primer año - Actualización del registro','7. Seguimiento del primer año','Actualización del registro','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',6,28),
  ('diversidad-seg','Implantación','1. Compromiso de la organización - Decisión y comunicación del compromiso · Definición del equipo de trabajo','1. Compromiso de la organización','Decisión y comunicación del compromiso · Definición del equipo de trabajo',NULL,'gestion',4,1),
  ('diversidad-seg','Implantación','2. Comité o Comisión Permanente de Diversidad - Creación del equipo de trabajo','2. Comité o Comisión Permanente de Diversidad','Creación del equipo de trabajo',NULL,'gestion',2,2),
  ('diversidad-seg','Implantación','3. Diagnóstico - Planificación','3. Diagnóstico','Planificación',NULL,'produccion',5,3),
  ('diversidad-seg','Implantación','3. Diagnóstico - Recogida de información','3. Diagnóstico','Recogida de información',NULL,'produccion',5,4),
  ('diversidad-seg','Implantación','3. Diagnóstico - Análisis y presentación de propuestas','3. Diagnóstico','Análisis y presentación de propuestas',NULL,'produccion',5,5),
  ('diversidad-seg','Implantación','3. Diagnóstico - Análisis por ejes de diversidad','3. Diagnóstico','Análisis por ejes de diversidad','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',6,6),
  ('diversidad-seg','Implantación','3. Diagnóstico - Cumplimiento LGD y accesibilidad','3. Diagnóstico','Cumplimiento LGD y accesibilidad','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',4,7),
  ('diversidad-seg','Implantación','3. Diagnóstico - Encuesta de clima inclusivo','3. Diagnóstico','Encuesta de clima inclusivo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,8),
  ('diversidad-seg','Implantación','4. Programación - Elaboración del Plan de Diversidad','4. Programación','Elaboración del Plan de Diversidad',NULL,'produccion',15,9),
  ('diversidad-seg','Implantación','4. Programación - Planificación del Plan','4. Programación','Planificación del Plan',NULL,'produccion',20,10),
  ('diversidad-seg','Implantación','4. Programación - Medidas planificadas LGTBI y protocolo de acoso','4. Programación','Medidas planificadas LGTBI y protocolo de acoso','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',8,11),
  ('diversidad-seg','Implantación','4. Programación - Política DEI y código de conducta','4. Programación','Política DEI y código de conducta','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,12),
  ('diversidad-seg','Implantación','5. Implantación - Ejecución de las acciones previstas','5. Implantación','Ejecución de las acciones previstas',NULL,'produccion',5,13),
  ('diversidad-seg','Implantación','5. Implantación - Comunicación, seguimiento y control','5. Implantación','Comunicación, seguimiento y control',NULL,'produccion',10,14),
  ('diversidad-seg','Implantación','5. Implantación - Revisión de procesos libres de sesgo','5. Implantación','Revisión de procesos libres de sesgo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',5,15),
  ('diversidad-seg','Implantación','6. Evaluación - Análisis de los resultados obtenidos','6. Evaluación','Análisis de los resultados obtenidos',NULL,'produccion',5,16),
  ('diversidad-seg','Implantación','6. Evaluación - Recomendaciones de mejora','6. Evaluación','Recomendaciones de mejora',NULL,'produccion',5,17),
  ('diversidad-seg','Implantación','6. Evaluación - Cuadro de indicadores DEI y reporting','6. Evaluación','Cuadro de indicadores DEI y reporting','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','produccion',4,18),
  ('diversidad-seg','Implantación','Medidas transversales (fases 1-6) - Comunicación interna','Medidas transversales (fases 1-6)','Comunicación interna',NULL,'coordinacion',5,19),
  ('diversidad-seg','Implantación','Medidas transversales (fases 1-6) - Comunicación e imagen externa','Medidas transversales (fases 1-6)','Comunicación e imagen externa',NULL,'coordinacion',5,20),
  ('diversidad-seg','Implantación','Medidas transversales (fases 1-6) - Formación','Medidas transversales (fases 1-6)','Formación',NULL,'coordinacion',5,21),
  ('diversidad-seg','Implantación','Medidas transversales (fases 1-6) - Seguimiento','Medidas transversales (fases 1-6)','Seguimiento',NULL,'coordinacion',5,22),
  ('diversidad-seg','Implantación','Medidas transversales (fases 1-6) - Formación en sesgos inconscientes y liderazgo inclusivo','Medidas transversales (fases 1-6)','Formación en sesgos inconscientes y liderazgo inclusivo','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','coordinacion',6,23),
  ('diversidad-seg','Implantación','Medidas transversales (fases 1-6) - Guía de lenguaje y comunicación inclusiva','Medidas transversales (fases 1-6)','Guía de lenguaje y comunicación inclusiva','Tarea específica del Plan de Diversidad, sin equivalente en el de Igualdad.','coordinacion',3,24),
  ('diversidad-seg','Implantación','7. Seguimiento del primer año - Dos comisiones de seguimiento','7. Seguimiento del primer año','Dos comisiones de seguimiento','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',4,25),
  ('diversidad-seg','Implantación','7. Seguimiento del primer año - Revisión de indicadores','7. Seguimiento del primer año','Revisión de indicadores','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',6,26),
  ('diversidad-seg','Implantación','7. Seguimiento del primer año - Informe anual de seguimiento','7. Seguimiento del primer año','Informe anual de seguimiento','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',8,27),
  ('diversidad-seg','Implantación','7. Seguimiento del primer año - Actualización del registro','7. Seguimiento del primer año','Actualización del registro','Acompañamiento del primer año. Horas estimadas, pendientes de confirmar.','coordinacion',6,28);

select norma_id, modelo, count(*) tareas, sum(horas_base) horas
  from tareas_catalogo where norma_id like '%-seg'
 group by norma_id, modelo order by norma_id, modelo;
