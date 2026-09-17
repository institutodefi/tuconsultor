-- ════════════════════════════════════════════════════════════════════════════
-- v152 · ROL COMERCIAL Y CARTERA DE CUENTAS
--
-- Del informe de Rafael Galobart (16/09/2026), dos cosas que sí son ciertas:
-- no existe un rol comercial, y las cuentas no tienen dueño.
--
-- La segunda tenía trampa: la columna `empresas.asignado_a` EXISTE desde hace
-- tiempo, con su clave ajena a `perfiles` y todo. Lo que no existe es una sola
-- pantalla que la lea o la escriba, así que está vacía en las 75 empresas. No
-- había que crear el concepto: había que usarlo.
--
-- ⚠ De paso, un fallo que llevaba tiempo ahí: la restricción `perfiles_rol_check`
-- NO incluía 'director', un rol que la aplicación usa desde hace versiones.
-- Cualquier intento de guardar un perfil de dirección fallaba contra la base.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1 · Los roles que la aplicación usa de verdad ───────────────────────────
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check
  check (rol = any (array['cliente', 'consultor', 'comercial', 'gestion', 'director', 'admin', 'superadmin']));

comment on column perfiles.rol is
  'cliente · consultor (entrega) · comercial (capta y vende) · gestion · director · admin · superadmin. El antiguo apaño de rol=gestion + subtipo=comercial queda para los perfiles que ya lo tuvieran; los nuevos van con rol=comercial.';

-- ── 2 · La cartera: quién es el dueño de cada cuenta ────────────────────────
-- La columna y su clave ajena ya existían. Lo que falta es poder preguntar
-- «mis cuentas» sin recorrer la tabla entera.
create index if not exists empresas_asignado_a_idx on empresas (asignado_a) where asignado_a is not null;

comment on column empresas.asignado_a is
  'Responsable comercial de la cuenta: quien la trabaja y a quien se le cuenta. Se rellena solo al dar de alta una empresa desde un usuario comercial, y se puede reasignar a mano. Distinto del jefe de cuenta de entrega (clientes.jefe_cuenta_id), que es quien responde del proyecto.';
