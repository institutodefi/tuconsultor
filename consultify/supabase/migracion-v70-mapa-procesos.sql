-- ═══════════════════════════════════════════════════════════════════════════
-- v70 · MAPA DE PROCESOS DE TUCONSULTOR
--
-- El mapa completo tal cual lo definió Fátima Ballesteros (V0, 12/02/2026):
-- 3 bloques, 13 procesos y 43 subprocesos.
--
-- Se guarda de DOS formas a propósito:
--
--   · `mapa_procesos` conserva el JSON ÍNTEGRO y versionado. Es la referencia:
--     bloques, disposición, entrada y salida, todo. De aquí se reconstruye.
--   · `procesos_internos` y `procesos_internos_sub` lo despliegan en filas, que
--     es lo que necesitan la agenda y los informes.
--
-- Si el mapa cambia, se sube una versión nueva del JSON y se vuelven a
-- desplegar las tablas. El JSON manda; las tablas son su proyección.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.mapa_procesos (
  id          uuid primary key default gen_random_uuid(),
  version     text not null,
  organizacion text,
  sistema     text,
  responsable text,
  fecha       date,
  entrada     text,
  salida      text,
  mapa        jsonb not null,
  vigente     boolean not null default false,
  creado      timestamptz not null default now()
);
create unique index if not exists mapa_procesos_version on public.mapa_procesos (version);
-- Solo un mapa vigente a la vez: si hay dos, nadie sabe cuál rige.
create unique index if not exists mapa_procesos_un_vigente on public.mapa_procesos (vigente) where vigente;

alter table public.mapa_procesos enable row level security;
drop policy if exists mapa_procesos_lectura on public.mapa_procesos;
create policy mapa_procesos_lectura on public.mapa_procesos for select to authenticated using (true);
drop policy if exists mapa_procesos_escritura on public.mapa_procesos;
create policy mapa_procesos_escritura on public.mapa_procesos for all to authenticated
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo is true
                   and p.rol in ('superadmin','admin','director')))
  with check (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo is true
                   and p.rol in ('superadmin','admin','director')));

-- ── Subprocesos: la tabla plana no los contemplaba ──
create table if not exists public.procesos_internos_sub (
  id        uuid primary key default gen_random_uuid(),
  proceso   text not null,          -- código del proceso padre (PE1, PO2…)
  codigo    text,                   -- 8 de los 43 no tienen código asignado
  nombre    text not null,
  orden     int not null default 100,
  activo    boolean not null default true
);
create unique index if not exists procesos_sub_unico on public.procesos_internos_sub (proceso, nombre);
create index if not exists procesos_sub_proceso on public.procesos_internos_sub (proceso, orden);

alter table public.procesos_internos_sub enable row level security;
drop policy if exists procesos_sub_lectura on public.procesos_internos_sub;
create policy procesos_sub_lectura on public.procesos_internos_sub for select to authenticated using (true);
drop policy if exists procesos_sub_escritura on public.procesos_internos_sub;
create policy procesos_sub_escritura on public.procesos_internos_sub for all to authenticated
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo is true
                   and p.rol in ('superadmin','admin','director')))
  with check (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo is true
                   and p.rol in ('superadmin','admin','director')));

