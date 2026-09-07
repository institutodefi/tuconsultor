-- =============================================================================
-- MIGRACIÓN v129 · Erratas en los nombres de procesos y subprocesos
--
-- «IDENTIFIACIÓN», «GESTION» sin tilde, abreviaturas ilegibles para el cliente
-- («GESTIÓN DE EST, POLT Y OBJ», «INFORMAC. DOC.», «GI») y el «S1PA7 GESTIÓN
-- ADMINISTRATIVA» que en realidad es el S2 PA7. Se corrigen en el catálogo
-- (tareas_catalogo), en las tareas ya volcadas a proyectos (cliente_tareas) y
-- en su reflejo en agenda (agenda_tareas), en todos los campos de texto donde
-- aparecen. El código de la tarea no cambia.
--
-- Después de v128. Idempotente (replace no hace nada si ya está corregido).
-- =============================================================================
begin;

do $$
declare f record;
begin
  for f in select * from (values
    ('S1 PA2 IDENTIFIACIÓN Y EVALUACION DE ASPECTOS AMBIENTALES', 'S1 PA2 IDENTIFICACIÓN Y EVALUACIÓN DE ASPECTOS AMBIENTALES'),
    ('S1 PA5 GESTION SEGURIDAD OPERACIONAL', 'S1 PA5 GESTIÓN DE LA SEGURIDAD OPERACIONAL'),
    ('S2 PA2 GESTION DE VERTIDOS RESIDUOS', 'S2 PA2 GESTIÓN DE VERTIDOS Y RESIDUOS'),
    ('S2 PA5 GESTION SEGURIDAD LÓGICA', 'S2 PA5 GESTIÓN DE LA SEGURIDAD LÓGICA'),
    ('S3 PA5 GESTION CONTINUIDAD DE NEGOCIO', 'S3 PA5 GESTIÓN DE LA CONTINUIDAD DE NEGOCIO'),
    ('S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS', 'S4 PA4 SEGURIDAD FÍSICA Y GESTIÓN DE EMERGENCIAS'),
    ('S4 PA5 GESTIÓN SEGURIDAD DATOS', 'S4 PA5 GESTIÓN DE LA SEGURIDAD DE LOS DATOS'),
    ('S1PA7 GESTIÓN ADMINISTRATIVA', 'S2 PA7 GESTIÓN ADMINISTRATIVA'),
    ('S1 PA3 GESTIÓN INFORMAC. DOC.', 'S1 PA3 GESTIÓN DE LA INFORMACIÓN DOCUMENTADA'),
    ('S3 PE1 GESTIÓN DE EST, POLT Y OBJ', 'S3 PE1 GESTIÓN DE ESTRATEGIA, POLÍTICA Y OBJETIVOS'),
    ('S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD', 'S3 PA1 GESTIÓN DE RELACIONES LABORALES, SEGURIDAD Y SALUD'),
    ('S1 PE1 GESTIÓN DEL CONTEXTO Y GI', 'S1 PE1 GESTIÓN DEL CONTEXTO Y GRUPOS DE INTERÉS'),
    ('S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS', 'S1 PA4 MANTENIMIENTO DE INFRAESTRUCTURAS'),
    ('S2 PA1 DESARROLLO PERSONAS', 'S2 PA1 DESARROLLO DE PERSONAS'),
    ('PA4 GESTIÓN INFRAESTRUCTURAS', 'PA4 GESTIÓN DE INFRAESTRUCTURAS'),
    ('PE2 EVALUACIÓN DESEMPEÑO', 'PE2 EVALUACIÓN DEL DESEMPEÑO'),
    ('PA8 GESTIÓN DE PI Y VIGILANCIA', 'PA8 GESTIÓN DE PROPIEDAD INTELECTUAL Y VIGILANCIA')
  ) as t(a, b) loop
    update public.tareas_catalogo
       set titulo = replace(titulo, f.a, f.b), proceso = replace(proceso, f.a, f.b),
           subproceso = replace(subproceso, f.a, f.b), descripcion = replace(descripcion, f.a, f.b)
     where titulo like '%' || f.a || '%' or proceso like '%' || f.a || '%' or subproceso like '%' || f.a || '%' or descripcion like '%' || f.a || '%';
    update public.cliente_tareas
       set titulo = replace(titulo, f.a, f.b), proceso = replace(proceso, f.a, f.b),
           subproceso = replace(subproceso, f.a, f.b), titulo_origen = replace(titulo_origen, f.a, f.b)
     where titulo like '%' || f.a || '%' or proceso like '%' || f.a || '%' or subproceso like '%' || f.a || '%' or titulo_origen like '%' || f.a || '%';
    update public.agenda_tareas
       set titulo = replace(titulo, f.a, f.b), proceso = replace(proceso, f.a, f.b), subproceso = replace(subproceso, f.a, f.b)
     where titulo like '%' || f.a || '%' or proceso like '%' || f.a || '%' or subproceso like '%' || f.a || '%';
  end loop;
end $$;

-- Las tareas del S2 PA7 que heredaron la checklist del S1 PA7 (v122) toman la suya.
update public.cliente_tareas
   set subtareas = '[{"texto": "Procedimiento gestión administrativa", "hecha": false}]'::jsonb
 where upper(subproceso) like 'S2 PA7%' and subtareas::text like '%gestión económica%' and subtareas::text not like '%"hecha": true%';

commit;
