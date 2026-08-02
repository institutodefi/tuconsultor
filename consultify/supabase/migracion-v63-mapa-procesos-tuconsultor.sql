-- ═══════════════════════════════════════════════════════════════════════════
-- v63 · MAPA DE PROCESOS REAL DE TUCONSULTOR
--
-- Cargado desde mapa-procesos.json:
--   Diseño Sistema de Gestión TuConsultor · versión V0 · 2026-02-12
--   Responsable: Fátima Ballesteros
--
--   Entrada: Necesidades y expectativas grupos de interés
--   Salida:  Satisfacción grupos de interés
--
-- 3 bandas · 13 procesos · 43 subprocesos
--
-- Es IDEMPOTENTE: se puede volver a ejecutar. Los procesos se identifican por
-- su código (PE1, PO2, PA7…) y los subprocesos por código dentro de su proceso.
-- Ojo: 8 subprocesos vienen sin código en el origen —los de PA4 y PA5—; se les
-- asigna uno derivado del orden (S1 PA4, S2 PA4…) para que no queden sin
-- identificar. Si ya tenéis códigos oficiales para esos ocho, cambiadlos aquí.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1 · Bandas ──
-- Orden importante: primero se reetiquetan los prefijos que dejó la v50
-- ('ESTR', 'CLAVE', 'APOYO'), DESPUÉS se deduplica, y solo entonces se insertan
-- los que falten. Al revés se crean bandas duplicadas con el mismo prefijo y el
-- alta de procesos falla con «ON CONFLICT DO UPDATE cannot affect row a second time».
update public.procesos_bandas set prefijo = 'PE' where prefijo = 'ESTR';
update public.procesos_bandas set prefijo = 'PO' where prefijo = 'CLAVE';
update public.procesos_bandas set prefijo = 'PA' where prefijo = 'APOYO';

-- Si ya hubiera duplicados de una ejecución anterior, se conserva la más
-- antigua y los procesos de las demás se reasignan a ella antes de borrarlas.
with conservadas as (
  select distinct on (prefijo) id, prefijo
    from public.procesos_bandas order by prefijo, creado_en nulls first, id
)
update public.procesos_internos p
   set banda_id = c.id
  from public.procesos_bandas b
  join conservadas c on c.prefijo = b.prefijo
 where p.banda_id = b.id and b.id <> c.id;

delete from public.procesos_bandas b
 where exists (select 1 from public.procesos_bandas o
                where o.prefijo = b.prefijo
                  and (o.creado_en, o.id) < (b.creado_en, b.id));

-- Con los duplicados fuera ya se puede exigir que el prefijo sea único.
create unique index if not exists procesos_bandas_prefijo_unico on public.procesos_bandas (prefijo);

insert into public.procesos_bandas (titulo, prefijo, color, orden) values
  ('Procesos estratégicos', 'PE', '#0A2A6C', 10),
  ('Procesos operativos',   'PO', '#1FA1A6', 20),
  ('Procesos de apoyo',     'PA', '#F99001', 30)
on conflict (prefijo) do update
   set titulo = excluded.titulo, color = excluded.color, orden = excluded.orden;

-- ── 2 · Procesos ──

-- Procesos estratégicos (columnas)
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PE1', 'Planificación estratégica', '#0A2A6C', 10, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PE' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PE2', 'Evaluación del desempeño', '#0A2A6C', 20, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PE' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PE3', 'Mejora continua', '#0A2A6C', 30, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PE' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;

-- Procesos operativos (filas)
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PO1', 'Gestión de la formación', '#1FA1A6', 10, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PO' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PO2', 'Gestión de consultoría', '#1FA1A6', 20, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PO' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PO3', 'Gestión de evaluaciones', '#1FA1A6', 30, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PO' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;

-- Procesos de apoyo (columnas)
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PA1', 'Gestión de personas', '#F99001', 10, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PA' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PA2', 'Gestión medioambiental', '#F99001', 20, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PA' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PA3', 'Gestión del conocimiento', '#F99001', 30, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PA' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PA4', 'Gestión de infraestructuras', '#F99001', 40, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PA' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PA5', 'Gestión de seguridad de la información', '#F99001', 50, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PA' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PA6', 'Gestión de partes subcontratadas', '#F99001', 60, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PA' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;
insert into public.procesos_internos (codigo, nombre, color, orden, activo, banda_id)
select 'PA7', 'Gestión económica y administrativa', '#F99001', 70, true, ba.id
  from public.procesos_bandas ba where ba.prefijo = 'PA' limit 1
on conflict (codigo) do update
   set nombre = excluded.nombre, color = excluded.color, orden = excluded.orden,
       banda_id = excluded.banda_id, activo = true;