-- ═══ El mapa íntegro ═══════════════════════════════════════════════════════
update public.mapa_procesos set vigente = false;
insert into public.mapa_procesos (version, organizacion, sistema, responsable, fecha, entrada, salida, mapa, vigente)
values ('V0', 'TuConsultor', 'Diseño Sistema de Gestión TuConsultor',
        'Fátima Ballesteros', '2026-02-12',
        'Necesidades y expectativas grupos de interés', 'Satisfacción grupos de interés',
        $mapa${"meta": {"titulo": "Mapa de procesos", "organizacion": "TuConsultor", "sistema": "Diseño Sistema de Gestión TuConsultor", "version": "V0", "fecha": "2026-02-12", "responsable": "Fátima Ballesteros"}, "entrada": "Necesidades y expectativas grupos de interés", "salida": "Satisfacción grupos de interés", "bloques": [{"id": "estrategicos", "nombre": "Procesos estratégicos", "disposicion": "columnas", "procesos": [{"codigo": "PE1", "nombre": "Planificación estratégica", "subprocesos": [{"codigo": "S1 PE1", "nombre": "Gestión del contexto y partes interesadas"}, {"codigo": "S2 PE1", "nombre": "Gestión de riesgos"}, {"codigo": "S3 PE1", "nombre": "Gestión de estrategia, políticas y objetivos"}]}, {"codigo": "PE2", "nombre": "Evaluación del desempeño", "subprocesos": [{"codigo": "S1 PE2", "nombre": "Análisis de datos"}, {"codigo": "S2 PE2", "nombre": "Auditoría interna"}, {"codigo": "S3 PE2", "nombre": "Revisión por la dirección"}]}, {"codigo": "PE3", "nombre": "Mejora continua", "subprocesos": [{"codigo": "S1 PE3", "nombre": "Gestión de no conformidades"}, {"codigo": "S2 PE3", "nombre": "Mejora continua"}]}]}, {"id": "operativos", "nombre": "Procesos operativos", "disposicion": "filas", "procesos": [{"codigo": "PO1", "nombre": "Gestión de la formación", "subprocesos": [{"codigo": "S1 PO1", "nombre": "Gestión de oportunidades"}, {"codigo": "S2 PO1", "nombre": "Diseño de propuesta"}, {"codigo": "S3 PO1", "nombre": "Gestión comercial"}, {"codigo": "S4 PO1", "nombre": "Desarrollo de proyectos de formación"}, {"codigo": "S5 PO1", "nombre": "Evaluación de lecciones aprendidas e innovación"}, {"codigo": "S6 PO1", "nombre": "Gestión experiencia de cliente de formación"}]}, {"codigo": "PO2", "nombre": "Gestión de consultoría", "subprocesos": [{"codigo": "S1 PO2", "nombre": "Gestión de oportunidades"}, {"codigo": "S2 PO2", "nombre": "Diseño de propuesta"}, {"codigo": "S3 PO2", "nombre": "Gestión comercial"}, {"codigo": "S4 PO2", "nombre": "Ejecución proyecto de consultoría"}, {"codigo": "S5 PO2", "nombre": "Evaluación de lecciones aprendidas e innovación"}, {"codigo": "S6 PO2", "nombre": "Gestión experiencia de cliente de consultoría"}]}, {"codigo": "PO3", "nombre": "Gestión de evaluaciones", "subprocesos": [{"codigo": "S1 PO3", "nombre": "Oferta"}, {"codigo": "S2 PO3", "nombre": "Evaluación"}, {"codigo": "S3 PO3", "nombre": "Informe"}, {"codigo": "S4 PO3", "nombre": "Certificación"}]}]}, {"id": "apoyo", "nombre": "Procesos de apoyo", "disposicion": "columnas", "procesos": [{"codigo": "PA1", "nombre": "Gestión de personas", "subprocesos": [{"codigo": "S1 PA1", "nombre": "Gestión de puestos y roles"}, {"codigo": "S2 PA1", "nombre": "Desarrollo de personas"}, {"codigo": "S3 PA1", "nombre": "Gestión relación laboral, seguridad y salud"}]}, {"codigo": "PA2", "nombre": "Gestión medioambiental", "subprocesos": [{"codigo": "S1 PA2", "nombre": "Identificación de aspectos ambientales"}, {"codigo": "S2 PA2", "nombre": "Gestión de vertidos y residuos"}]}, {"codigo": "PA3", "nombre": "Gestión del conocimiento", "subprocesos": [{"codigo": "S1 PA3", "nombre": "Gestión de información documental"}, {"codigo": "S2 PA3", "nombre": "Control legal"}]}, {"codigo": "PA4", "nombre": "Gestión de infraestructuras", "subprocesos": [{"codigo": null, "nombre": "Mantenimiento de infraestructuras"}, {"codigo": null, "nombre": "Seguridad física y gestión de emergencias"}, {"codigo": null, "nombre": "Gestión de activos"}, {"codigo": null, "nombre": "Licencias"}]}, {"codigo": "PA5", "nombre": "Gestión de seguridad de la información", "subprocesos": [{"codigo": null, "nombre": "Gestión seguridad operacional"}, {"codigo": null, "nombre": "Gestión seguridad lógica"}, {"codigo": null, "nombre": "Gestión continuidad de negocio"}, {"codigo": null, "nombre": "Gestión seguridad de datos"}]}, {"codigo": "PA6", "nombre": "Gestión de partes subcontratadas", "subprocesos": [{"codigo": "S1 PA6", "nombre": "Homologación de proveedores"}, {"codigo": "S2 PA6", "nombre": "Evaluación de proveedores"}]}, {"codigo": "PA7", "nombre": "Gestión económica y administrativa", "subprocesos": [{"codigo": "S1 PA7", "nombre": "Gestión económica"}, {"codigo": "S2 PA7", "nombre": "Gestión administrativa"}]}]}]}$mapa$::jsonb, true)
on conflict (version) do update
  set mapa = excluded.mapa, vigente = true, responsable = excluded.responsable,
      entrada = excluded.entrada, salida = excluded.salida;

