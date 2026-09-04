import { useEffect, useMemo, useState } from 'react';
import { listAll, updateRow, deleteRow , explicarErrorBd } from '../../lib/data.js';
import { LEYENDA_IMPUESTOS } from '../../lib/impuestos.js';
import { useAuth } from '../../lib/auth.jsx';
import { NORMA_BY_ID, NORMAS, MODELO_IDS, calcular, fmtEUR , pagoAdelantado } from '../../lib/calcEngine.js';
import { precioClienteAntiguo } from '../../lib/reglasComerciales.js';
import { COMPLEJIDADES } from '../../lib/proyecto.js';
import { MODELOS_PROYECTO } from '../../lib/planificacion.js';
import EstadosOferta, { etapaDe, ETAPAS } from '../../components/EstadosOferta.jsx';
import ContratoDeOferta from './ContratoDeOferta.jsx';
import { DISCLAIMER_CORTO } from '../../lib/legal.js';
import DialogoFicha from '../../components/DialogoFicha.jsx';
import ImportarContacto from '../../components/ImportarContacto.jsx';
import DatoEspejo, { AvisoDesfase } from '../../components/DatoEspejo.jsx';
import { normalizarCif } from '../../lib/crm.js';

/** dd/mm/aa, corto, para que quepan tres fechas en una celda. */
function fFecha(f) {
  if (!f) return '—';
  const d = new Date(`${String(f).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '—'
    : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/**
 * Fin sugerido según el modelo.
 *   · recurrentes → doce meses y UN DÍA: con el fin en el mismo día del mes, el
 *     contrato se queda a un día de cubrir los doce meses completos y el plazo
 *     sale de once, que bloquea la emisión.
 *   · Apoyo e Implantación → doce meses, como punto de partida a ajustar.
 *
 * Se formatea en hora local: `toISOString()` pasa a UTC y en España retrocede
 * al día anterior, que es de donde venía el desfase.
 */
function finSugerido(fechaISO, manual) {
  if (!fechaISO) return '';
  const d = new Date(`${String(fechaISO).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const dia = d.getDate();
  d.setMonth(d.getMonth() + 12);
  if (d.getDate() < dia) d.setDate(0);      // 31 ene → 28 feb
  if (!manual) d.setDate(d.getDate() + 1);  // el día que completa el contrato
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-${String(d.getDate()).padStart(2, '0')}`;
}

// Histórico interno de ofertas (todas las del equipo).
export default function Ofertas() {
  const { role } = useAuth();
  const puedeBorrar = role === 'superadmin' || role === 'admin'; // solo administradores
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [genId, setGenId] = useState(null);
  const [editNormas, setEditNormas] = useState(null); // { oferta, normas:[] } cuando se editan normas
  const [edicion, setEdicion] = useState(null);       // edición completa de la oferta
  const [avisoPrecio, setAvisoPrecio] = useState(null);  // el motor da hoy otro precio
  const [contratos, setContratos] = useState([]);
  const [etapa, setEtapa] = useState(null);              // filtro del embudo

  const cargar = () => Promise.all([
    listAll('presupuestos', 'creado').then(setRows).catch(() => setRows([])),
    listAll('contratos', 'creado').then(setContratos).catch(() => setContratos([])),
  ]);
  useEffect(() => { cargar(); }, []);

  // Abrir la edición completa de una oferta. Lo llaman el lápiz de la tabla y
  // los enlaces que llegan desde la ficha de empresa.
  const abrirEdicion = (r) => {
    setEdicion({
      ...r, normas: [...(r.normas || [])], sedes: r.sedes || 1, complejidad: r.complejidad || 'media',
      precios_sistema: r.precios_sistema || {},
      // Las banderas de decisión de precio son de esta sesión de edición, no
      // del registro: se limpian al abrir para que el aviso vuelva a saltar.
      _precioDecidido: false, _mantenerPrecio: false,
    });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Llegada desde otra pantalla: /consultores/ofertas?oferta=ID abre esa oferta
  // en edición, y ?empresa=NOMBRE deja el buscador filtrado por ese cliente.
  // Sin esto, desde la ficha de empresa solo se podía llegar al listado entero
  // y volver a buscar a mano lo que ya se sabía.
  const [urlAplicada, setUrlAplicada] = useState(false);
  useEffect(() => {
    if (!rows || urlAplicada) return;
    const p = new URLSearchParams(window.location.search);
    const id = p.get('oferta');
    const emp = p.get('empresa');
    if (emp) setQ(emp);
    if (id) {
      const r = rows.find((x) => String(x.id) === String(id));
      if (r) abrirEdicion(r);
      else setMsg('No se encontró esa oferta. Puede que se haya eliminado.');
    }
    setUrlAplicada(true);
  }, [rows, urlAplicada]);

  const [msg, setMsg] = useState(null);

  async function generar(r, { forzarPrecioNuevo = false } = {}) {
    // ── Una oferta ya emitida se regenera CON SU PRECIO, no con el de hoy ──
    // El motor cambia: tarifas, horas por norma, solapes. Si al regenerar se
    // recalculara, saldría un documento con el mismo número de oferta y otro
    // importe que el que recibió el cliente. Por eso se manda el precio guardado
    // como override, y solo se recalcula si se pide expresamente.
    const emitida = !!r.numero_oferta && Number.isFinite(Number(r.precio));
    if (emitida && !forzarPrecioNuevo) {
      try {
        const hoy = calcular(r.normas || [], r.modelo, {
          meses: r.meses, complejidad: r.complejidad, sedes: r.sedes,
          // Con los mismos parámetros que se guardaron: si no, el aviso saltaba
          // por una diferencia que no existe.
          fasesPlan: r.fases_plan || undefined, ajustes: r.ajustes || [],
          preciosSistema: r.cliente_antiguo ? (r.precios_sistema || null) : null,
          aplicarReglas: r.aplicar_reglas !== false,
        });
        if (hoy && Math.abs(hoy.precioCatalogo - Number(r.precio)) > 0.5) {
          setAvisoPrecio({ oferta: r, guardado: Number(r.precio), hoy: hoy.precioCatalogo });
          return;   // no se regenera hasta que se decida cuál de los dos
        }
      } catch { /* si no se puede comparar, se sigue con el guardado */ }
    }

    setGenId(r.id); setMsg(null);
    try {
      const resp = await fetch('/.netlify/functions/generar-oferta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          normas: r.normas, modelo: r.modelo, meses: r.meses,
          empresa: r.empresa || '', contacto: r.nombre || '', cif: r.cif || '', cargo: r.cargo || '',
          ref: r.numero_oferta || '', comercial: r.comercial || 'Alejandro',
          email: r.email || '', presupuesto_id: r.id,
          complejidad: r.complejidad, sedes: r.sedes,
          // Las fechas guardadas mandan: si no se envían, el cuadro de
          // facturación se recalcula desde hoy y no desde el inicio real.
          fecha_emision: r.fecha_emision || null,
          fecha_inicio: r.fecha_inicio || null,
          fecha_primer_pago: r.fecha_primer_pago || r.fecha_inicio || null,
          fecha_fin: r.fecha_fin || null,
          fecha_certificacion: r.fecha_certificacion || null,
          // Todo lo que condiciona el precio, para que el documento salga igual
          // que lo que enseña el CRM.
          fases_plan: r.fases_plan || null,
          ajustes: r.ajustes || [],
          precios_sistema: r.cliente_antiguo ? (r.precios_sistema || null) : null,
          aplicar_reglas: r.aplicar_reglas !== false,
          pago_adelantado: !!r.pago_adelantado,
          // El precio que se emitió manda sobre el que calcularía hoy el motor.
          ...(emitida && !forzarPrecioNuevo ? { override: { precioCatalogo: Number(r.precio) } } : {}),
        }),
      });
      let j = null; try { j = await resp.json(); } catch { j = null; }
      if (j && j.ok) {
        setRows(rs => rs.map(x => x.id === r.id ? { ...x, url_pdf: j.url_pdf, url_pptx: j.url_pptx, numero_oferta: j.numero_oferta || x.numero_oferta } : x));
        setMsg(`✓ Oferta ${j.numero_oferta || r.numero_oferta} generada. PDF y PPT listos.`);
      } else {
        setMsg(`No se pudo generar la oferta (${j?.error || `código ${resp.status}`}).`);
      }
    } catch (e) { setMsg('Error de conexión al generar la oferta.'); }
    setGenId(null);
  }

  // ETAPA 2: enviar la oferta YA generada (sin regenerar el documento).
  async function enviar(r) {
    if (!r.email) { setMsg('Esta oferta no tiene email de cliente; edítala para añadirlo.'); return; }
    if (!r.url_pdf) { setMsg('Genera primero la oferta (no hay PDF que enviar).'); return; }
    if (!window.confirm(`¿Enviar la oferta ${r.numero_oferta || ''} a ${r.email}?`)) return;
    setGenId(r.id); setMsg(null);
    try {
      const resp = await fetch('/.netlify/functions/generar-oferta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enviar_existente',
          url_pdf: r.url_pdf, email: r.email, empresa: r.empresa || '', contacto: r.nombre || '',
          comercial: r.comercial || 'Alejandro', numero_oferta: r.numero_oferta || '', normas: r.normas || [],
        }),
      });
      let j = null; try { j = await resp.json(); } catch { j = null; }
      if (j && j.ok) setMsg(`✓ Oferta ${r.numero_oferta || ''} enviada a ${r.email}.`);
      else setMsg(`No se pudo enviar (${j?.error || `código ${resp.status}`}).`);
    } catch (e) { setMsg('Error de conexión al enviar.'); }
    setGenId(null);
  }

  // Borrar una oferta (solo administradores). Acción irreversible → doble confirmación.
  async function borrar(r) {
    if (!puedeBorrar) return;
    const etiqueta = `${r.numero_oferta || 'sin nº'} · ${r.empresa || 'sin empresa'}`;
    if (!window.confirm(`¿Eliminar definitivamente la oferta ${etiqueta}?\n\nEsta acción no se puede deshacer.`)) return;
    setGenId(r.id); setMsg(null);
    try {
      await deleteRow('presupuestos', r.id);
      setRows(rs => rs.filter(x => x.id !== r.id));
      setMsg(`Oferta ${etiqueta} eliminada.`);
    } catch (e) {
      setMsg(`No se pudo eliminar la oferta: ${e?.message || e}`);
    }
    setGenId(null);
  }

  // ── Edición completa ──────────────────────────────────────────────────────
  // Se edita lo que define el encargo, se recalcula con el mismo motor que la
  // calculadora y se regeneran los documentos. Guardar sin regenerar deja el PDF
  // del cliente diciendo una cosa y el CRM otra, así que se avisa.
  async function guardarEdicion(regenerar) {
    const e = edicion;
    if (!e.empresa?.trim()) { setMsg('Falta el nombre de la empresa.'); return; }
    if (!e.normas.length)   { setMsg('Elige al menos un sistema.'); return; }
    setMsg(null);
    try {
      // Fases y ajustes TIENEN que ir: sin ellos el motor recalcula con el plan
      // entero y sin el trato pactado, y una oferta de 10.296 € se convertía en
      // 14.553 € al guardarla sin que nadie tocara el alcance.
      const calc = calcular(e.normas, e.modelo, {
        meses: e.meses, complejidad: e.complejidad, sedes: e.sedes,
        fasesPlan: e.fases_plan || undefined, ajustes: e.ajustes || [],
        preciosSistema: e.cliente_antiguo ? (e.precios_sistema || null) : null,
        aplicarReglas: e.aplicar_reglas !== false,
      });

      // ── El precio de una oferta EMITIDA no se pisa al guardar ──
      // `precio: calc.precioCatalogo` recalculaba siempre, así que corregir un
      // teléfono cambiaba el importe de una oferta ya enviada. Con el cambio de
      // regla de precios de v207 el salto es enorme: una de 537 €/mes pasaba a
      // 945 € por guardar cualquier campo.
      //
      // Ahora, si el precio de hoy difiere del emitido, se pregunta. El aviso
      // ya existía para «↻ Regenerar»; faltaba aquí, que es por donde se toca
      // la oferta de verdad.
      const yaEmitida = !!e.numero_oferta && Number.isFinite(Number(e.precio));
      const difiere = yaEmitida && Math.abs(calc.precioCatalogo - Number(e.precio)) > 0.5;
      if (difiere && !e._precioDecidido) {
        setAvisoPrecio({
          oferta: e, guardado: Number(e.precio), hoy: calc.precioCatalogo, alGuardar: regenerar,
        });
        return;   // no se guarda nada hasta que se decida qué precio vale
      }
      // Si se decidió mantener el emitido, ese es el que se guarda y se manda.
      const precioFinal = e._mantenerPrecio ? Number(e.precio) : calc.precioCatalogo;
      const completo = [e.contacto_nombre, e.contacto_apellidos].filter(Boolean).join(' ').trim();
      const patch = {
        empresa: e.empresa.trim(),
        nombre: completo || e.nombre?.trim() || null,
        contacto_nombre: e.contacto_nombre?.trim() || null,
        contacto_apellidos: e.contacto_apellidos?.trim() || null,
        cargo: e.cargo?.trim() || null, cif: e.cif?.trim() || null,
        notas_oferta: e.notas_oferta || null, notas_internas: e.notas_internas || null,
        email: e.email?.trim() || null, telefono: e.telefono?.trim() || null,
        normas: e.normas, modelo: e.modelo, tipo: calc.tipo, precio: precioFinal,
        complejidad: e.complejidad || null, sedes: e.sedes || 1,
        fecha_emision: e.fecha_emision || null,
        fecha_inicio: e.fecha_inicio || null,
        fecha_primer_pago: e.fecha_primer_pago || e.fecha_inicio || null,
        fecha_fin: e.fecha_fin || (e.fecha_inicio ? finSugerido(e.fecha_inicio, finManual) : null),
        fecha_certificacion: e.fecha_certificacion || null,
        contacto_id: e.contacto_id || null,
        pago_adelantado: !!e.pago_adelantado,
        cliente_antiguo: !!e.cliente_antiguo,
        precios_sistema: e.cliente_antiguo && Object.keys(e.precios_sistema || {}).length
          ? e.precios_sistema : null,
        aplicar_reglas: e.aplicar_reglas !== false,
      };
      await updateRow('presupuestos', e.id, patch);
      setRows((rs) => rs.map((x) => (x.id === e.id ? { ...x, ...patch } : x)));
      setEdicion(null);
      setMsg(`Oferta actualizada · ${fmtEUR(precioFinal)}${calc.tipo === 'mes' ? '/mes' : ''}`
        + (e._mantenerPrecio ? ' (se mantuvo el precio emitido).' : '.'));
      if (regenerar) {
        setGenId(e.id);
        const resp = await fetch('/.netlify/functions/generar-oferta', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            normas: e.normas, modelo: e.modelo, meses: e.meses,
            empresa: patch.empresa, contacto: patch.nombre || '', cif: e.cif || '',
            // El CARGO faltaba: el PDF lo imprime junto al nombre («Consoli
            // Sánchez · Directora») y al regenerar salía solo el nombre, aunque
            // el cargo estuviera guardado en el CRM.
            cargo: patch.cargo || '',
            ref: e.numero_oferta || '', email: patch.email || '', telefono: patch.telefono || '',
            complejidad: e.complejidad, sedes: e.sedes, presupuesto_id: e.id,
            fecha_emision: patch.fecha_emision, fecha_inicio: patch.fecha_inicio,
            fecha_primer_pago: patch.fecha_primer_pago, fecha_fin: patch.fecha_fin,
            fecha_certificacion: patch.fecha_certificacion,
            // Sin estos tres el backend recalcula con el plan entero, sin el
            // trato pactado y sin la tarifa del cliente antiguo: el PDF salía
            // con un importe distinto al que acabábamos de guardar.
            fases_plan: e.fases_plan || null,
            ajustes: e.ajustes || [],
            precios_sistema: patch.precios_sistema,
            pago_adelantado: patch.pago_adelantado,
            // Y el override cierra el asunto: manda el precio que se guardó.
            override: {
              precioCatalogo: precioFinal,
              horas: calc.horas, hTotal: calc.hTotal,
              reglas: (calc.reglas || []).map((x) => ({ nombre: x.nombre, efecto: x.efecto })),
            },
          }),
        });
        const j = await resp.json().catch(() => null);
        setGenId(null);
        setMsg(j?.ok ? 'Oferta actualizada y documentos regenerados.' : `Guardada, pero los documentos no se regeneraron: ${j?.error || 'error de red'}`);
        if (j?.ok) cargar();
      }
    } catch (err) {
      // El motivo traducido: «invalid input syntax for type integer» no dice
      // nada a quien está guardando una oferta, y menos aún que falte aplicar
      // una migración.
      setMsg('No se pudo guardar: ' + explicarErrorBd(err, 'presupuestos'));
      setGenId(null);
    }
  }

  // Guarda las normas editadas en la oferta y la regenera con ellas.
  async function guardarNormasYRegenerar() {
    const { oferta, normas } = editNormas;
    if (!normas.includes('9001')) { setMsg('La ISO 9001 es la base obligatoria.'); return; }
    setEditNormas(null); setGenId(oferta.id); setMsg(null);
    try {
      await updateRow('presupuestos', oferta.id, { normas });
      setRows(rs => rs.map(x => x.id === oferta.id ? { ...x, normas } : x));
      const resp = await fetch('/.netlify/functions/generar-oferta', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          normas, modelo: oferta.modelo, meses: oferta.meses,
          empresa: oferta.empresa || '', contacto: oferta.nombre || '', cif: oferta.cif || '', cargo: oferta.cargo || '',
          ref: oferta.numero_oferta || '', comercial: oferta.comercial || 'Alejandro',
          email: oferta.email || '', presupuesto_id: oferta.id,
          fecha_emision: oferta.fecha_emision || null,
          fecha_inicio: oferta.fecha_inicio || null,
          fecha_primer_pago: oferta.fecha_primer_pago || oferta.fecha_inicio || null,
          fecha_fin: oferta.fecha_fin || null,
          fecha_certificacion: oferta.fecha_certificacion || null,
          pago_adelantado: !!oferta.pago_adelantado,
        }),
      });
      let j = null; try { j = await resp.json(); } catch { j = null; }
      if (j && j.ok) {
        setRows(rs => rs.map(x => x.id === oferta.id ? { ...x, url_pdf: j.url_pdf, url_pptx: j.url_pptx } : x));
        setMsg(`✓ Oferta ${oferta.numero_oferta} regenerada con ${normas.length} norma(s).`);
      } else setMsg(`No se pudo regenerar (${j?.error || `código ${resp.status}`}).`);
    } catch (e) { setMsg('Error al regenerar con las nuevas normas.'); }
    setGenId(null);
  }

  // Avisos de coherencia entre fechas. Se avisa, no se bloquea: hay casos
  // legítimos (anticipo antes de arrancar, arranque a mitad de mes que se
  // factura al siguiente) y quien edita sabe lo que hace.
  // En Apoyo e Implantación el fin lo decide quien oferta; en los recurrentes es
  // la permanencia de doce meses y va pegado al inicio.
  const finManual = MODELOS_PROYECTO.includes(edicion?.modelo);

  // ── El CRM como fuente de verdad de empresa y persona ──
  // La oferta guarda una COPIA de esos datos: es lo que se imprimió, y no debe
  // cambiar retroactivamente porque alguien corrija una ficha. Pero si hay
  // desfase hay que verlo, para decidir si se regenera el documento o se
  // corrige la ficha.
  const [crm, setCrm] = useState(null);
  useEffect(() => {
    if (!edicion || crm) return;
    Promise.all([
      listAll('empresas', 'nombre').catch(() => []),
      listAll('contactos', 'nombre').catch(() => []),
    ]).then(([e, c]) => setCrm({ empresas: e || [], contactos: c || [] }));
  }, [edicion, crm]);

  const crmEmpresa = useMemo(() => {
    if (!crm || !edicion) return null;
    const c = normalizarCif(edicion.cif);
    return crm.empresas.find((e) => c && normalizarCif(e.cif) === c) || null;
  }, [crm, edicion?.cif]);

  const crmContacto = useMemo(() => {
    if (!crm || !edicion?.contacto_id) return null;
    return crm.contactos.find((x) => String(x.id) === String(edicion.contacto_id)) || null;
  }, [crm, edicion?.contacto_id]);

  const hrefEmpresa = crmEmpresa ? `/consultores/empresas?e=${crmEmpresa.id}` : '/consultores/empresas';
  const hrefContacto = crmContacto ? `/consultores/contactos?c=${crmContacto.id}` : '/consultores/contactos';

  const desfases = useMemo(() => {
    if (!edicion) return [];
    const pares = [
      ['Empresa', edicion.empresa, crmEmpresa?.nombre],
      ['CIF', edicion.cif, crmEmpresa?.cif],
      ['Nombre', edicion.contacto_nombre, crmContacto?.nombre],
      ['Cargo', edicion.cargo, crmContacto?.cargo],
      ['Correo', edicion.email, crmContacto?.email],
    ];
    const igual = (a, b) => String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase();
    return pares
      .filter(([, , enCrm]) => enCrm)
      .filter(([, valor, enCrm]) => !igual(valor, enCrm))
      .map(([etiqueta, valor, enCrm]) => ({ etiqueta, valor, enCrm }));
  }, [edicion, crmEmpresa, crmContacto]);

  // Cálculo en vivo de la oferta abierta, para poder enseñar el desglose por
  // sistema y los campos de tarifa pactada mientras se edita.
  const calcEdicion = useMemo(() => {
    if (!edicion?.normas?.length || !edicion.modelo) return null;
    try {
      return calcular(edicion.normas, edicion.modelo, {
        meses: edicion.meses, complejidad: edicion.complejidad, sedes: edicion.sedes,
        fasesPlan: edicion.fases_plan || undefined, ajustes: edicion.ajustes || [],
        preciosSistema: edicion.cliente_antiguo ? (edicion.precios_sistema || null) : null,
        aplicarReglas: edicion.aplicar_reglas !== false,
        pagoAdelantado: !!edicion.pago_adelantado,
      });
    } catch { return null; }
  }, [edicion?.normas, edicion?.modelo, edicion?.meses, edicion?.complejidad, edicion?.sedes,
      edicion?.fases_plan, edicion?.ajustes, edicion?.cliente_antiguo, edicion?.precios_sistema,
      edicion?.aplicar_reglas]);

  // Al pasar a un modelo recurrente, el fin vuelve a los doce meses: venir de
  // una implantación de cinco meses dejaría la oferta bloqueada sin motivo
  // visible al regenerarla.
  useEffect(() => {
    if (!edicion || finManual || !edicion.fecha_inicio) return;
    const doce = finSugerido(edicion.fecha_inicio, finManual);
    if (edicion.fecha_fin !== doce) setEdicion((x) => ({ ...x, fecha_fin: doce }));
  }, [finManual, edicion?.fecha_inicio, edicion?.modelo]);   // eslint-disable-line react-hooks/exhaustive-deps

  const avisoFechas = (() => {
    const e = edicion || {};
    const a = {};
    const mes = (f) => (f ? String(f).slice(0, 7) : null);
    if (e.fecha_emision && e.fecha_primer_pago && e.fecha_primer_pago < e.fecha_emision) {
      a.pago = 'El primer pago es anterior a la emisión de la oferta.';
    } else if (e.fecha_inicio && e.fecha_primer_pago && mes(e.fecha_inicio) !== mes(e.fecha_primer_pago)) {
      a.pago = 'El primer pago cae en un mes distinto al del inicio del proyecto.';
    }
    if (e.fecha_inicio && e.fecha_fin && e.fecha_fin <= e.fecha_inicio) {
      a.fin = 'El fin de contrato debe ser posterior al inicio.';
    }
    // La certificación NO se compara con el fin: puede caer después (auditoría
    // al final del ciclo) o antes (certificación temprana). Son cosas distintas.
    if (e.fecha_inicio && e.fecha_certificacion && e.fecha_certificacion <= e.fecha_inicio) {
      a.cert = 'La certificación debe ser posterior al inicio.';
    }
    return a;
  })();

  if (!rows) return <p className="font-semibold text-[#9FC0CB]">Cargando ofertas…</p>;

  const filtro = q.trim().toLowerCase();
  const lista = rows
    .filter((r) => !etapa || etapaDe(r, contratos) === etapa)
    .filter((r) => !filtro ||
      [r.numero_oferta, r.empresa, r.nombre, r.comercial, r.modelo].filter(Boolean).join(' ').toLowerCase().includes(filtro));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold">Histórico de ofertas</h2>
          <p className="text-sm font-medium text-[#9FC0CB]">{rows.length} oferta{rows.length !== 1 ? 's' : ''} emitida{rows.length !== 1 ? 's' : ''}.</p>
          <p className="mt-1 max-w-2xl text-[11.5px] font-medium leading-relaxed text-[#7FA7B4]">{DISCLAIMER_CORTO} Todas las ofertas emitidas incluyen este aviso en el PDF y en el PowerPoint.</p>
        </div>
        <input className="input max-w-xs" placeholder="Buscar nº, cliente, comercial…" value={q} onChange={e => setQ(e.target.value)} />
      </div>


      {/* ── El motor da hoy un precio distinto al que se emitió ── */}
      {avisoPrecio && (
        <section className="card mb-4 space-y-3 ring-1 ring-brand-orange/50">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-orange">
            Esta oferta se emitió con otro precio
          </h2>
          <p className="text-[13px] leading-relaxed text-[#EAF4F7]">
            La oferta <b>{avisoPrecio.oferta.numero_oferta}</b> se emitió por{' '}
            <b>{fmtEUR(avisoPrecio.guardado)}</b>. Con las tarifas y horas de hoy saldría por{' '}
            <b>{fmtEUR(avisoPrecio.hoy)}</b>.
          </p>
          <p className="text-[12px] leading-relaxed text-[#9FC0CB]">
            {avisoPrecio.alGuardar === undefined
              ? 'Regenerar con el precio de hoy deja el mismo número de oferta con un importe distinto al que recibió el cliente. Si el precio ha de cambiar, lo limpio es emitir una oferta nueva.'
              : 'Guardar con el precio de hoy cambia el importe de una oferta ya emitida. Si el cliente la aceptó por el importe anterior, mantén el emitido; si el precio se ha renegociado, actualízalo.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {/* El aviso salta desde dos sitios: «↻ Regenerar» (solo documentos)
                y «Guardar» (que además escribe el precio en la base). Los
                botones tienen que hacer lo que corresponda en cada caso. */}
            {avisoPrecio.alGuardar === undefined ? (
              <>
                <button onClick={() => { const o = avisoPrecio.oferta; setAvisoPrecio(null); generar(o, { forzarPrecioNuevo: false }); }}
                  className="btn-orange !px-4 !py-1.5 text-xs">
                  Regenerar con {fmtEUR(avisoPrecio.guardado)} · el precio emitido
                </button>
                <button onClick={() => { const o = avisoPrecio.oferta; setAvisoPrecio(null); generar(o, { forzarPrecioNuevo: true }); }}
                  className="btn-ghost !px-3 !py-1.5 text-xs">
                  Recalcular a {fmtEUR(avisoPrecio.hoy)}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => {
                    const regen = avisoPrecio.alGuardar;
                    setEdicion((x) => ({ ...x, _precioDecidido: true, _mantenerPrecio: true }));
                    setAvisoPrecio(null);
                    setTimeout(() => guardarEdicion(regen), 0);
                  }}
                  className="btn-orange !px-4 !py-1.5 text-xs">
                  Guardar manteniendo {fmtEUR(avisoPrecio.guardado)} · el precio emitido
                </button>
                <button onClick={() => {
                    const regen = avisoPrecio.alGuardar;
                    setEdicion((x) => ({ ...x, _precioDecidido: true, _mantenerPrecio: false }));
                    setAvisoPrecio(null);
                    setTimeout(() => guardarEdicion(regen), 0);
                  }}
                  className="btn-ghost !px-3 !py-1.5 text-xs">
                  Actualizar a {fmtEUR(avisoPrecio.hoy)}
                </button>
              </>
            )}
            <button onClick={() => setAvisoPrecio(null)} className="btn-ghost !px-3 !py-1.5 text-xs">Cancelar</button>
          </div>
        </section>
      )}

      {/* Las cinco etapas por las que pasa una propuesta. Pulsar filtra la
          lista de abajo: panel y listado son la misma pantalla. */}
      <EstadosOferta ofertas={rows} contratos={contratos} filtro={etapa} setFiltro={setEtapa} />

      {etapa && (
        <p className="mt-2 text-[12px] text-[#9FC0CB]">
          Mostrando <b className="text-[#EAF4F7]">{ETAPAS.find((e) => e.k === etapa)?.etq.toLowerCase()}</b>.{' '}
          <button onClick={() => setEtapa(null)} className="text-brand-orange underline">Ver todas</button>
        </p>
      )}

      {/* ── Edición completa de la oferta ── */}
      {edicion && (
        <section className="card mb-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-orange">
              Editar oferta {edicion.numero_oferta || ''}
            </h2>
            <button onClick={() => setEdicion(null)} className="text-xs font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">Cancelar</button>
          </div>
          {/* Va justo encima de los datos de la persona: puesto al final del
              formulario, tras las fechas, nadie lo encontraba.
              El mapeo importa: este formulario guarda `contacto_nombre` y
              `contacto_apellidos`, no `nombre`/`apellidos`. Con los nombres del
              CRM tal cual, elegir un contacto no rellenaba nada visible. */}
          <ImportarContacto
            cif={edicion.cif} empresa={edicion.empresa} actual={edicion.contacto_id}
            onElegir={(p) => setEdicion({
              ...edicion,
              contacto_nombre: p.nombre,
              contacto_apellidos: p.apellidos,
              cargo: p.cargo || edicion.cargo,
              email: p.email,
              telefono: p.telefono || edicion.telefono,
              contacto_id: p.contacto_id,
            })}
          />

          {/* ── Datos de empresa y persona: SOLO LECTURA ──
              Se editan en su ficha, no aquí. Si se pudieran cambiar en cada
              oferta, cada documento acabaría con su propia versión del CIF y no
              habría forma de saber cuál es la buena. Para cambiar la persona a
              la que va dirigida está el desplegable de arriba; para corregir sus
              datos, su ficha. */}
          <AvisoDesfase campos={desfases} href={hrefEmpresa} />

          <div className="form-grid">
            <DatoEspejo etiqueta="Empresa" valor={edicion.empresa}
              enCrm={crmEmpresa?.nombre} href={hrefEmpresa} comoEditar="Editar en Empresas →" />
            <DatoEspejo etiqueta="CIF" valor={edicion.cif}
              enCrm={crmEmpresa?.cif} href={hrefEmpresa} comoEditar="Editar en Empresas →" />
            <DatoEspejo etiqueta="Nombre" valor={edicion.contacto_nombre}
              enCrm={crmContacto?.nombre} href={hrefContacto} comoEditar="Editar en Contactos →" />
            <DatoEspejo etiqueta="Apellidos" valor={edicion.contacto_apellidos}
              enCrm={crmContacto?.apellidos} href={hrefContacto} comoEditar="Editar en Contactos →" />
            <DatoEspejo etiqueta="Cargo" valor={edicion.cargo}
              enCrm={crmContacto?.cargo} href={hrefContacto} comoEditar="Editar en Contactos →" />
            <DatoEspejo etiqueta="Correo" valor={edicion.email}
              enCrm={crmContacto?.email} href={hrefContacto} comoEditar="Editar en Contactos →" />
            <DatoEspejo etiqueta="Teléfono" valor={edicion.telefono}
              enCrm={crmContacto?.movil || crmContacto?.telefono} href={hrefContacto} comoEditar="Editar en Contactos →" />
          </div>
          <div>
            <p className="label !mb-1.5">Sistemas</p>
            <div className="flex flex-wrap gap-1.5">
              {NORMAS.map((n) => {
                const on = edicion.normas.includes(n.id);
                return (
                  <button key={n.id} type="button"
                    onClick={() => setEdicion({ ...edicion, normas: on ? edicion.normas.filter((x) => x !== n.id) : [...edicion.normas, n.id] })}
                    className={`rounded-full border px-3 py-1 text-[11.5px] font-bold transition ${on ? 'border-brand-verde bg-brand-verde/20 text-brand-verdeTexto' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-verde/60'}`}>
                    {on ? '✓ ' : ''}{n.nombre}
                  </button>
                );
              })}
            </div>
            {!edicion.normas.includes('9001') && (
              <p className="mt-2 rounded-lg bg-brand-orange/10 px-3 py-2 text-[11.5px] text-brand-orange">
                Sin la ISO 9001, las normas que se apoyan en ella pierden el descuento por solape y la oferta sube.
              </p>
            )}
          </div>
          <div className="form-grid">
            <div><label className="label" htmlFor="of-modelo">Modelo</label>
              <select id="of-modelo" className="input !py-1.5 !text-[13px]" value={edicion.modelo} onChange={(e) => setEdicion({ ...edicion, modelo: e.target.value })}>
                {MODELO_IDS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select></div>
            <div><label className="label" htmlFor="of-compl">Complejidad</label>
              <select id="of-compl" className="input !py-1.5 !text-[13px]" value={edicion.complejidad || 'media'} onChange={(e) => setEdicion({ ...edicion, complejidad: e.target.value })}>
                {COMPLEJIDADES.map((c) => <option key={c.k} value={c.k}>{c.label}</option>)}
              </select></div>
            <div><label className="label" htmlFor="of-sedes">Sedes</label>
              <input id="of-sedes" type="number" min="1" className="input !py-1.5 !text-[13px]" value={edicion.sedes || 1} onChange={(e) => setEdicion({ ...edicion, sedes: Math.max(1, parseInt(e.target.value, 10) || 1) })} /></div>
            <div><p className="label">Precio recalculado</p>
              <p className="mt-1 text-lg font-extrabold text-[#EAF4F7]">
                {edicion.normas.length
                  ? (() => { const c = calcular(edicion.normas, edicion.modelo, {
                               meses: edicion.meses, complejidad: edicion.complejidad, sedes: edicion.sedes,
                               fasesPlan: edicion.fases_plan || undefined, ajustes: edicion.ajustes || [] });
                             return `${fmtEUR(c.precioCatalogo)}${c.tipo === 'mes' ? '/mes' : ''}`; })()
                  : '—'}
              </p>
              {edicion.precio != null && <p className="text-[11px] text-[#7FA7B4]">antes: {fmtEUR(edicion.precio)}</p>}
            </div>
          </div>

          {/* ── Fechas de la oferta ──
              Las tres condicionan el documento: la de emisión lo fecha y abre
              los 30 días de validez, la de inicio ordena el cronograma y la del
              primer pago arranca el cuadro de facturación. Antes ninguna se
              podía tocar aquí y el PDF se fechaba solo, con el día en que se
              regenerase. */}
          <div className="form-grid">
            <div className="campo">
              <label className="label" htmlFor="of-emision">Fecha de emisión</label>
              <input id="of-emision" type="date" className="input"
                value={edicion.fecha_emision || ''}
                onChange={(e) => setEdicion({ ...edicion, fecha_emision: e.target.value })} />
              <p className="campo-nota">Fecha del PDF y de los 30 días de validez.</p>
            </div>
            <div className="campo">
              <label className="label" htmlFor="of-inicio">Inicio previsto del proyecto</label>
              <input id="of-inicio" type="date" className="input"
                value={edicion.fecha_inicio || ''}
                onChange={(e) => {
                  // El primer pago sigue al inicio mientras no se toque a mano:
                  // lo normal es cobrar desde el mes en que arranca el servicio.
                  const ini = e.target.value;
                  const pagoSeguia = !edicion.fecha_primer_pago || edicion.fecha_primer_pago === edicion.fecha_inicio;
                  // El fin también sigue al inicio mientras esté a doce meses
                  // exactos: si alguien lo movió a mano, se respeta.
                  // Recurrentes: siempre. Apoyo/Implantación: solo si estaba
                  // en los doce meses por defecto, es decir, sin tocar.
                  const finSeguia = !finManual
                    || !edicion.fecha_fin
                    || edicion.fecha_fin === finSugerido(edicion.fecha_inicio, finManual);
                  setEdicion({
                    ...edicion, fecha_inicio: ini,
                    fecha_primer_pago: pagoSeguia ? ini : edicion.fecha_primer_pago,
                    fecha_fin: finSeguia && ini ? finSugerido(ini, finManual) : edicion.fecha_fin,
                  });
                }} />
              <p className="campo-nota">Arranca el calendario del encargo.</p>
            </div>
            <div className="campo">
              <label className="label" htmlFor="of-pago">Fecha del primer pago</label>
              <input id="of-pago" type="date" className="input"
                value={edicion.fecha_primer_pago || ''}
                onChange={(e) => setEdicion({ ...edicion, fecha_primer_pago: e.target.value })} />
              <p className="campo-nota">
                {avisoFechas.pago
                  ? <span className="font-bold text-brand-orange">{avisoFechas.pago}</span>
                  : <span className="text-[#7FA7B4]">Por defecto, el mes del inicio.</span>}
              </p>
            </div>
            <div className="campo">
              <label className="label" htmlFor="of-fin">
                {finManual ? 'Fin del proyecto' : 'Fin de contrato'}
              </label>
              <input id="of-fin" type="date" className="input"
                value={edicion.fecha_fin || ''}
                onChange={(e) => setEdicion({ ...edicion, fecha_fin: e.target.value })} />
              <p className="campo-nota">
                {edicion.fecha_inicio && edicion.fecha_fin !== finSugerido(edicion.fecha_inicio, finManual)
                  ? <button type="button" className="font-bold text-brand-orange hover:underline"
                      onClick={() => setEdicion({ ...edicion, fecha_fin: finSugerido(edicion.fecha_inicio, finManual) })}>
                      Volver al valor por defecto
                    </button>
                  : finManual
                    ? 'Lo marca el calendario del proyecto.'
                    : '12 meses y un día desde el inicio.'}
              </p>
              {avisoFechas.fin && <p className="text-[11px] font-bold text-red-300">{avisoFechas.fin}</p>}
            </div>
          </div>

          {/* ── Tarifa pactada y reglas ──
              Lo mismo que ofrece el generador, disponible también al editar:
              una oferta de cliente antiguo se corrige aquí, y sin esto había
              que rehacerla desde cero para respetar su precio heredado. */}
          {calcEdicion?.desgloseSistemas && (
            <div className="rounded-xl border border-[#1E5468] bg-[#0D3242] p-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" className="mt-0.5" checked={edicion.aplicar_reglas !== false}
                  onChange={(ev) => setEdicion({ ...edicion, aplicar_reglas: ev.target.checked })} />
                <span className="text-[12.5px] leading-snug">
                  <span className="font-bold text-[#EAF4F7]">Aplicar las reglas comerciales activas</span>
                  <span className="block text-[11px] text-[#9FC0CB]">Desmárcalo para el precio de catálogo limpio.</span>
                </span>
              </label>

              {calcEdicion.tipo === 'mes' && (
                <label className="mt-2.5 flex cursor-pointer items-start gap-2.5">
                  <input type="checkbox" className="mt-0.5" checked={!!edicion.pago_adelantado}
                    onChange={(ev) => setEdicion({ ...edicion, pago_adelantado: ev.target.checked })} />
                  <span className="text-[12.5px] leading-snug">
                    <span className="font-bold text-[#EAF4F7]">Pago anual por adelantado · 11 × 12</span>
                    <span className="block text-[11px] text-[#9FC0CB]">
                      Se cobran once mensualidades y se prestan doce.
                      {calcEdicion.adelantado && (
                        <> Un pago de <b className="text-[#EAF4F7]">{fmtEUR(calcEdicion.adelantado.total)}</b>{' '}
                          en vez de {fmtEUR(calcEdicion.adelantado.anual)}: el cliente se ahorra{' '}
                          <b className="text-brand-verdeTexto">{fmtEUR(calcEdicion.adelantado.ahorro)}</b>.</>
                      )}
                    </span>
                  </span>
                </label>
              )}

              <label className="mt-2.5 flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" className="mt-0.5" checked={!!edicion.cliente_antiguo}
                  onChange={(ev) => {
                    const on = ev.target.checked;
                    if (!on) { setEdicion({ ...edicion, cliente_antiguo: false, precios_sistema: {} }); return; }
                    // Si la oferta ya traía precios pactados se respetan: son
                    // los que se negociaron. La tarifa heredada solo rellena
                    // lo que esté vacío.
                    const ya = edicion.precios_sistema || {};
                    const heredado = precioClienteAntiguo(edicion.modelo);
                    const prop = { ...ya };
                    if (heredado) {
                      for (const x of (calcEdicion.desgloseSistemas || [])) {
                        if (prop[x.id] == null) prop[x.id] = heredado;
                      }
                    }
                    setEdicion({ ...edicion, cliente_antiguo: true, precios_sistema: prop });
                  }} />
                <span className="text-[12.5px] leading-snug">
                  <span className="font-bold text-[#EAF4F7]">Cliente antiguo con tarifa pactada</span>
                  <span className="block text-[11px] text-[#9FC0CB]">
                    {precioClienteAntiguo(edicion.modelo)
                      ? `Se proponen ${precioClienteAntiguo(edicion.modelo)} €/mes por sistema, la tarifa heredada de ${edicion.modelo}. Lo ya pactado no se toca.`
                      : `${edicion.modelo} no tiene tarifa heredada. Fija a mano lo que haga falta.`}
                  </span>
                </span>
              </label>

              {edicion.cliente_antiguo && (
                <div className="form-grid denso mt-2.5">
                  {calcEdicion.desgloseSistemas.map((s) => (
                    <div key={s.id} className="rounded-lg border border-[#1E5468] bg-[#0B2E3D] px-2.5 py-2">
                      <label className="label !mb-1" htmlFor={`ed-ps-${s.id}`}>{s.nombre}</label>
                      <input id={`ed-ps-${s.id}`} type="number" min="0" step="25"
                        className="input"
                        placeholder={String(s.manual ? '' : s.precio)}
                        value={edicion.precios_sistema?.[s.id] ?? ''}
                        onChange={(ev) => {
                          const v = ev.target.value;
                          const n = { ...(edicion.precios_sistema || {}) };
                          if (v === '') delete n[s.id]; else n[s.id] = Number(v);
                          setEdicion({ ...edicion, precios_sistema: n });
                        }} />
                      <p className="mt-0.5 text-[10.5px] text-[#7FA7B4]">
                        {s.manual ? 'pactado' : `catálogo ${s.precio} €${s.suelo ? ' (mín.)' : ''}`}
                      </p>
                    </div>
                  ))}
                  {calcEdicion.volumen?.pct > 0 && (
                    <p className="text-[11px] text-[#9FC0CB] sm:col-span-2 lg:col-span-4">
                      Subtotal {fmtEUR(calcEdicion.volumen.subtotal)} − {calcEdicion.volumen.pct} % por{' '}
                      {calcEdicion.volumen.nSistemas} sistemas = <b className="text-[#EAF4F7]">{fmtEUR(calcEdicion.volumen.total)}</b>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="form-grid">
            <div className="campo">
              <label className="label" htmlFor="of-cert">
                Certificación <span className="font-normal text-[#7FA7B4]">— opcional</span>
              </label>
              <input id="of-cert" type="date" className="input"
                value={edicion.fecha_certificacion || ''}
                onChange={(e) => setEdicion({ ...edicion, fecha_certificacion: e.target.value })} />
              <p className="campo-nota">La auditoría externa. No define el fin del contrato.</p>
              {avisoFechas.cert && <p className="text-[11px] font-bold text-red-300">{avisoFechas.cert}</p>}
            </div>
          </div>
          {/* Notas: las que salen en el documento y las que no. Separadas a
              propósito, porque mandar al cliente el margen de negociación por
              escribir en la caja equivocada es demasiado fácil. */}
          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <label className="label" htmlFor="of-notas">
                Notas aclaratorias
                <span className="ml-1 font-normal text-brand-verdeTexto">— salen en el PDF y el PPT</span>
              </label>
              <textarea id="of-notas" rows={3} className="input !py-1.5 !text-[13px]"
                value={edicion.notas_oferta || ''} onChange={(e) => setEdicion({ ...edicion, notas_oferta: e.target.value })}
                placeholder="Una por línea." />
            </div>
            <div>
              <label className="label" htmlFor="of-internas">
                Notas internas
                <span className="ml-1 font-normal text-red-300">— NO salen en ningún documento</span>
              </label>
              <textarea id="of-internas" rows={3} className="input !py-1.5 !text-[13px]"
                value={edicion.notas_internas || ''} onChange={(e) => setEdicion({ ...edicion, notas_internas: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => guardarEdicion(true)} className="btn-orange !px-4 !py-1.5 text-xs">Guardar y regenerar documentos</button>
            <button onClick={() => guardarEdicion(false)} className="btn-ghost !px-3 !py-1.5 text-xs">Guardar solo en el CRM</button>
          </div>
          <p className="text-[11px] leading-relaxed text-[#7FA7B4]">
            Si guardas sin regenerar, el PDF que tiene el cliente dejará de coincidir con lo que dice el CRM.
          </p>
        </section>
      )}

      {msg && <div className="mb-4 rounded-xl bg-[#0D3242] px-4 py-2.5 text-sm font-bold text-[#CFE3E9]">{msg}</div>}

      {!lista.length ? (
        <div className="card text-center"><p className="font-extrabold">Sin ofertas{filtro ? ' para esa búsqueda' : ' todavía'}</p></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px] text-[13px]">
            <thead><tr className="text-left text-xs font-bold uppercase tracking-wider text-[#7FA7B4]">
              <th className="py-1.5">Nº oferta</th><th className="hidden py-1.5 sm:table-cell">Fecha</th><th className="py-1.5">Cliente</th>
              <th className="hidden py-1.5 lg:table-cell">Comercial</th><th className="hidden py-1.5 md:table-cell">Normas</th><th className="py-1.5">Modelo</th>
              <th className="hidden py-1.5 xl:table-cell">Calendario</th>
              <th className="py-1.5 text-right">Importe<br /><span className="text-[9.5px] font-semibold normal-case tracking-normal text-[#5E8494]">sin impuestos</span></th><th className="py-1.5 text-right">Documentos</th>
            </tr></thead>
            <tbody className="divide-y divide-navy-50">
              {lista.map(r => (
                <tr key={r.id} id={`oferta-${r.id}`}
                  className={edicion && String(edicion.id) === String(r.id) ? 'bg-brand-orange/[0.07]' : undefined}>
                  <td className="py-2 align-top font-extrabold text-[#EAF4F7]">
                    {r.numero_oferta || '—'}
                    {/* El contrato y el proyecto cuelgan de aquí: el proyecto
                        SIEMPRE nace de un contrato, nunca suelto. */}
                    <ContratoDeOferta oferta={r} contrato={contratos.find(
                      (c) => String(c.presupuesto_id) === String(r.id) && c.estado !== 'anulado')}
                      onCambio={cargar} />
                  </td>
                  <td className="hidden py-2 font-medium text-[#9FC0CB] sm:table-cell">{(r.creado || '').slice(0, 10)}</td>
                  <td className="py-2 font-bold">
                    {r.empresa || '—'}
                    <span className="block text-xs font-medium text-[#9FC0CB]">{r.nombre || ''}</span>
                    {/* Lo que se oculta como columna aparece aquí: ocultar un
                        dato sin dejarlo a mano es peor que la tabla ancha. */}
                    <span className="block text-[11px] text-[#7FA7B4] md:hidden">
                      {(r.normas || []).map(id => NORMA_BY_ID[id]?.nombre || id).join(' + ')}
                    </span>
                    <span className="block text-[11px] text-[#7FA7B4] sm:hidden">{(r.creado || '').slice(0, 10)}</span>
                  </td>
                  <td className="hidden py-2 font-semibold lg:table-cell">{r.comercial || 'Alejandro'}</td>
                  <td className="hidden py-2 font-semibold md:table-cell">
                    <span className="inline-flex items-center gap-1.5">
                      {(r.normas || []).map(id => NORMA_BY_ID[id]?.nombre || id).join(' + ')}
                      <button onClick={() => abrirEdicion(r)}
                        className="text-xs font-bold text-[#7FA7B4] hover:text-[#F9A83A]" title="Editar la oferta completa">✎</button>
                    </span>
                  </td>
                  <td className="py-2 font-semibold">{r.modelo}</td>
                  {/* Las tres fechas del encargo: antes había que abrir la
                      edición para saber cuándo empezaba y cuándo terminaba. */}
                  <td className="hidden py-2 whitespace-nowrap text-[11.5px] leading-tight xl:table-cell">
                    {r.fecha_inicio || r.fecha_fin ? (
                      <>
                        <span className="block font-semibold text-[#CFE3E9]">
                          {fFecha(r.fecha_inicio)} → {fFecha(r.fecha_fin)}
                        </span>
                        <span className="block text-[#7FA7B4]">
                          cert. {r.fecha_certificacion ? fFecha(r.fecha_certificacion) : 'sin fecha'}
                        </span>
                      </>
                    ) : <span className="text-[#7FA7B4]">—</span>}
                  </td>
                  {/* Con pago adelantado, lo que se cobra es el importe único.
                      Enseñar solo la cuota mensual obliga a abrir la oferta para
                      saber cuánto se factura de verdad. */}
                  <td className="py-2 text-right">
                    {r.pago_adelantado && r.tipo === 'mes' ? (() => {
                      const a = pagoAdelantado(r.precio);
                      return (
                        <>
                          <span className="block font-extrabold text-[#EAF4F7]">{fmtEUR(a.total)}</span>
                          <span className="block text-[10.5px] font-bold text-brand-orange">
                            pago único · {a.mesesCobrados}×{a.mesesServicio}
                          </span>
                          <span className="block text-[10.5px] text-[#7FA7B4]">{fmtEUR(r.precio)}/mes</span>
                        </>
                      );
                    })() : (
                      <span className="font-extrabold">{fmtEUR(r.precio)}{r.tipo === 'mes' ? '/mes' : ''}</span>
                    )}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {(r.url_pdf || r.url_pptx) ? (
                      <span className="inline-flex gap-2 items-center">
                        {r.url_pdf && <a href={r.url_pdf} target="_blank" rel="noreferrer" className="font-bold text-[#F9A83A] hover:underline">PDF</a>}
                        {r.url_pptx && <a href={r.url_pptx} target="_blank" rel="noreferrer" className="font-bold text-[#F9A83A] hover:underline">PPT</a>}
                        <button onClick={() => generar(r)} disabled={genId === r.id} className="text-xs font-semibold text-[#9FC0CB] hover:underline disabled:opacity-50" title="Regenerar documentos">{genId === r.id ? '…' : '↻ Regenerar'}</button>
                        <button onClick={() => enviar(r)} disabled={genId === r.id || !r.email} className="rounded-lg bg-brand-orange/15 px-2.5 py-1 text-xs font-bold text-[#F9A83A] hover:bg-brand-orange/25 disabled:opacity-40" title={r.email ? `Enviar a ${r.email}` : 'Sin email de cliente'}>✉ Enviar</button>
                      </span>
                    ) : (
                      <button onClick={() => generar(r)} disabled={genId === r.id} className="text-xs font-bold text-[#CFE3E9] hover:underline disabled:opacity-50">
                        {genId === r.id ? 'Generando…' : 'Generar'}
                      </button>
                    )}
                    {puedeBorrar && (
                      <button onClick={() => borrar(r)} disabled={genId === r.id}
                        className="ml-2 text-xs font-bold text-red-500 hover:text-red-300 hover:underline disabled:opacity-40"
                        title="Eliminar oferta (solo administradores)">🗑</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            <p className="mt-2 text-[11px] font-medium text-[#7FA7B4]">{LEYENDA_IMPUESTOS}</p>
        </div>
      )}

      {/* Modal: editar normas de una oferta y regenerar */}
      {editNormas && (
        <DialogoFicha
          titulo="Normas de la oferta"
          subtitulo={`${editNormas.oferta.numero_oferta} · ${editNormas.oferta.empresa}`}
          onCerrar={() => setEditNormas(null)}
          ancho="560px"
          pie={<>
            <button onClick={() => setEditNormas(null)} className="btn-ghost !px-4 !py-1.5 text-[13px]">Cancelar</button>
            <button onClick={guardarNormasYRegenerar} className="btn-orange !px-4 !py-1.5 text-[13px]">Guardar y regenerar</button>
          </>}
        >
          <div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {NORMAS.map(n => {
                const on = editNormas.normas.includes(n.id);
                const base = n.id === '9001';
                return (
                  <button key={n.id} disabled={base}
                    onClick={() => setEditNormas(s => ({ ...s, normas: on ? s.normas.filter(x => x !== n.id) : [...s.normas, n.id] }))}
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${on ? 'border-brand-orange bg-brand-orange/10 text-[#EAF4F7]' : 'border-[#1E5468] text-[#9FC0CB] hover:border-[#2A6480]'} ${base ? 'opacity-70 cursor-default' : ''}`}>
                    {n.nombre}{base && <span className="block text-[10px] font-medium">base obligatoria</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </DialogoFicha>
      )}
    </div>
  );
}