-- ── 3 · Subprocesos ──
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PE1', 'Gestión del contexto y partes interesadas', 10
  from public.procesos_internos pr where pr.codigo = 'PE1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PE1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PE1', 'Gestión de riesgos', 20
  from public.procesos_internos pr where pr.codigo = 'PE1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PE1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S3 PE1', 'Gestión de estrategia, políticas y objetivos', 30
  from public.procesos_internos pr where pr.codigo = 'PE1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S3 PE1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PE2', 'Análisis de datos', 10
  from public.procesos_internos pr where pr.codigo = 'PE2'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PE2');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PE2', 'Auditoría interna', 20
  from public.procesos_internos pr where pr.codigo = 'PE2'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PE2');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S3 PE2', 'Revisión por la dirección', 30
  from public.procesos_internos pr where pr.codigo = 'PE2'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S3 PE2');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PE3', 'Gestión de no conformidades', 10
  from public.procesos_internos pr where pr.codigo = 'PE3'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PE3');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PE3', 'Mejora continua', 20
  from public.procesos_internos pr where pr.codigo = 'PE3'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PE3');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PO1', 'Gestión de oportunidades', 10
  from public.procesos_internos pr where pr.codigo = 'PO1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PO1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PO1', 'Diseño de propuesta', 20
  from public.procesos_internos pr where pr.codigo = 'PO1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PO1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S3 PO1', 'Gestión comercial', 30
  from public.procesos_internos pr where pr.codigo = 'PO1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S3 PO1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S4 PO1', 'Desarrollo de proyectos de formación', 40
  from public.procesos_internos pr where pr.codigo = 'PO1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S4 PO1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S5 PO1', 'Evaluación de lecciones aprendidas e innovación', 50
  from public.procesos_internos pr where pr.codigo = 'PO1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S5 PO1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S6 PO1', 'Gestión experiencia de cliente de formación', 60
  from public.procesos_internos pr where pr.codigo = 'PO1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S6 PO1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PO2', 'Gestión de oportunidades', 10
  from public.procesos_internos pr where pr.codigo = 'PO2'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PO2');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PO2', 'Diseño de propuesta', 20
  from public.procesos_internos pr where pr.codigo = 'PO2'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PO2');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S3 PO2', 'Gestión comercial', 30
  from public.procesos_internos pr where pr.codigo = 'PO2'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S3 PO2');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S4 PO2', 'Ejecución proyecto de consultoría', 40
  from public.procesos_internos pr where pr.codigo = 'PO2'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S4 PO2');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S5 PO2', 'Evaluación de lecciones aprendidas e innovación', 50
  from public.procesos_internos pr where pr.codigo = 'PO2'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S5 PO2');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S6 PO2', 'Gestión experiencia de cliente de consultoría', 60
  from public.procesos_internos pr where pr.codigo = 'PO2'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S6 PO2');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PO3', 'Oferta', 10
  from public.procesos_internos pr where pr.codigo = 'PO3'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PO3');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PO3', 'Evaluación', 20
  from public.procesos_internos pr where pr.codigo = 'PO3'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PO3');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S3 PO3', 'Informe', 30
  from public.procesos_internos pr where pr.codigo = 'PO3'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S3 PO3');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S4 PO3', 'Certificación', 40
  from public.procesos_internos pr where pr.codigo = 'PO3'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S4 PO3');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PA1', 'Gestión de puestos y roles', 10
  from public.procesos_internos pr where pr.codigo = 'PA1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PA1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PA1', 'Desarrollo de personas', 20
  from public.procesos_internos pr where pr.codigo = 'PA1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PA1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S3 PA1', 'Gestión relación laboral, seguridad y salud', 30
  from public.procesos_internos pr where pr.codigo = 'PA1'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S3 PA1');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PA2', 'Identificación de aspectos ambientales', 10
  from public.procesos_internos pr where pr.codigo = 'PA2'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PA2');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PA2', 'Gestión de vertidos y residuos', 20
  from public.procesos_internos pr where pr.codigo = 'PA2'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PA2');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PA3', 'Gestión de información documental', 10
  from public.procesos_internos pr where pr.codigo = 'PA3'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PA3');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PA3', 'Control legal', 20
  from public.procesos_internos pr where pr.codigo = 'PA3'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PA3');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PA4', 'Mantenimiento de infraestructuras', 10
  from public.procesos_internos pr where pr.codigo = 'PA4'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PA4');   -- código derivado: el origen no lo traía
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PA4', 'Seguridad física y gestión de emergencias', 20
  from public.procesos_internos pr where pr.codigo = 'PA4'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PA4');   -- código derivado: el origen no lo traía
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S3 PA4', 'Gestión de activos', 30
  from public.procesos_internos pr where pr.codigo = 'PA4'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S3 PA4');   -- código derivado: el origen no lo traía
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S4 PA4', 'Licencias', 40
  from public.procesos_internos pr where pr.codigo = 'PA4'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S4 PA4');   -- código derivado: el origen no lo traía
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PA5', 'Gestión seguridad operacional', 10
  from public.procesos_internos pr where pr.codigo = 'PA5'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PA5');   -- código derivado: el origen no lo traía
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PA5', 'Gestión seguridad lógica', 20
  from public.procesos_internos pr where pr.codigo = 'PA5'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PA5');   -- código derivado: el origen no lo traía
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S3 PA5', 'Gestión continuidad de negocio', 30
  from public.procesos_internos pr where pr.codigo = 'PA5'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S3 PA5');   -- código derivado: el origen no lo traía
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S4 PA5', 'Gestión seguridad de datos', 40
  from public.procesos_internos pr where pr.codigo = 'PA5'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S4 PA5');   -- código derivado: el origen no lo traía
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PA6', 'Homologación de proveedores', 10
  from public.procesos_internos pr where pr.codigo = 'PA6'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PA6');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PA6', 'Evaluación de proveedores', 20
  from public.procesos_internos pr where pr.codigo = 'PA6'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PA6');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S1 PA7', 'Gestión económica', 10
  from public.procesos_internos pr where pr.codigo = 'PA7'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S1 PA7');
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, orden)
select pr.id, 'S2 PA7', 'Gestión administrativa', 20
  from public.procesos_internos pr where pr.codigo = 'PA7'
  and not exists (select 1 from public.procesos_subprocesos x
                   where x.proceso_id = pr.id and x.codigo = 'S2 PA7');