-- ═══ Proyección: procesos ══════════════════════════════════════════════════
insert into public.procesos_internos (codigo, nombre, descripcion, color, orden, activo) values

  ('PE1', 'Planificación estratégica', 'Procesos estratégicos', '#F99001', 10, true),
  ('PE2', 'Evaluación del desempeño', 'Procesos estratégicos', '#F99001', 20, true),
  ('PE3', 'Mejora continua', 'Procesos estratégicos', '#F99001', 30, true),
  ('PO1', 'Gestión de la formación', 'Procesos operativos', '#1FA1A6', 40, true),
  ('PO2', 'Gestión de consultoría', 'Procesos operativos', '#1FA1A6', 50, true),
  ('PO3', 'Gestión de evaluaciones', 'Procesos operativos', '#1FA1A6', 60, true),
  ('PA1', 'Gestión de personas', 'Procesos de apoyo', '#014695', 70, true),
  ('PA2', 'Gestión medioambiental', 'Procesos de apoyo', '#014695', 80, true),
  ('PA3', 'Gestión del conocimiento', 'Procesos de apoyo', '#014695', 90, true),
  ('PA4', 'Gestión de infraestructuras', 'Procesos de apoyo', '#014695', 100, true),
  ('PA5', 'Gestión de seguridad de la información', 'Procesos de apoyo', '#014695', 110, true),
  ('PA6', 'Gestión de partes subcontratadas', 'Procesos de apoyo', '#014695', 120, true),
  ('PA7', 'Gestión económica y administrativa', 'Procesos de apoyo', '#014695', 130, true)
on conflict (codigo) do update
  set nombre = excluded.nombre, descripcion = excluded.descripcion,
      color = excluded.color, orden = excluded.orden, activo = excluded.activo;

-- ═══ Proyección: subprocesos ═══════════════════════════════════════════════
delete from public.procesos_internos_sub where proceso in (select codigo from public.procesos_internos);
insert into public.procesos_internos_sub (proceso, codigo, nombre, orden) values

  ('PE1', 'S1 PE1', 'Gestión del contexto y partes interesadas', 10),
  ('PE1', 'S2 PE1', 'Gestión de riesgos', 20),
  ('PE1', 'S3 PE1', 'Gestión de estrategia, políticas y objetivos', 30),
  ('PE2', 'S1 PE2', 'Análisis de datos', 10),
  ('PE2', 'S2 PE2', 'Auditoría interna', 20),
  ('PE2', 'S3 PE2', 'Revisión por la dirección', 30),
  ('PE3', 'S1 PE3', 'Gestión de no conformidades', 10),
  ('PE3', 'S2 PE3', 'Mejora continua', 20),
  ('PO1', 'S1 PO1', 'Gestión de oportunidades', 10),
  ('PO1', 'S2 PO1', 'Diseño de propuesta', 20),
  ('PO1', 'S3 PO1', 'Gestión comercial', 30),
  ('PO1', 'S4 PO1', 'Desarrollo de proyectos de formación', 40),
  ('PO1', 'S5 PO1', 'Evaluación de lecciones aprendidas e innovación', 50),
  ('PO1', 'S6 PO1', 'Gestión experiencia de cliente de formación', 60),
  ('PO2', 'S1 PO2', 'Gestión de oportunidades', 10),
  ('PO2', 'S2 PO2', 'Diseño de propuesta', 20),
  ('PO2', 'S3 PO2', 'Gestión comercial', 30),
  ('PO2', 'S4 PO2', 'Ejecución proyecto de consultoría', 40),
  ('PO2', 'S5 PO2', 'Evaluación de lecciones aprendidas e innovación', 50),
  ('PO2', 'S6 PO2', 'Gestión experiencia de cliente de consultoría', 60),
  ('PO3', 'S1 PO3', 'Oferta', 10),
  ('PO3', 'S2 PO3', 'Evaluación', 20),
  ('PO3', 'S3 PO3', 'Informe', 30),
  ('PO3', 'S4 PO3', 'Certificación', 40),
  ('PA1', 'S1 PA1', 'Gestión de puestos y roles', 10),
  ('PA1', 'S2 PA1', 'Desarrollo de personas', 20),
  ('PA1', 'S3 PA1', 'Gestión relación laboral, seguridad y salud', 30),
  ('PA2', 'S1 PA2', 'Identificación de aspectos ambientales', 10),
  ('PA2', 'S2 PA2', 'Gestión de vertidos y residuos', 20),
  ('PA3', 'S1 PA3', 'Gestión de información documental', 10),
  ('PA3', 'S2 PA3', 'Control legal', 20),
  ('PA4', NULL, 'Mantenimiento de infraestructuras', 10),
  ('PA4', NULL, 'Seguridad física y gestión de emergencias', 20),
  ('PA4', NULL, 'Gestión de activos', 30),
  ('PA4', NULL, 'Licencias', 40),
  ('PA5', NULL, 'Gestión seguridad operacional', 10),
  ('PA5', NULL, 'Gestión seguridad lógica', 20),
  ('PA5', NULL, 'Gestión continuidad de negocio', 30),
  ('PA5', NULL, 'Gestión seguridad de datos', 40),
  ('PA6', 'S1 PA6', 'Homologación de proveedores', 10),
  ('PA6', 'S2 PA6', 'Evaluación de proveedores', 20),
  ('PA7', 'S1 PA7', 'Gestión económica', 10),
  ('PA7', 'S2 PA7', 'Gestión administrativa', 20);

notify pgrst, 'reload schema';

select (select count(*) from public.procesos_internos) as procesos,
       (select count(*) from public.procesos_internos_sub) as subprocesos,
       (select version from public.mapa_procesos where vigente) as mapa_vigente;
