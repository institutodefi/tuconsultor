-- ════════════════════════════════════════════════════════════════════════════
-- v145 · Vista `anexo_catalogo` · lo mínimo para pintar el Anexo I
--
-- El visitante de la web ve la propuesta en pantalla antes de recibir el PDF, y
-- esa pantalla monta el anexo con el mismo código que el servidor. Pero `anon`
-- no puede leer `tareas_catalogo` —ni debe: ahí están las horas base, las
-- definiciones y las subtareas—, así que el anexo salía vacío en pantalla y
-- completo en el PDF. Dos documentos distintos para el mismo cliente.
--
-- La vista expone solo lo que el anexo enseña: proceso, subproceso y orden. Sin
-- horas, sin coste, sin definiciones. Es exactamente lo que el cliente ya lee
-- en su oferta, así que no descubre nada que no fuera a recibir.
-- ════════════════════════════════════════════════════════════════════════════

create or replace view anexo_catalogo
  with (security_invoker = off) as
  select norma_id, modelo, proceso, subproceso, titulo, orden
    from tareas_catalogo;

grant select on anexo_catalogo to anon, authenticated;
