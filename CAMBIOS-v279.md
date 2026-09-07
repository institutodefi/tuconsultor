# Cambios v279 · 7 de septiembre de 2026

## Órbita · Control de horas por consultor
- `consultify/app/src/portal/consultores/ControlHoras.jsx` · **pantalla nueva** (`/consultores/control-horas`, menú «Agendas › Control de horas»). Una ficha por consultor: proyectos asignados y, por cada uno, horas comprometidas, programadas, ejecutadas, pendientes y sin programar; total; carga mensual exigida (pendientes ÷ meses que quedan) frente a la capacidad de producción del mes; veredicto «le entra otro proyecto / va justo / sin capacidad»; barras de las tres bolsas del mes. Dirección y administración ven a todo el equipo; consultoría, su ficha.
- `consultify/app/src/lib/controlHoras.js` · el cálculo, en funciones puras. Reparto de las horas de un proyecto entre su equipo (tarea con consultor → suya; el resto, entre quienes ejecutan, en proporción a `horas_asignadas` o a partes iguales).
- `consultify/app/src/lib/jornada.js` · **nuevo**: lo que era la parte pura de `agenda.js` (convenio, festivos, capacidad) sin dependencia de Supabase, para poder probarlo desde Node. `agenda.js` lo reexporta: nada cambia para quien importaba de ahí.
- `scripts/test-control-horas.mjs` · 41 comprobaciones (capacidad por mes con festivos, vacaciones e intensiva de verano; reparto entre equipo; caso real CECE + DICS; veredicto).
- `consultify/app/src/portal/consultores/Dashboard.jsx` · la tarjeta «Carga del equipo» usa el mismo cálculo (antes: 150 h/mes fijas y solo tareas con consultor asignado, que casi nunca lo tienen) y enlaza al control de horas.

## Reparto de la jornada: 70 / 10 / 20
- `consultify/app/src/lib/jornada.js` · 70 % proyectos, 10 % gestión y coordinación, 20 % procesos internos (antes cuatro bolsas: 70/10/10/10). La coordinación cuenta dentro de gestión; las tareas antiguas de tipo `coordinacion` no se pierden.
- El reparto se lee de `parametros_precio` (grupo `jornada`) al arrancar, con `reglasComerciales.cargarReglas()`: se puede ajustar sin desplegar.
- `perfiles.pct_jornada` (v116): porcentaje de jornada de cada persona. Se edita en **Accesos** (invitación y edición de perfil). `netlify/functions/admin-usuarios.mjs` lo guarda; si la migración no está aplicada, guarda el resto y avisa.

## Tareas de gestión y procesos internos en el calendario
- `consultify/app/src/portal/consultores/TareasInternas.jsx` · **nuevo**, en Mi agenda. El consultor crea tareas de gestión y coordinación o de procesos internos (elige el proceso —y subproceso— del mapa de procesos del portal), les pone horas previstas y las programa en sesiones con el mismo calendario que las tareas de proyecto. Enseña cuánto lleva de cada bolsa este mes.
- `consultify/supabase/migracion-v116-control-horas-y-tareas-internas.sql` · **pendiente de aplicar**. Tabla `tareas_internas`, columna `tarea_sesiones.tarea_interna_id`, `perfiles.pct_jornada`, parámetros del reparto, vista `v_horas_consultor_mes`, y lectura de `procesos_internos` también para dirección. Probada en seco contra producción (transacción con rollback).
- `components/MisSesiones.jsx`, `portal/consultores/AgendaTareas.jsx`, `portal/consultores/Inicio.jsx` · las sesiones de tareas internas aparecen en Mi agenda, en la agenda del equipo y en Inicio, con la etiqueta de su bolsa (G · PI).
- `portal/consultores/SesionesTarea.jsx` · admite `campoTarea="tarea_interna_id"` y propone al propio consultor como responsable.
- `portal/consultores/MiAgenda.jsx` · capacidad real de los meses elegidos (laborables × convenio × % jornada × 70 %) en vez de 160 h fijas; desglose en tres bolsas.
- `lib/agenda.js` · capa de datos de `tareas_internas` y vacaciones de todo el equipo. Datos de demo para proyectos, equipo, tareas y sesiones (`lib/supabase.js`, `lib/data.js`).

## Pendiente
- Aplicar `migracion-v115-suelos-y-cliente-antiguo.sql` (si no se ha hecho), `migracion-v116-control-horas-y-tareas-internas.sql` y `migracion-v117-iso-27701.sql`, en ese orden.
- Revisar en Accesos el % de jornada de cada persona (todas quedan al 100 %).

## Normas · ISO 27701 (privacidad de la información)
- `consultify/app/src/lib/calcEngine.js` · nueva norma `27701` (ISO 27701, J2, 55 h de apoyo), complementaria de la 27001: contratada con ella cuesta el 70 %.
- `consultify/app/src/lib/catalogoTareas.js` · 20 tareas por modelo (92 / 92 / 116 / 148 / 55,2 h). Las del mapa común llevan lo que la 27701 añade al SGSI; las cinco de **PA19 Gestión de la privacidad** son las propias: registro de tratamientos, EIPD, derechos, brechas y transferencias.
- `consultify/app/src/lib/codigos.js` · abreviatura `277` en el código de proyecto.
- `consultify/netlify/functions/catalogo-anexo.mjs`, `generar-oferta.mjs` · el anexo de la oferta incluye las tareas de la 27701 (bloque «Gestión de la privacidad»). `brevo-lead.mjs` · atributo `ISO_27701`.
- `consultify/supabase/migracion-v117-iso-27701.sql` · **pendiente de aplicar** (tras la v116): `normas_catalogo`, 100 filas en `tareas_catalogo` y `codigo_proyecto` con `277`. Probada en seco contra producción.
- La web ya tenía su página (`/areas/ciberseguridad/iso-27701.html`) y su imagen social; no se toca.

## Corrección · tareas de otro proyecto al cambiar de proyecto
- `consultify/app/src/portal/consultores/ProyectosConfig.jsx` · al pasar de un proyecto a otro había un render en el que el proyecto ya era el nuevo pero las normas y el modelo en pantalla eran los del anterior; el volcado automático metió 24 tareas de Diversidad (Implantación) en CECE. Ahora el volcado espera a que la configuración cargada sea la de ese proyecto (`configPara`) y, además, filtra las candidatas contra las normas y el modelo del proyecto guardado (`candidatasDelProyecto`): nada de otra norma ni de otro modelo entra en un proyecto. Las 24 tareas erróneas de CECE se han borrado (no tenían sesiones).

## CRM · documentos sin esperar al primer proyecto
- `portal/consultores/FichaEmpresa.jsx`, `portal/consultores/CarteraEmpresa.jsx` · la ficha de `clientes` (de la que cuelgan documentos y proyectos) se crea en cuanto hace falta si la empresa está dada de alta como cliente en el CRM: al abrir la pestaña Documentos, o al pulsar «+ Nuevo proyecto». Por CIF (o nombre), sin duplicar (`asegurarCliente`). Si la empresa no es cliente, lo dice y pide marcarla.
