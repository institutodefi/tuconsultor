-- v122 · Semilla de subtareas del catálogo (Estructura proyecto / tareas, Excel 05/04/2024).
--
-- Rellena `tareas_catalogo.subtareas` de cada subproceso (por su código: S1 PE1,
-- S2 PA4…) SOLO donde esté vacío: lo que ya se haya escrito en Sistemas de
-- gestión no se toca. Las subtareas propias de una norma (aspectos ambientales,
-- SOA, PRL…) solo entran en las filas de esa norma. Aplicar después de la v121.

begin;

-- S1 PE1 · S1 PE1 GESTIÓN DEL CONTEXTO PARTES INTERESADAS
update public.tareas_catalogo set subtareas = '[{"texto": "Contexto interno y externo"}, {"texto": "Ecosistema"}, {"texto": "Necesidades y expectativas de partes interesadas"}, {"texto": "Revisión mapa de procesos"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PE1\y' and norma_id in ('9001', '14001', '45001', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');
update public.tareas_catalogo set subtareas = '[{"texto": "Contexto interno y externo"}, {"texto": "Ecosistema"}, {"texto": "Necesidades y expectativas de partes interesadas"}, {"texto": "Revisión mapa de procesos"}, {"texto": "SOA / declaración de aplicabilidad"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PE1\y' and norma_id in ('27001', '27701');

-- S2 PE1 · S2 PE1 GESTIÓN DEL RIESGO
update public.tareas_catalogo set subtareas = '[{"texto": "Evaluación riesgos estratégicos"}, {"texto": "Evaluación de riesgos operativos"}, {"texto": "Plan de acción de riesgos"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PE1\y' and norma_id in ('9001', '45001', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');
update public.tareas_catalogo set subtareas = '[{"texto": "Evaluación riesgos estratégicos"}, {"texto": "Evaluación de riesgos operativos"}, {"texto": "Evaluación de aspectos ambientales"}, {"texto": "Plan de acción de riesgos"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PE1\y' and norma_id in ('14001');
update public.tareas_catalogo set subtareas = '[{"texto": "Evaluación riesgos estratégicos"}, {"texto": "Evaluación de riesgos operativos"}, {"texto": "Evaluación de riesgos seguridad información"}, {"texto": "Plan de acción de riesgos"}, {"texto": "Plan de tratamiento de riesgos seguridad información"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PE1\y' and norma_id in ('27001', '27701');

-- S3 PE1 · S3 PE1 GESTIÓN DE EST, POLT Y OBJ
update public.tareas_catalogo set subtareas = '[{"texto": "Política de gestión integrada"}, {"texto": "Política de calidad"}, {"texto": "Política compliance"}, {"texto": "Código ético"}, {"texto": "Objetivos de calidad"}, {"texto": "Política de igualdad"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PE1\y' and norma_id in ('9001');
update public.tareas_catalogo set subtareas = '[{"texto": "Política de gestión integrada"}, {"texto": "Política compliance"}, {"texto": "Código ético"}, {"texto": "Objetivos medioambiente"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PE1\y' and norma_id in ('14001');
update public.tareas_catalogo set subtareas = '[{"texto": "Política de gestión integrada"}, {"texto": "Política de PRL"}, {"texto": "Política compliance"}, {"texto": "Código ético"}, {"texto": "Objetivos de seguridad y salud"}, {"texto": "Política de igualdad"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PE1\y' and norma_id in ('45001');
update public.tareas_catalogo set subtareas = '[{"texto": "Política de gestión integrada"}, {"texto": "Política compliance"}, {"texto": "Código ético"}, {"texto": "Políticas específicas contraseñas"}, {"texto": "Políticas específicas cookies"}, {"texto": "Políticas específicas gestión activos"}, {"texto": "Políticas específicas equipos, dispositivos móviles y extraibles"}, {"texto": "Políticas específicas privacidad"}, {"texto": "Políticas específicas software de explotación"}, {"texto": "Políticas específicas entorno desarrollo seguro"}, {"texto": "Políticas específicas monitorización"}, {"texto": "Políticas específicas arquitectura segura"}, {"texto": "Políticas específicas cifrado de información"}, {"texto": "Políticas específicas mantenimiento de sistemas"}, {"texto": "Políticas específicas servicios en la nube"}, {"texto": "Políticas específicas accesos permisos"}, {"texto": "Políticas específicas gestión de recursos"}, {"texto": "Políticas específicas personas de seguridad de la información"}, {"texto": "Políticas específicas redes sociales"}, {"texto": "Políticas específicas relación de terceros"}, {"texto": "Políticas específicas seguridad física"}, {"texto": "Políticas específicas seguridad lógica"}, {"texto": "Políticas específicas wifi"}, {"texto": "Políticas específicas control de impresoras"}, {"texto": "Objetivos de seguridad de la información"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PE1\y' and norma_id in ('27001', '27701');
update public.tareas_catalogo set subtareas = '[{"texto": "Política de gestión integrada"}, {"texto": "Política compliance"}, {"texto": "Código ético"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PE1\y' and norma_id in ('42001', '56001', 'madridexcelente');
update public.tareas_catalogo set subtareas = '[{"texto": "Política de gestión integrada"}, {"texto": "Política de calidad"}, {"texto": "Política compliance"}, {"texto": "Código ético"}, {"texto": "Objetivos de calidad"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PE1\y' and norma_id in ('21001', '9004', 'une93200', 'une158101', 'une66181');
update public.tareas_catalogo set subtareas = '[{"texto": "Política de gestión integrada"}, {"texto": "Política compliance"}, {"texto": "Código ético"}, {"texto": "Política de igualdad"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PE1\y' and norma_id in ('igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg');

-- S1 PE2 · S1 PE2 ANÁLISIS DE DATOS
update public.tareas_catalogo set subtareas = '[{"texto": "Actualización de cuadro de mando operaciones"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PE2\y' and norma_id in ('9001', '21001', '9004', 'une93200', 'une158101', 'une66181');
update public.tareas_catalogo set subtareas = '[{"texto": "Actualización de cuadro de mando de consumos e impactos"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PE2\y' and norma_id in ('14001');
update public.tareas_catalogo set subtareas = '[{"texto": "Actualización cuadro de mando seguridad y salud"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PE2\y' and norma_id in ('45001');
update public.tareas_catalogo set subtareas = '[{"texto": "Actualización de cuadro de mando de seguridad de la información"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PE2\y' and norma_id in ('27001', '27701');

-- S2 PE2 · S2 PE2 AUDITORÍA INTERNA
update public.tareas_catalogo set subtareas = '[{"texto": "Planificación, realización e informe de auditoria interna"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PE2\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S3 PE2 · S3 PE2 REVISIÓN POR LA DIRECCIÓN
update public.tareas_catalogo set subtareas = '[{"texto": "Elaboración de acta de revisión por la dirección"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PE2\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S1 PE3 · S1 PE3 GESTIÓN DE NO CONFORMIDADES
update public.tareas_catalogo set subtareas = '[{"texto": "Registro y cierre de no conformidades"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PE3\y' and norma_id in ('9001', '14001', '45001', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');
update public.tareas_catalogo set subtareas = '[{"texto": "Registro y cierre de no conformidades"}, {"texto": "Gestión de incidentes de seguridad"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PE3\y' and norma_id in ('27001', '27701');

-- S2 PE3 · S2 PE3 MEJORA CONTINUA
update public.tareas_catalogo set subtareas = '[{"texto": "Proyectos de mejora"}, {"texto": "Gestión de quejas y reclamaciones"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PE3\y' and norma_id in ('9001', '21001', '9004', 'une93200', 'une158101', 'une66181');
update public.tareas_catalogo set subtareas = '[{"texto": "Proyectos de mejora"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PE3\y' and norma_id in ('14001', '45001', '27001', '27701', '42001', '56001', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S1 PA1 · S1 PA1 GESTIÓN DE PUESTOS Y ROLES
update public.tareas_catalogo set subtareas = '[{"texto": "Definición de perfiles"}, {"texto": "Organigrama"}, {"texto": "Roles y responsabilidades"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PA1\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S2 PA1 · S2 PA1 DESARROLLO PERSONAS
update public.tareas_catalogo set subtareas = '[{"texto": "Plan de formación"}, {"texto": "Plan de sensibilización"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PA1\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S3 PA1 · S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD
update public.tareas_catalogo set subtareas = '[{"texto": "Vinculación y desvinculación"}, {"texto": "Clima laboral"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PA1\y' and norma_id in ('9001', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg');
update public.tareas_catalogo set subtareas = '[{"texto": "Vinculación y desvinculación"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PA1\y' and norma_id in ('14001', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'madridexcelente');
update public.tareas_catalogo set subtareas = '[{"texto": "Vinculación y desvinculación"}, {"texto": "Evaluación de riesgos"}, {"texto": "Planificación accion preventiva"}, {"texto": "Memoria de actividades de prevención"}, {"texto": "Ofrecimiento reconocimiento médico"}, {"texto": "Recibí epis"}, {"texto": "Clima laboral"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PA1\y' and norma_id in ('45001');
update public.tareas_catalogo set subtareas = '[{"texto": "Vinculación y desvinculación"}, {"texto": "Recibí activos"}, {"texto": "Comunicación y aceptación de políticas"}, {"texto": "Acuerdo de confidencialidad"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PA1\y' and norma_id in ('27001', '27701');

-- S2 PA2 · S2 PA2 GESTION DE VERTIDOS RESIDUOS
update public.tareas_catalogo set subtareas = '[{"texto": "Papel"}, {"texto": "RAES"}, {"texto": "Toner"}, {"texto": "Vertidos"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PA2\y' and norma_id in ('14001');

-- S1 PA3 · S1 PA3 GESTIÓN INFORMAC. DOC.
update public.tareas_catalogo set subtareas = '[{"texto": "Listado de información documentada"}, {"texto": "Procedimiento de información documentada"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PA3\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S2 PA3 · S2 PA3 CONTROL LEGAL
update public.tareas_catalogo set subtareas = '[{"texto": "Identificación y evaluacion de requisitos legales"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PA3\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S1 PA4 · S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS
update public.tareas_catalogo set subtareas = '[{"texto": "Revisión rite"}, {"texto": "Revisión aire acondicionado"}, {"texto": "Revisión extintores anual"}, {"texto": "Revisión extintores trimestral"}, {"texto": "Revisión alarma"}, {"texto": "Revisión equipo electrógenos"}, {"texto": "Revisión eléctrica"}, {"texto": "Revisión de ascensores"}, {"texto": "Legionela"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PA4\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S2 PA4 · S2 PA4 LICENCIAS
update public.tareas_catalogo set subtareas = '[{"texto": "Certificado baja/ media/ alta tensión"}, {"texto": "Licencia de actividad"}, {"texto": "Licencia de apertura"}, {"texto": "Comunicación de apertura"}, {"texto": "IAE"}, {"texto": "Censo"}, {"texto": "Contrato de alquiler/ propiedad"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PA4\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S3 PA4 · S3 PA4 GESTIÓN DE ACTIVOS
update public.tareas_catalogo set subtareas = '[{"texto": "Inventario de activos"}, {"texto": "Etiquetado"}, {"texto": "Mantenimiento de equipos informáticos"}, {"texto": "Gestión de SW"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PA4\y' and norma_id in ('27001', '27701');

-- S4 PA4 · S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS
update public.tareas_catalogo set subtareas = '[{"texto": "Planos"}, {"texto": "Seguros"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S4\s+PA4\y' and norma_id in ('9001', '14001', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');
update public.tareas_catalogo set subtareas = '[{"texto": "Plan de emergencias"}, {"texto": "Simulacro de emergencias"}, {"texto": "Planos"}, {"texto": "Seguros"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S4\s+PA4\y' and norma_id in ('45001');
update public.tareas_catalogo set subtareas = '[{"texto": "Control de acceso"}, {"texto": "Planos"}, {"texto": "Seguros"}, {"texto": "Cableado"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S4\s+PA4\y' and norma_id in ('27001', '27701');

-- S1 PA5 · S1 PA5 GESTION SEGURIDAD OPERACIONAL
update public.tareas_catalogo set subtareas = '[{"texto": "Procedimiento de la seguridad operacional"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PA5\y' and norma_id in ('27001', '27701');

-- S2 PA5 · S2 PA5 GESTION SEGURIDAD LÓGICA
update public.tareas_catalogo set subtareas = '[{"texto": "Mapa de red"}, {"texto": "Control de accesos lógico"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PA5\y' and norma_id in ('27001', '27701');

-- S3 PA5 · S3 PA5 GESTION CONTINUIDAD DE NEGOCIO
update public.tareas_catalogo set subtareas = '[{"texto": "Plan de continuidad"}, {"texto": "Procedimiento de continuidad"}, {"texto": "Planificación de simulacro continuidad de negocio"}, {"texto": "Simulacro de continuidad"}, {"texto": "Informe simulacro de continuidad"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S3\s+PA5\y' and norma_id in ('27001', '27701');

-- S4 PA5 · S4 PA5 GESTIÓN SEGURIDAD DATOS
update public.tareas_catalogo set subtareas = '[{"texto": "Procedimiento tratamiento de datos"}, {"texto": "Procedimiento brechas de seguridad de datos"}, {"texto": "Registro de actividades"}, {"texto": "Procedimiento ejercicio de derechos"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S4\s+PA5\y' and norma_id in ('27001', '27701');

-- S1 PA6 · S1 PA6 HOMOLOGACIÓN PROVEEDORES
update public.tareas_catalogo set subtareas = '[{"texto": "Procedimiento homologación"}, {"texto": "Registro homologación"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PA6\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S2 PA6 · S2 PA6 EVALUACIÓN PROVEEDORES
update public.tareas_catalogo set subtareas = '[{"texto": "Procedimiento evaluación de proveedores"}, {"texto": "Registro evaluación de proveedores"}, {"texto": "Comunicación proveedores"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2\s+PA6\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S1 PA7 · S1 PA7 GESTIÓN ECONÓMICA
update public.tareas_catalogo set subtareas = '[{"texto": "Presupuesto"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1\s+PA7\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S1PA7 · S1PA7 GESTIÓN ADMINISTRATIVA
update public.tareas_catalogo set subtareas = '[{"texto": "Procedimiento gestión económica"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S1PA7\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

-- S2PA7 · S2PA7 GESTIÓN ADMINISTRATIVA
update public.tareas_catalogo set subtareas = '[{"texto": "Procedimiento gestión administrativa"}]'::jsonb
  where (subtareas is null or subtareas = '[]'::jsonb) and upper(subproceso) ~ '^S2PA7\y' and norma_id in ('9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', 'une93200', 'une158101', 'une66181', 'igualdad', 'diversidad', 'igualdad-seg', 'diversidad-seg', 'madridexcelente');

commit;