-- Si un subproceso ya existía con ese código, se refresca el nombre.
update public.procesos_subprocesos s
   set nombre = v.nombre, orden = v.orden
  from (values
    ('S1 PE1', 'Gestión del contexto y partes interesadas', 10),
    ('S2 PE1', 'Gestión de riesgos', 20),
    ('S3 PE1', 'Gestión de estrategia, políticas y objetivos', 30),
    ('S1 PE2', 'Análisis de datos', 10),
    ('S2 PE2', 'Auditoría interna', 20),
    ('S3 PE2', 'Revisión por la dirección', 30),
    ('S1 PE3', 'Gestión de no conformidades', 10),
    ('S2 PE3', 'Mejora continua', 20),
    ('S1 PO1', 'Gestión de oportunidades', 10),
    ('S2 PO1', 'Diseño de propuesta', 20),
    ('S3 PO1', 'Gestión comercial', 30),
    ('S4 PO1', 'Desarrollo de proyectos de formación', 40),
    ('S5 PO1', 'Evaluación de lecciones aprendidas e innovación', 50),
    ('S6 PO1', 'Gestión experiencia de cliente de formación', 60),
    ('S1 PO2', 'Gestión de oportunidades', 10),
    ('S2 PO2', 'Diseño de propuesta', 20),
    ('S3 PO2', 'Gestión comercial', 30),
    ('S4 PO2', 'Ejecución proyecto de consultoría', 40),
    ('S5 PO2', 'Evaluación de lecciones aprendidas e innovación', 50),
    ('S6 PO2', 'Gestión experiencia de cliente de consultoría', 60),
    ('S1 PO3', 'Oferta', 10),
    ('S2 PO3', 'Evaluación', 20),
    ('S3 PO3', 'Informe', 30),
    ('S4 PO3', 'Certificación', 40),
    ('S1 PA1', 'Gestión de puestos y roles', 10),
    ('S2 PA1', 'Desarrollo de personas', 20),
    ('S3 PA1', 'Gestión relación laboral, seguridad y salud', 30),
    ('S1 PA2', 'Identificación de aspectos ambientales', 10),
    ('S2 PA2', 'Gestión de vertidos y residuos', 20),
    ('S1 PA3', 'Gestión de información documental', 10),
    ('S2 PA3', 'Control legal', 20),
    ('S1 PA4', 'Mantenimiento de infraestructuras', 10),
    ('S2 PA4', 'Seguridad física y gestión de emergencias', 20),
    ('S3 PA4', 'Gestión de activos', 30),
    ('S4 PA4', 'Licencias', 40),
    ('S1 PA5', 'Gestión seguridad operacional', 10),
    ('S2 PA5', 'Gestión seguridad lógica', 20),
    ('S3 PA5', 'Gestión continuidad de negocio', 30),
    ('S4 PA5', 'Gestión seguridad de datos', 40),
    ('S1 PA6', 'Homologación de proveedores', 10),
    ('S2 PA6', 'Evaluación de proveedores', 20),
    ('S1 PA7', 'Gestión económica', 10),
    ('S2 PA7', 'Gestión administrativa', 20)
  ) as v(codigo, nombre, orden)
 where s.codigo = v.codigo;

commit;

notify pgrst, 'reload schema';

-- ── Comprobación ──
select ba.prefijo, ba.titulo, count(distinct pr.id) as procesos, count(sp.id) as subprocesos
  from public.procesos_bandas ba
  left join public.procesos_internos pr on pr.banda_id = ba.id
  left join public.procesos_subprocesos sp on sp.proceso_id = pr.id
 group by ba.prefijo, ba.titulo, ba.orden order by ba.orden;