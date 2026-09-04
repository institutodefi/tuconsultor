import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NORMAS, MODELOS, MODELO_IDS, calcular, fmtEUR } from '../lib/calcEngine.js';
import { precioClienteAntiguo, sueloSistema } from '../lib/reglasComerciales.js';
import { LEYENDA_IMPUESTOS, SUFIJO_SIN_IMPUESTOS } from '../lib/impuestos.js';
import { insertRow, listTable, siguienteNumeroOferta, upsertClienteDesdeFormulario } from '../lib/data.js';
import { DISCLAIMER_OFERTA, DISCLAIMER_CORTO, prefijoPrecio , AVISO_NORMA_INDIVIDUAL, AVISO_NORMA_CORTO } from '../lib/legal.js';
import FasesPlanes from '../components/FasesPlanes.jsx';
import ClienteDeOferta from '../components/ClienteDeOferta.jsx';
import { EMISORAS_BASE } from '../lib/emisoras.js';
import { validarPlanificacion, motivoNoDisponible, mesesEntre, hoyISO, sumarMeses, finContratoRecurrente, MODELOS_PROYECTO } from '../lib/planificacion.js';
import AjustesOferta from '../components/AjustesOferta.jsx';
import { COMPLEJIDADES, PERFILES, MAX_EQUIPO, EQUIPO_VACIO, totalEquipo, cabeMas, describirEquipo, tarifaEquipo } from '../lib/proyecto.js';
import { linkWhatsApp } from '../lib/telefono.js';
import { useAuth } from '../lib/auth.jsx';

// Generador de ofertas: selección de normas + modelo + datos del cliente,
// precio en vivo (siempre sin impuestos) y exportación a PDF/PPTX vía la función serverless.
export default function GeneradorOfertas({ publico = false }) {
  const { user } = useAuth();
  const [sel, setSel] = useState(['9001']);          // 9001 premarcada, pero se puede quitar
  const [modelo, setModelo] = useState('Implicación');
  // Fechas en vez de meses: nadie sabe de memoria si su proyecto son ocho meses
  // o diez, pero todo el mundo sabe cuándo tiene la auditoría.
  //
  // Tres fechas, y son cosas distintas que antes estaban mezcladas:
  //   · inicio        cuándo arranca el servicio.
  //   · fin           cuándo termina el contrato. Doce meses desde el inicio,
  //                   que es la permanencia del modelo.
  //   · certificación cuándo es la auditoría externa. OPCIONAL: en muchas
  //                   ofertas todavía no hay fecha, y antes eso impedía
  //                   generar la oferta porque el fin del contrato se sacaba
  //                   de ella.
  const [fechaInicio, setFechaInicio] = useState(hoyISO());
  const [fechaFin, setFechaFin] = useState(finContratoRecurrente(hoyISO()));
  const [finTocado, setFinTocado] = useState(false);   // ¿lo ha puesto la persona a mano?
  const [fechaCert, setFechaCert] = useState('');

  // ── Cómo se comporta la fecha de fin, según el modelo ──
  //
  // RECURRENTES (Relación, Implicación, Compromiso): el fin es inicio + 12
  // meses, la permanencia del modelo. Se calcula solo y se mantiene enganchado
  // al inicio, porque ahí un fin distinto bloquea la emisión y no aporta nada:
  // el contrato dura lo que dura.
  //
  // APOYO e IMPLANTACIÓN: el fin es MANUAL. No hay permanencia; lo que hay es
  // un calendario de trabajo que decide quien oferta, y cada proyecto dura lo
  // que dura. Se propone inicio + 12 meses como punto de partida, pero al
  // tocarlo deja de arrastrarse.
  const finEsManual = MODELOS_PROYECTO.includes(modelo);

  const cambiarInicio = (v) => {
    setFechaInicio(v);
    // En recurrentes el fin va siempre pegado al inicio. En Apoyo e
    // Implantación solo mientras nadie lo haya fijado a mano.
    if (!finTocado) setFechaFin(v ? finPorDefecto(v) : '');
  };

  // Fin sugerido: en recurrentes, doce meses y un día (contrato completo); en
  // Apoyo e Implantación, doce meses como punto de partida a ajustar.
  function finPorDefecto(ini) {
    return finEsManual ? sumarMeses(ini, 12) : finContratoRecurrente(ini);
  }

  // Al cambiar de modelo, el fin se recalcula si nadie lo ha tocado: venir de
  // una implantación a cinco meses dejaría un contrato recurrente demasiado
  // corto y bloqueado sin motivo visible.
  useEffect(() => {
    if (finTocado || !fechaInicio) return;
    const sug = finPorDefecto(fechaInicio);
    if (fechaFin !== sug) setFechaFin(sug);
  }, [finEsManual, fechaInicio]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Plazo para planificar las tareas: hasta la auditoría si la hay, y si no,
  // hasta el fin del contrato. Así la oferta se puede emitir sin fecha de
  // certificación, que es lo normal cuando aún no se ha reservado auditoría.
  const meses = mesesEntre(fechaInicio, fechaCert || fechaFin) || '';
  // Al motor se le manda la duración del CONTRATO: es lo que determina si el
  // modelo es viable. Con la certificación, una auditoría temprana bloqueaba la
  // generación aunque el contrato durase doce meses.
  //
  // En Implantación es distinto: no hay permanencia, hay un calendario de
  // trabajo. Manda el plazo hasta la auditoría si la hay, porque es la fecha
  // que hay que cumplir; ese número es el que reparte las tareas por meses.
  const mesesContrato = modelo === 'Implantación'
    ? (meses || mesesEntre(fechaInicio, fechaFin) || '')
    : (mesesEntre(fechaInicio, fechaFin) || meses);
  const [tiene9001, setTiene9001] = useState(false); // "ya tengo la 9001" → −50% horas 9001
  const [cli, setCli] = useState({ nombre: '', apellidos: '', empresa: '', cif: '', cargo: '', email: '', telefono: '', direccion: '' });
  const location = useLocation();
  // Si llegamos desde la ficha de un cliente ("Lanzar oferta"), prerrellenar sus datos.
  useEffect(() => {
    const c = location.state?.clientePrefill;
    if (c) {
      setCli(prev => ({
        ...prev,
        nombre: c.contacto || prev.nombre,
        apellidos: c.contacto_apellidos || prev.apellidos,
        empresa: c.empresa || prev.empresa,
        cif: c.cif_matriz || c.cif || prev.cif,
        email: c.email || prev.email,
        telefono: c.telefono || prev.telefono,
      }));
    }
  }, [location.state]);
  const [consent, setConsent] = useState(false);
  const [estado, setEstado] = useState(null);        // null | 'gen' | {ok,url_pdf,url_pptx,numero}
  const [error, setError] = useState(null);
  const [pideInfo, setPideInfo] = useState(false);   // "Otra norma · pide info": abre formulario de solicitud
  const [infoState, setInfoState] = useState('idle');// idle | sending | ok | error
  const [reglas, setReglas] = useState([]);          // reglas comerciales vigentes
  const [aplicarReglas, setAplicarReglas] = useState(true);   // ¿se aplican en esta oferta?
  // Tarifa pactada por sistema, para clientes antiguos con precios heredados.
  const [clienteAntiguo, setClienteAntiguo] = useState(false);
  const [preciosSistema, setPreciosSistema] = useState({});
  // ── Características del proyecto ──
  const [complejidad, setComplejidad] = useState('media');
  const [sedes, setSedes] = useState(1);
  const [equipo, setEquipo] = useState(EQUIPO_VACIO());
  const [formaPago, setFormaPago] = useState('unico');      // 'unico' | 'dos'
  const [fasesPlan, setFasesPlan] = useState({});           // fases elegidas de cada plan
  const [ajustes, setAjustes] = useState([]);               // trato particular de ESTA oferta
  const [notas, setNotas] = useState('');                   // salen en el PDF y el PPT
  const [notasInternas, setNotasInternas] = useState('');   // no salen en ningún sitio
  // Sociedad que emite. Se cargan las que esta persona tiene asignadas; si no
  // tiene ninguna, la de por defecto. Nadie se queda sin poder ofertar.
  const [emisoras, setEmisoras] = useState([]);
  const [emisora, setEmisora] = useState('trescore');
  useEffect(() => {
    if (publico) return;
    listTable('empresas_emisoras')
      .then((es) => (es && es.length ? es : EMISORAS_BASE))
      .catch(() => EMISORAS_BASE)
      .then((es) => {
        const act = es.filter((e) => e.activa !== false).sort((a, b) => (a.orden || 0) - (b.orden || 0));
        setEmisoras(act);
        const def = act.find((e) => e.por_defecto) || act[0];
        if (def) setEmisora(def.id);
      });
  }, [publico]);
  const [modeloDespues, setModeloDespues] = useState('Implicación');  // mantenimiento al terminar

  // Las reglas comerciales se leen en vivo: la oferta es dinámica y cambia con
  // lo que esté vigente el día en que se calcula.
  useEffect(() => {
    let vivo = true;
    listTable('reglas_comerciales')
      .then((r) => { if (vivo) setReglas((r || []).filter((x) => x.activa)); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  // "desde" en el canal público: el precio de la web es una estimación de partida.
  // Solo en la web. Una oferta emitida desde aquí llega al cliente como precio
  // en firme: el equipo ya conoce la organización cuando la prepara.
  const desde = prefijoPrecio(publico);

  // ── Quién aprueba el precio ──
  // La oferta sale en firme, así que alguien tiene que responder de ella. Se
  // propone quien la está emitiendo, pero se puede cambiar: a veces la prepara
  // una persona y la valida otra.
  const [aprobador, setAprobador] = useState('');
  const [notaAprobacion, setNotaAprobacion] = useState('');
  const [equipoAprob, setEquipoAprob] = useState([]);

  useEffect(() => {
    if (publico) return;
    listTable('perfiles').then((ps) => {
      const aptos = (ps || [])
        .filter((p) => ['superadmin', 'admin', 'director'].includes(p.rol) && p.activo !== false)
        .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
      setEquipoAprob(aptos);
      // Si quien emite puede aprobar, se propone a sí mismo.
      if (aptos.some((p) => String(p.id) === String(user?.id))) setAprobador(String(user.id));
    }).catch(() => setEquipoAprob([]));
  }, [publico, user?.id]);

  const toggle = (id) => {

    setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const res = useMemo(
    () => calcular(sel, modelo, {
      meses: mesesContrato, tiene9001, reglas, aplicarReglas,
      canal: publico ? 'web' : 'interno', complejidad, sedes, equipo, fasesPlan, ajustes,
      // Quién responde de este precio. Solo en las emitidas por el equipo: una
      // solicitud de la web no la aprueba nadie todavía.
      aprobada_por: publico ? null : (aprobador || null),
      aprobada_en: publico || !aprobador ? null : new Date().toISOString(),
      aprobada_nota: publico ? null : (notaAprobacion.trim() || null),
      preciosSistema: clienteAntiguo ? preciosSistema : null,
    }),
    [sel, modelo, mesesContrato, tiene9001, reglas, aplicarReglas, publico, complejidad, sedes,
     equipo, fasesPlan, ajustes, clienteAntiguo, preciosSistema],
  );
  const esImpl = res?.modelo === 'Implantación';
  const esApoyo = res?.modelo === 'Apoyo';
  const esMes = res?.tipo === 'mes' && !esImpl;
  const plazoMal = res && !res.plazoOk;

  async function generar() {
    if (!res) return;
    // Todos los datos del cliente son obligatorios.
    const faltan = [];
    if (!cli.empresa.trim()) faltan.push('Empresa');
    if (!cli.nombre.trim()) faltan.push('Nombre');
    if (!cli.apellidos.trim()) faltan.push('Apellidos');
    if (!cli.email.trim()) faltan.push('Email');
    if (!cli.telefono.trim()) faltan.push('Teléfono');
    if (!cli.cif.trim()) faltan.push('CIF');
    if (!cli.cargo.trim()) faltan.push('Cargo');
    if (faltan.length) { setError(`Faltan datos obligatorios: ${faltan.join(', ')}.`); return; }
    if (!/^\S+@\S+\.\S+$/.test(cli.email)) { setError('El email no tiene un formato válido.'); return; }
    if (!consent) { setError('Debes aceptar la política de privacidad para continuar.'); return; }
    if (!res.plazoOk) {
      setError(`El modelo ${modelo} requiere un mínimo de ${res.minMeses} meses. Ajusta la duración.`);
      return;
    }
    setError(null); setEstado('gen');

    const comercial = 'Alejandro';
    const contactoCompleto = `${cli.nombre} ${cli.apellidos}`.trim();
    const precioLead = res.fraccionado ? res.fraccionado.totalSinIva : res.precioCatalogo;
    // `tipo` va a la base y allí solo caben 'mes', 'bolsa' y 'proyecto'.
    // Aquí se mandaba 'fraccionado', resto de cuando la implantación se cobraba
    // en tres cuotas: TODA oferta de implantación fallaba al guardarse, y por eso
    // faltaban en el histórico. El tipo lo dice el motor; el fraccionamiento es
    // otra cosa y ya se guarda en `forma_pago`.
    const tipoLead = res.tipo;
    const nombresNormas = sel.map((id) => NORMAS.find((n) => n.id === id)?.nombre || id).join(' + ');
    const sufijo = tipoLead === 'mes' ? ' €/mes' : (tipoLead === 'proyecto' ? ' € (proyecto)' : ' € (bolsa)');
    const requerimiento = `${nombresNormas} · Modelo ${modelo} · ${precioLead}${sufijo}`;

    // 1) Número de oferta. Si la RPC falla, generamos uno de respaldo en cliente (no bloquea).
    let numero;
    try {
      numero = await siguienteNumeroOferta();
    } catch {
      numero = `OFE-${new Date().getFullYear()}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
    }

    // 2) Guardar el presupuesto. Es el alta en la base de datos: si falla, lo informamos.
    let fila = null;
    let errorInsert = null;
    try {
      fila = await insertRow('presupuestos', {
        empresa: cli.empresa, nombre: contactoCompleto, email: cli.email, telefono: cli.telefono,
        cif: cli.cif, cargo: cli.cargo, normas: sel, modelo, precio: precioLead, tipo: tipoLead,
        // Nombre y apellidos también por separado: `nombre` guarda el completo
        // por compatibilidad, pero partir un nombre después falla con los
        // compuestos («María del Carmen») y con los dos apellidos.
        contacto_nombre: cli.nombre || null, contacto_apellidos: cli.apellidos || null,
        numero_oferta: numero, comercial, requerimiento,
        // Todo lo que define el encargo, para poder regenerar la oferta igual
        // dentro de seis meses. Si esto no se guarda, al regenerar sale otra cosa.
        complejidad, sedes, equipo: totalEquipo(equipo) ? equipo : null,
        fecha_emision: hoyISO(), fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        fecha_primer_pago: fechaInicio || null, fecha_certificacion: fechaCert || null,
        fases_plan: Object.keys(fasesPlan || {}).length ? fasesPlan : null,
        precio_catalogo: res?.precioAntesDeAjustes ?? precioLead,
        ajuste_oferta: res?.ajusteOferta ?? 0,
        notas_oferta: notas || null, notas_internas: notasInternas || null,
        forma_pago: modelo === 'Implantación' ? formaPago : null,
        modelo_mantenimiento: modelo === 'Implantación' ? modeloDespues : null,
        ...(user?.id && user.id !== 'demo' ? { user_id: user.id } : {}),
      });
    } catch (e) {
      errorInsert = e?.message || e?.error_description || String(e);
      console.error('insertRow presupuestos', e);
    }

    // 2b) Los ajustes van en su propia tabla, colgando del presupuesto.
    if (fila?.id && ajustes.length) {
      for (const [i, a] of ajustes.entries()) {
        try {
          await insertRow('presupuesto_ajustes', {
            presupuesto_id: fila.id, tipo: a.tipo,
            unidad: a.tipo === 'nxm' || a.tipo === 'precio_fijo' ? null : a.unidad,
            valor: a.tipo === 'nxm' ? null : Number(a.valor),
            lleva: a.tipo === 'nxm' ? Number(a.lleva) : null,
            paga: a.tipo === 'nxm' ? Number(a.paga) : null,
            motivo: a.motivo, orden: (i + 1) * 10,
          });
        } catch (e) { console.error('ajuste no guardado', a, e); }
      }
    }

    // 3) Enviar el lead a Brevo (no bloquea).
    if (cli.email && consent) {
      fetch('/.netlify/functions/brevo-lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: contactoCompleto, empresa: cli.empresa, email: cli.email, telefono: cli.telefono,
          cif: cli.cif, cargo: cli.cargo, numero_oferta: numero, comercial,
          normas: sel, modelo, precio: precioLead, tipo: tipoLead,
          meses: res.meses, tiene9001, consent: true,
        }),
      }).catch(() => {});
    }

    // 3-bis) Con consentimiento RGPD, el solicitante queda como cliente
    // (código CL-NNNN autogenerado, Fátima como Director de Proyecto por defecto).
    // Si ya existe (mismo email o CIF), se actualiza en vez de duplicar.
    if (cli.email && consent) {
      try {
        await upsertClienteDesdeFormulario({
          empresa: cli.empresa, contacto: contactoCompleto,
          email: cli.email, telefono: cli.telefono, cif: cli.cif,
        });
      } catch (e) { console.error('upsert cliente', e); }
    }

    // 4) Generar el documento (PDF + PPTX). Aquí sí informamos del error real si lo hay.
    try {
      const r = await fetch('/.netlify/functions/generar-oferta', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          normas: sel, modelo, empresa: cli.empresa, contacto: contactoCompleto,
          cif: cli.cif, cargo: cli.cargo, ref: numero, comercial,
          meses: res.meses, tiene9001, direccion: cli.direccion,
          // De dónde nace: las de la web llevan cláusula de aprobación
          // posterior, las del equipo van en firme.
          canal: publico ? 'web' : 'interno',
          // Sin estas dos, el cuadro de facturación del PDF arrancaba en la
          // fecha de hoy en lugar de en el inicio real del servicio.
          fecha_emision: hoyISO(), fecha_inicio: fechaInicio || null,
          fecha_fin: fechaFin || null,
          fecha_primer_pago: fechaInicio || null, fecha_certificacion: fechaCert || null,
          complejidad, sedes, equipo: totalEquipo(equipo) ? equipo : null,
          ajustes, fasesPlan, emisora_id: emisora,
          notas_oferta: notas || null, notas_internas: notasInternas || null,
          precio_catalogo: res?.precioAntesDeAjustes ?? null, ajuste_oferta: res?.ajusteOferta ?? 0,
          forma_pago: modelo === 'Implantación' ? formaPago : null,
          modelo_mantenimiento: modelo === 'Implantación' ? modeloDespues : null,
          email: cli.email, presupuesto_id: fila?.id,
          // Resultado con reglas comerciales aplicadas (manda el motor del cliente)
          override: {
            precioCatalogo: res.precioCatalogo, precioBase: res.precioBase,
            horas: res.horas, hTotal: res.hTotal,
            reglas: res.reglas.map((r) => ({ nombre: r.nombre, efecto: r.efecto })),
          },
          disclaimer: DISCLAIMER_OFERTA,
        }),
      });
      // La función podría devolver HTML (404/500) en vez de JSON: lo controlamos.
      let j = null;
      try { j = await r.json(); } catch { j = null; }
      const okDoc = !!(j && j.ok);
      if (okDoc || fila) {
        // Hubo éxito (documento y/o alta en BD). Avisamos si algo quedó a medias.
        setEstado({ ok: true, numero, parcial: !okDoc, ...(okDoc ? j : {}) });
        if (errorInsert) {
          setError(`LA OFERTA ${numero} NO SE PUDO GUARDAR DESDE AQUÍ. Motivo: ${errorInsert}. Se ha intentado registrar desde el servidor: comprueba el histórico antes de enviarla al cliente.`);
        } else if (!okDoc && j?.error) {
          setError(`Oferta ${numero} registrada, pero el documento falló: ${j.error}`);
        }
      } else {
        setEstado(null);
        const motivo = errorInsert ? `alta en BD: ${errorInsert}` : (j?.error || `código ${r.status}`);
        setError(`No se pudo generar la oferta (${motivo}).`);
      }
    } catch (e) {
      if (fila) {
        setEstado({ ok: true, numero, parcial: true });
      } else {
        setEstado(null);
        setError('No se pudo registrar la oferta. Revisa la conexión e inténtalo de nuevo.');
      }
    }
  }

  // Solicitud de información para normas no listadas ("Otra norma · pide info").
  async function enviarSolicitudInfo() {
    if (!cli.email || !consent) { setError('Indica email y acepta la política para enviar la solicitud.'); return; }
    setError(null); setInfoState('sending');
    const contactoCompleto = `${cli.nombre} ${cli.apellidos}`.trim();
    const requerimiento = `SOLICITUD DE INFORMACIÓN · Otra norma · ${cli.normaInteres || 'sin especificar'}`;
    // 1) Alta en base de datos (queda como lead en el CRM con tipo 'consulta')
    try {
      let numero;
      try { numero = await siguienteNumeroOferta(); } catch { numero = `OFE-${new Date().getFullYear()}-${Date.now().toString(36).slice(-5).toUpperCase()}`; }
      await insertRow('presupuestos', {
        empresa: cli.empresa, nombre: contactoCompleto, email: cli.email, telefono: cli.telefono,
        cif: cli.cif, cargo: cli.cargo, requerimiento, comercial: 'Alejandro',
        numero_oferta: numero, tipo: 'consulta',
        ...(user?.id && user.id !== 'demo' ? { user_id: user.id } : {}),
      });
    } catch (e) { console.error('insertRow consulta', e); }
    // 2) Enviar a Brevo (no bloquea)
    try {
      await fetch('/.netlify/functions/brevo-lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: contactoCompleto, empresa: cli.empresa, email: cli.email, telefono: cli.telefono,
          cif: cli.cif, cargo: cli.cargo, comercial: 'Alejandro',
          requerimiento, consent: true,
        }),
      });
      setInfoState('ok');
    } catch (e) { setInfoState('error'); }
  }

  return (
    <div className={publico ? 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10' : ''}>
      <div className="mb-6 max-w-2xl">
        <p className="eyebrow">{publico ? 'Calcula tu oferta' : 'Generador de ofertas'}</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">{publico ? 'Tu sistema de gestión, con precio en 60 segundos' : 'Crea una oferta en 60 segundos'}</h1>
        <p className="mt-2 text-sm font-medium text-[#9FC0CB]">Elige normas y modelo, mira el precio en vivo y {publico ? 'recibe tu propuesta personalizada.' : 'exporta la oferta en PDF y PowerPoint.'}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="space-y-5">
          {/* 1 · Normas */}
          <section className="card">
            <h2 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-[#F9A83A]">1 · Normas a implantar</h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {NORMAS.map(n => {
                const on = sel.includes(n.id);
                const base = n.id === '9001';
                const baseFuera = base && !on;   // premarcada pero desmarcada a mano
                return (
                  <button key={n.id} onClick={() => toggle(n.id)}
                    className={`flex items-start gap-3 rounded-xl border-[1.5px] p-3 text-left transition ${
                      base && on ? 'border-brand-orange bg-brand-orange/15'
                      : on ? 'border-brand-verde bg-brand-verde/15' : 'border-[#1E5468] bg-[#0D3242] hover:border-brand-verde'}`}>
                    <span className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] text-[11px] text-white ${
                      base && on ? 'border-brand-orange bg-brand-orange text-[#0A2B3A]' : on ? 'border-brand-verde bg-brand-verde' : 'border-[#3F7D93] bg-transparent'}`}>
                      {on ? '✓' : ''}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-tight text-[#EAF4F7]">{n.nombre}{base && <span className={`ml-1.5 rounded px-1.5 py-px text-[9px] font-extrabold uppercase align-middle ${on ? 'bg-brand-orange text-[#0A2B3A]' : 'bg-white/15 text-[#9FC0CB]'}`}>{on ? 'base' : 'sin base'}</span>}</span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-[#9FC0CB]">{n.desc}</span>
                    </span>
                  </button>
                );
              })}
              {/* Otra norma · pide info → abre el formulario de solicitud */}
            {/* Aviso de que falta el sistema base. No bloquea: informa. */}
            {!sel.includes('9001') && (
              <div className="mt-3 rounded-xl border-[1.5px] border-brand-orange/50 bg-brand-orange/10 p-3">
                <p className="text-[13px] font-bold text-brand-orange">Has quitado la ISO 9001 del alcance</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#B9D2DA]">
                  La 9001 es el sistema base sobre el que se apoyan los demás: procesos, documentación,
                  auditoría interna y revisión por la dirección se implantan una vez y los otros sistemas
                  los heredan.
                  {res?.sinBaseConDependientes && (
                    <> <b className="text-brand-orange">Y has elegido normas que dependen de ella</b> —la 21001
                    y la 9004 son complementarias de la 9001—, así que pierden el descuento por solape:
                    hay que implantar de cero lo que normalmente se hereda y la oferta sale más cara, no más barata.</>
                  )}
                  {' '}Compruébalo antes de enviarla.
                </p>
              </div>
            )}

              <button onClick={() => setPideInfo(v => !v)}
                className={`flex items-start gap-3 rounded-xl border-[1.5px] border-dashed p-3 text-left transition ${pideInfo ? 'border-brand-orange bg-brand-orange/15' : 'border-[#1E5468] bg-[#0D3242] hover:border-brand-orange'}`}>
                <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] border-brand-orange text-[13px] font-bold text-brand-orange">?</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight text-brand-orange">¿Quieres otra norma?</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-[#9FC0CB]">No dudes en pedirnos información. Te asesoramos sin compromiso.</span>
                </span>
              </button>
            </div>

            {/* Formulario de solicitud de información */}
            {pideInfo && (
              <div className="mt-4 rounded-xl border-[1.5px] border-brand-orange/40 bg-brand-orange/10 p-4">
                {infoState === 'ok' ? (
                  <p className="text-sm font-bold text-brand-orange">¡Gracias! Hemos recibido tu solicitud. Te contactaremos muy pronto.</p>
                ) : (
                  <>
                    <p className="mb-3 text-sm font-bold text-[#EAF4F7]">Cuéntanos qué norma te interesa y te asesoramos.</p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <input className="input sm:col-span-2" placeholder="¿Qué norma o certificación te interesa?" value={cli.normaInteres || ''} onChange={e => setCli({ ...cli, normaInteres: e.target.value })} />
                      <input className="input" placeholder="Nombre" value={cli.nombre} onChange={e => setCli({ ...cli, nombre: e.target.value })} />
                      <input className="input" placeholder="Empresa" value={cli.empresa} onChange={e => setCli({ ...cli, empresa: e.target.value })} />
                      <input className="input" type="email" placeholder="Email" value={cli.email} onChange={e => setCli({ ...cli, email: e.target.value })} />
                      <input className="input" placeholder="Teléfono" value={cli.telefono} onChange={e => setCli({ ...cli, telefono: e.target.value })} />
                    </div>
                    <label className="mt-3 flex items-start gap-2.5 text-[12.5px] text-[#B9D2DA] cursor-pointer">
                      <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-orange" />
                      <span>Acepto que TuConsultor trate mis datos para contactarme. <a href="/legal/privacidad.html" target="_blank" rel="noreferrer" className="font-semibold text-brand-orange underline">Política de privacidad</a> (RGPD).</span>
                    </label>
                    <button onClick={enviarSolicitudInfo} disabled={infoState === 'sending'}
                      className="mt-3 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-extrabold text-[#0A2B3A] transition hover:bg-brand-orangeDark disabled:opacity-50">
                      {infoState === 'sending' ? 'Enviando…' : 'Solicitar información'}
                    </button>
                    {infoState === 'error' && <p className="mt-2 text-xs font-bold text-red-300">No se pudo enviar. Inténtalo de nuevo.</p>}
                  </>
                )}
              </div>
            )}
            <label className="mt-3 flex items-start gap-2.5 rounded-xl border-[1.5px] border-[#1E5468] bg-[#0D3242] p-3 cursor-pointer">
              <input type="checkbox" checked={tiene9001} onChange={e => setTiene9001(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-orange" />
              <span className="text-sm">
                <span className="font-bold text-[#EAF4F7]">Ya tengo la ISO 9001 certificada</span>
                <span className="block text-[12px] text-[#9FC0CB]">Aplica un 50 % de descuento sobre las horas de la ISO 9001 (sistema base ya implantado).</span>
              </span>
            </label>
          </section>

          {/* Planes de Igualdad y Diversidad: proyecto por fases, no cuota mensual */}
          {sel.some((x) => x.startsWith('igualdad') || x.startsWith('diversidad')) && (
            <div className="mt-4"><FasesPlanes planes={sel} onSeleccion={setFasesPlan} /></div>
          )}

          {/* ── Tarifa y reglas · solo en el generador interno ──
              Dos cosas que hasta ahora no se podían tocar desde la oferta:
              apagar las reglas comerciales para ver el precio limpio, y fijar
              la tarifa de un cliente antiguo sin inventar un descuento. */}
          {!publico && res?.desgloseSistemas && (
            <div className="mt-4 rounded-2xl border-[1.5px] border-[#1E5468] bg-[#0D3242] p-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">Tarifa y reglas</h3>

              <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" className="mt-0.5" checked={aplicarReglas}
                  onChange={(e) => setAplicarReglas(e.target.checked)} />
                <span className="text-[13px] leading-snug">
                  <span className="font-bold text-[#EAF4F7]">Aplicar las reglas comerciales activas</span>
                  <span className="block text-[11.5px] text-[#9FC0CB]">
                    {reglas.length
                      ? `${reglas.length} regla${reglas.length === 1 ? '' : 's'} vigente${reglas.length === 1 ? '' : 's'}. Desmárcalo para ver el precio de catálogo sin campañas ni recargos.`
                      : 'No hay reglas vigentes ahora mismo.'}
                  </span>
                </span>
              </label>

              <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" className="mt-0.5" checked={clienteAntiguo}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setClienteAntiguo(on);
                    // Al marcarla se propone la tarifa heredada del modelo en
                    // todos los sistemas: es lo que se teclaba a mano en cada
                    // oferta. Sigue siendo editable uno a uno, y al desmarcar
                    // se vacía para volver al precio de catálogo.
                    if (!on) { setPreciosSistema({}); return; }
                    const heredado = precioClienteAntiguo(modelo);
                    if (!heredado) return;   // Apoyo e Implantación no son cuota
                    setPreciosSistema(Object.fromEntries(
                      (res.desgloseSistemas || []).map((x) => [x.id, heredado])));
                  }} />
                <span className="text-[13px] leading-snug">
                  <span className="font-bold text-[#EAF4F7]">Cliente antiguo con tarifa pactada</span>
                  <span className="block text-[11.5px] text-[#9FC0CB]">
                    {precioClienteAntiguo(modelo)
                      ? `Se proponen ${precioClienteAntiguo(modelo)} €/mes por sistema, la tarifa heredada de ${modelo}. Edita el que haga falta; los que dejes en blanco siguen el precio de catálogo. Los descuentos por volumen se aplican después.`
                      : `${modelo} no tiene tarifa heredada: no es una cuota mensual. Fija a mano el precio de los sistemas que lo necesiten.`}
                  </span>
                </span>
              </label>

              {clienteAntiguo && (
                <div className="form-grid-3 denso mt-3">
                  {res.desgloseSistemas.map((s) => (
                    <div key={s.id} className="rounded-xl border border-[#1E5468] bg-[#0B2E3D] px-3 py-2">
                      <label className="label !mb-1" htmlFor={`ps-${s.id}`}>{s.nombre}</label>
                      <div className="flex items-center gap-2">
                        <input id={`ps-${s.id}`} type="number" min="0" step="25"
                          className="input"
                          placeholder={String(s.manual ? '' : s.precio)}
                          title={`Suelo de este sistema: ${sueloSistema(s.id, complejidad)} €/mes`}
                          value={preciosSistema[s.id] ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPreciosSistema((x) => {
                              const n = { ...x };
                              if (v === '') delete n[s.id]; else n[s.id] = Number(v);
                              return n;
                            });
                          }} />
                        <span className="text-[12px] font-bold text-[#7FA7B4]">€/mes</span>
                      </div>
                      <p className="campo-nota">
                        {s.manual ? 'Precio pactado' : `Catálogo: ${s.precio} €${s.suelo ? ' (suelo)' : ''}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Características del proyecto · solo en el generador interno */}
          {!publico && (
            <div className="mt-4 rounded-2xl border-[1.5px] border-[#1E5468] bg-[#0D3242] p-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">Características del proyecto</h3>
              <p className="mt-1 text-[11.5px] text-[#9FC0CB]">
                No cambian el precio por sí solas: las usan las reglas comerciales. El equipo sí afecta,
                porque de él sale la tarifa real.
              </p>

              {emisoras.length > 1 && (
                <div className="mt-3">
                  <p className="label !mb-1.5">Sociedad que emite la oferta</p>
                  <div className="flex flex-wrap gap-1.5">
                    {emisoras.map((e) => (
                      <button key={e.id} type="button" onClick={() => setEmisora(e.id)}
                        title={`${e.razon_social} · CIF ${e.cif}`}
                        className={`rounded-lg border px-3 py-1.5 text-left text-[12px] font-bold transition ${
                          emisora === e.id ? 'border-brand-orange bg-brand-orange/20 text-brand-orange' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-orange/60'}`}>
                        {e.razon_social}
                        <span className="ml-1.5 font-normal text-[10.5px] opacity-80">{e.cif}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-[#7FA7B4]">
                    Es la sociedad que firma y factura. Sale en el pie del PDF y en la aceptación.
                  </p>
                </div>
              )}

              <div className="mt-3 grid gap-4 lg:grid-cols-3">
                <div>
                  <p className="label !mb-1.5">Complejidad</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMPLEJIDADES.map((c) => (
                      <button key={c.k} type="button" title={c.ayuda} onClick={() => setComplejidad(c.k)}
                        className={`rounded-lg border px-3 py-1.5 text-[12px] font-bold transition ${complejidad === c.k ? 'border-brand-orange bg-brand-orange/20 text-brand-orange' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-orange/60'}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-[#7FA7B4]">
                    {COMPLEJIDADES.find((c) => c.k === complejidad)?.ayuda}
                  </p>
                </div>

                {modelo === 'Implantación' && (
                  <div>
                    <label className="label" htmlFor="g-despues">Mantenimiento al terminar</label>
                    <select id="g-despues" className="input !py-1.5 !text-[13px]" value={modeloDespues}
                      onChange={(e) => setModeloDespues(e.target.value)}>
                      {MODELO_IDS.filter((x) => x !== 'Implantación' && x !== 'Apoyo').map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] leading-snug text-[#7FA7B4]">
                      La implantación termina; el sistema sigue. Este es el modelo al que se pasa después,
                      y va escrito en la oferta para que no haya sorpresas.
                    </p>
                  </div>
                )}

                <div>
                  <label className="label" htmlFor="g-sedes">Sedes o alcances</label>
                  <input id="g-sedes" type="number" min="1" className="input !py-1.5 !text-[13px] !w-24"
                    value={sedes} onChange={(e) => setSedes(Math.max(1, parseInt(e.target.value, 10) || 1))} />
                  <p className="mt-1.5 text-[11px] leading-snug text-[#7FA7B4]">
                    Centros de trabajo o alcances distintos dentro del sistema. Cada uno añade visitas y evidencias propias.
                  </p>
                </div>

                <div>
                  <p className="label !mb-1.5">
                    Equipo consultor estimado
                    <span className={`ml-2 font-bold ${totalEquipo(equipo) > MAX_EQUIPO ? 'text-red-300' : 'text-[#7FA7B4]'}`}>
                      {totalEquipo(equipo)}/{MAX_EQUIPO}
                    </span>
                  </p>
                  <div className="space-y-1">
                    {PERFILES.map((pf) => (
                      <div key={pf.k} className="flex items-center gap-2">
                        <span className="w-16 text-[12px] font-bold text-[#EAF4F7]">{pf.label}</span>
                        <span className="w-14 text-[11px] text-[#7FA7B4]">{pf.tarifa} €/h</span>
                        <button type="button" aria-label={`Quitar ${pf.label}`}
                          onClick={() => setEquipo((e) => ({ ...e, [pf.k]: Math.max(0, (e[pf.k] || 0) - 1) }))}
                          className="grid h-6 w-6 place-items-center rounded border border-[#1E5468] text-[#9FC0CB] hover:border-brand-verde">−</button>
                        <span className="w-5 text-center text-[13px] font-bold text-[#EAF4F7]">{equipo[pf.k] || 0}</span>
                        <button type="button" aria-label={`Añadir ${pf.label}`} disabled={!cabeMas(equipo)}
                          onClick={() => setEquipo((e) => (cabeMas(e) ? { ...e, [pf.k]: (e[pf.k] || 0) + 1 } : e))}
                          className="grid h-6 w-6 place-items-center rounded border border-[#1E5468] text-[#9FC0CB] hover:border-brand-verde disabled:opacity-30">+</button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-[#7FA7B4]">
                    {totalEquipo(equipo)
                      ? <>Tarifa aplicada: <b className="text-brand-verdeTexto">{describirEquipo(equipo)}</b></>
                      : 'Sin definir: se usa la tarifa del nivel de cada norma.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!publico && (
            <AjustesOferta ajustes={ajustes} setAjustes={setAjustes} notas={notas} setNotas={setNotas}
              notasInternas={notasInternas} setNotasInternas={setNotasInternas} res={res} />
          )}

          {/* 2 · Modelo */}
          <section className="card">
            <h2 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-[#F9A83A]">2 · Modelo de servicio</h2>
            <div className="flex flex-wrap gap-2">
              {MODELO_IDS.map(mid => {
                const on = modelo === mid;
                // Un modelo que no cabe se deshabilita y DICE por qué al pasar
                // por encima. Dejarlo elegible para luego dar un error al
                // generar es hacer perder el tiempo.
                const veto = motivoNoDisponible({ inicio: fechaInicio, certificacion: fechaCert || fechaFin, normas: sel }, mid);
                return (
                  <button key={mid} onClick={() => !veto && setModelo(mid)} disabled={!!veto} title={veto || ''}
                    className={`min-w-[96px] flex-1 rounded-xl border-[1.5px] p-3 text-center transition ${
                      veto ? 'cursor-not-allowed border-[#1E5468]/50 bg-[#0D3242]/40 text-[#4E7686]'
                           : on ? 'border-brand-orange bg-brand-orange text-[#0A2B3A]'
                                : 'border-[#1E5468] bg-[#0D3242] text-[#EAF4F7] hover:border-brand-verde'}`}>
                    <span className="block text-sm font-extrabold">{mid}</span>
                    {veto && <span className="mt-0.5 block text-[9.5px] font-bold leading-tight">no aplica</span>}
                  </button>
                );
              })}
            </div>
            {/* Cuatro columnas solo cuando hay sitio de verdad. Con
                `sm:grid-cols-4` se apretaban desde 640 px y las etiquetas
                partían en dos líneas, descuadrando la fila.

                Alineación: cada celda es una columna flex con tres alturas
                fijas —etiqueta, campo y nota—. Sin ellas, una etiqueta que
                ocupa dos líneas o una nota más larga desplazan el campo de su
                columna y los recuadros quedan a distinta altura. */}
            <div className="form-grid mt-4">
              <div className="campo">
                <label className="label" htmlFor="g-inicio">
                  Inicio del proyecto
                </label>
                <input id="g-inicio" type="date" className="input"
                  value={fechaInicio} onChange={(e) => cambiarInicio(e.target.value)} />
                <p className="campo-nota">
                  Desde aquí se cuenta todo lo demás.
                </p>
              </div>

              <div className="campo">
                <label className="label" htmlFor="g-fin">
                  {finEsManual ? 'Fin del proyecto' : 'Fin de contrato'}
                </label>
                <input id="g-fin" type="date" className="input"
                  value={fechaFin}
                  aria-describedby="g-fin-nota"
                  onChange={(e) => { setFechaFin(e.target.value); setFinTocado(true); }} />
                <p id="g-fin-nota" className="campo-nota">
                  {finTocado
                    ? <>Fijado a mano. <button type="button" className="font-bold text-brand-orange hover:underline"
                        onClick={() => { setFinTocado(false); setFechaFin(fechaInicio ? finPorDefecto(fechaInicio) : ''); }}>
                        Volver al valor por defecto</button></>
                    : finEsManual
                      ? 'Propuesto a 12 meses. Ajústalo al calendario real.'
                      : '12 meses y un día: cubre el contrato completo. Editable.'}
                </p>
              </div>

              <div className="campo">
                <label className="label" htmlFor="g-cert">
                  Certificación <span className="ml-1 font-normal normal-case tracking-normal text-[#7FA7B4]">— opcional</span>
                </label>
                <input id="g-cert" type="date" className="input"
                  value={fechaCert} onChange={(e) => setFechaCert(e.target.value)} />
                <p className="campo-nota">
                  Si aún no hay auditoría, déjala vacía.
                </p>
              </div>

              <div className="campo">
                <p className="label">Plazo para planificar</p>
                {/* Misma altura que los campos, para que la cifra quede a la
                    altura de las fechas y no flotando por encima. */}
                <p className="mt-1 flex h-9 items-center text-lg font-extrabold leading-none text-[#EAF4F7]">
                  {meses || '—'}
                  <span className="ml-1.5 text-[12px] font-bold text-[#7FA7B4]">{meses === 1 ? 'mes' : 'meses'}</span>
                </p>
                <p className="campo-nota">
                  Hasta {fechaCert ? 'la certificación' : (finEsManual ? 'el fin del proyecto' : 'el fin de contrato')}.
                </p>
              </div>
            </div>

            {/* Lo que las fechas impiden o aconsejan */}
            {(() => {
              const v = validarPlanificacion({ inicio: fechaInicio, certificacion: fechaCert, fin: fechaFin, modelo, normas: sel });
              if (!v.errores.length && !v.avisos.length) return null;
              return (
                <div className="mt-3 space-y-1.5">
                  {v.errores.map((e, i) => (
                    <p key={`e${i}`} role="alert" className="rounded-lg bg-red-500/12 px-3 py-2 text-[12px] font-bold leading-relaxed text-red-200">{e}</p>
                  ))}
                  {v.avisos.map((a, i) => (
                    <p key={`a${i}`} className="rounded-lg bg-brand-orange/10 px-3 py-2 text-[12px] leading-relaxed text-brand-orange">{a}</p>
                  ))}
                </div>
              );
            })()}
          </section>

        </div>

        {/* Panel precio */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-[22px] bg-navy-900 p-6 text-white shadow-xl">
            <p className="eyebrow !text-brand-orange">Precio en vivo</p>
            {!res ? (
              <p className="mt-3 font-semibold text-white/60">Selecciona al menos una norma.</p>
            ) : (
              <>
                {res.fraccionado ? (
                  <>
                    <p className="mt-3 text-4xl font-extrabold tracking-tight">
                      {desde && <span className="mr-1.5 align-middle text-xl font-bold text-white/70">desde</span>}
                      {fmtEUR(res.fraccionado.totalSinIva)}<span className="text-base font-bold text-white/60"> {SUFIJO_SIN_IMPUESTOS}</span>
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white/70">{res.fraccionado.meses} meses de implantación</p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-4xl font-extrabold tracking-tight">
                      {desde && <span className="mr-1.5 align-middle text-xl font-bold text-white/70">desde</span>}
                      {fmtEUR(res.precioCatalogo)}<span className="text-base font-bold text-white/60">{esMes ? ` /mes ${SUFIJO_SIN_IMPUESTOS}` : ` ${SUFIJO_SIN_IMPUESTOS}`}</span>
                    </p>
                  </>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-white/10 p-3"><span className="text-white/60 text-xs">Sistemas</span><b className="block text-lg font-extrabold">{res.nSistemas}</b></div>
                  <div className="rounded-xl bg-white/10 p-3"><span className="text-white/60 text-xs">{esMes ? 'Horas/mes' : 'Horas totales'}</span><b className="block text-lg font-extrabold">{res.hTotal}</b></div>
                </div>

                {res.tiene9001 && (
                  <p className="mt-3 rounded-xl bg-brand-orange/20 p-2.5 text-xs font-bold text-brand-orange">ISO 9001 ya certificada: −50 % en sus horas aplicado.</p>
                )}

                {/* Condiciones de pago de la implantación · las dos, para comparar */}
                {res.formasPago && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">Condiciones de pago</p>
                    {[res.formasPago.unico, res.formasPago.dos].map((f) => {
                      const on = formaPago === f.id;
                      return (
                        <button key={f.id} onClick={() => setFormaPago(f.id)}
                          className={`w-full rounded-xl border p-2.5 text-left transition ${on ? 'border-brand-orange bg-brand-orange/15' : 'border-white/15 hover:border-brand-orange/50'}`}>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[13px] font-bold text-white">{on ? '✓ ' : ''}{f.titulo}</span>
                            <span className="text-[13px] font-extrabold text-white">{fmtEUR(f.sinIva)}<span className="text-[10px] font-bold text-white/60"> {SUFIJO_SIN_IMPUESTOS}</span></span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-white/70">{f.condicion}</p>
                          {f.id === 'unico'
                            ? <p className="mt-0.5 text-[11px] font-bold text-brand-verdeTexto">Ahorras {fmtEUR(f.ahorro)}</p>
                            : <p className="mt-0.5 text-[11px] text-white/60">{fmtEUR(f.cuota1SinIva)} + {fmtEUR(f.cuota2SinIva)}</p>}
                        </button>
                      );
                    })}
                    <p className="text-[10.5px] leading-snug text-white/50">{res.formasPago.nota}</p>
                  </div>
                )}

                {/* ── Cómo se forma la cuota ──
                    Sin este desglose, un cliente que pregunta «¿y si quito la
                    14001?» obliga a rehacer la oferta para responder. */}
                {res.volumen && (
                  <div className="space-y-1.5 rounded-2xl bg-white/10 p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">
                      Cómo se forma la cuota
                    </p>
                    {res.desgloseSistemas.map((s) => (
                      <p key={s.id} className="flex justify-between gap-2 text-[12px]">
                        <span className="text-white/75">
                          {s.nombre}
                          {s.manual && <span className="ml-1 text-[10px] font-bold text-brand-orange">pactado</span>}
                          {s.suelo && <span className="ml-1 text-[10px] text-white/40">mínimo</span>}
                        </span>
                        <span className="font-bold text-white">
                          {publico && <span className="text-[10px] font-normal text-white/50">desde </span>}
                          {fmtEUR(s.precio)}
                        </span>
                      </p>
                    ))}
                    {res.volumen.importePresencial > 0 && (
                      <p className="flex justify-between gap-2 text-[12px]">
                        <span className="text-white/75">Horas presenciales</span>
                        <span className="font-bold text-white">{fmtEUR(res.volumen.importePresencial)}</span>
                      </p>
                    )}
                    <p className="flex justify-between gap-2 border-t border-white/15 pt-1.5 text-[12px]">
                      <span className="text-white/75">Subtotal</span>
                      <span className="font-bold text-white">{fmtEUR(res.volumen.subtotal)}</span>
                    </p>
                    {res.volumen.pct > 0 && (
                      <p className="flex justify-between gap-2 text-[12px]">
                        <span className="text-brand-verdeTexto">
                          Descuento por {res.volumen.nSistemas} sistemas · {res.volumen.pct} %
                          {res.volumen.pct === res.volumen.tope && <span className="ml-1 text-[10px] text-white/40">tope</span>}
                        </span>
                        <span className="font-bold text-brand-verdeTexto">−{fmtEUR(res.volumen.importeDto)}</span>
                      </p>
                    )}
                    <p className="text-[10.5px] leading-snug text-white/50">
                      Mínimo {fmtEUR(res.volumen.suelo)} por sistema. Descuento por volumen: 5 % con 2, 10 % con 3,
                      15 % con 4 o más. Nunca más del {res.volumen.tope} %.
                    </p>
                  </div>
                )}

                {/* El precio de cada norma es un punto de partida, no una
                    tarifa. Decirlo aquí, junto a las cifras, y no solo en el
                    pie: es donde alguien mira antes de dar un precio. */}
                {publico && res.desgloseSistemas?.length > 0 && (
                  <p className="rounded-xl bg-white/5 px-3 py-2 text-[11px] leading-snug text-white/60">
                    {AVISO_NORMA_INDIVIDUAL}
                  </p>
                )}

                {!res.reglasActivas && (
                  <p className="rounded-2xl bg-brand-orange/15 p-2.5 text-[11.5px] font-bold text-brand-orange">
                    Reglas comerciales desactivadas: este es el precio de catálogo.
                  </p>
                )}

                {/* Reglas comerciales aplicadas a esta oferta */}
                {res.reglas?.length > 0 && (
                  <div className="mt-3 rounded-xl bg-brand-verde/15 p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-verdeTexto">
                      {publico ? 'Ventajas aplicadas' : 'Reglas comerciales aplicadas'}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {res.reglas.map((t, i) => (
                        <li key={i} className="text-[11.5px] leading-snug text-white/85">
                          <b className="text-white">{t.nombre}</b> · {t.efecto}
                        </li>
                      ))}
                    </ul>
                    {res.ajusteReglas !== 0 && (
                      <p className="mt-1.5 text-[11px] font-bold text-brand-verdeTexto">
                        {res.ajusteReglas < 0 ? 'Ahorro' : 'Ajuste'} sobre tarifa: {fmtEUR(Math.abs(res.ajusteReglas))}
                        {esMes ? '/mes' : ''} (tarifa {fmtEUR(res.precioBase)}{esMes ? '/mes' : ''})
                      </p>
                    )}
                  </div>
                )}

                {/* Plan de pagos según modelo */}
                <div className="mt-4 rounded-xl bg-white/10 p-3 text-xs leading-relaxed text-white/85">
                  <p className="font-extrabold text-white/90 mb-1">Forma de pago</p>
                  {esApoyo && <p>Pago único prepagado al 100 % (bolsa de horas). Acompañamiento a auditoría aparte (600 €/jornada).</p>}
                  {/* Las tres cuotas desaparecieron en la v99: la implantación
                      solo admite pago único o dos cuotas, y eso ya lo enseña el
                      bloque de arriba. Repetirlo aquí con otro reparto era decir
                      dos cosas distintas en la misma pantalla. */}
                  {esImpl && res.formasPago && (
                    <p>{res.formasPago.nota} Puedes elegir arriba cuál de las dos aplicar.</p>
                  )}
                  {esMes && <p>Cuota mensual recurrente. Permanencia mínima 12 meses.</p>}
                </div>

                {/* Datos del cliente, dentro del panel para no perder al usuario */}
                <div className="mt-4 border-t border-white/15 pt-4">
                  <ClienteDeOferta cli={cli} setCli={setCli} publico={publico} />
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-brand-orange">Tus datos {publico ? 'para recibir la propuesta' : 'para la oferta'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input required autoComplete="organization" className="col-span-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-brand-orange focus:outline-none" placeholder="Empresa / Cliente *" value={cli.empresa} onChange={e => setCli({ ...cli, empresa: e.target.value })} />
                    <input required autoComplete="given-name" className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-brand-orange focus:outline-none" placeholder="Nombre *" value={cli.nombre} onChange={e => setCli({ ...cli, nombre: e.target.value })} />
                    <input required autoComplete="family-name" className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-brand-orange focus:outline-none" placeholder="Apellidos *" value={cli.apellidos} onChange={e => setCli({ ...cli, apellidos: e.target.value })} />
                    {/* Email destacado: fila completa, texto grande, para que se lea bien lo que se escribe */}
                    <div className="col-span-2">
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brand-orange">Email * (te enviaremos aquí la propuesta)</label>
                      <input required autoComplete="email" type="email" inputMode="email" spellCheck={false} className="w-full rounded-lg border-2 border-white/25 bg-white/15 px-4 py-3 text-lg font-semibold text-white placeholder-white/40 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/40" placeholder="tucorreo@empresa.com" value={cli.email} onChange={e => setCli({ ...cli, email: e.target.value })} />
                    </div>
                    <input required autoComplete="tel" type="tel" className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-brand-orange focus:outline-none" placeholder="Teléfono *" value={cli.telefono} onChange={e => setCli({ ...cli, telefono: e.target.value })} />
                    <input required autoComplete="off" className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-brand-orange focus:outline-none" placeholder="CIF *" value={cli.cif} onChange={e => setCli({ ...cli, cif: e.target.value })} />
                    <input required autoComplete="organization-title" className="col-span-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-brand-orange focus:outline-none" placeholder="Cargo *" value={cli.cargo} onChange={e => setCli({ ...cli, cargo: e.target.value })} />
                    <input autoComplete="street-address" className="col-span-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-brand-orange focus:outline-none" placeholder="Dirección (opcional, sale en la oferta)" value={cli.direccion} onChange={e => setCli({ ...cli, direccion: e.target.value })} />
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium text-white/60">Todos los campos son obligatorios.</p>
                  <label className="mt-3 flex items-start gap-2 text-[11.5px] text-white/70 cursor-pointer">
                    <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-orange" />
                    <span>Acepto que TuConsultor trate mis datos para gestionar esta solicitud. <a href="/legal/privacidad.html" target="_blank" rel="noreferrer" className="font-semibold text-brand-orange underline">Política de privacidad</a> (RGPD).</span>
                  </label>
                </div>

                {/* ── Quién aprueba, solo en el generador interno ──
                    La oferta sale en firme: sin «desde» y sin condicionales.
                    Alguien tiene que responder de ese precio si mañana surge la
                    pregunta de por qué se ofertó así. */}
                {!publico && (
                  <div className="mt-4 rounded-xl border border-brand-orange/40 bg-white/[0.06] p-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-orange">
                      Aprobación del precio
                    </p>
                    <p className="mt-1 text-[11.5px] leading-snug text-white/70">
                      Esta oferta llega al cliente como precio en firme. Quien la aprueba
                      confirma que se han valorado el alcance, las sedes y la plantilla.
                    </p>
                    <select value={aprobador} onChange={(e) => setAprobador(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white focus:border-brand-orange focus:outline-none">
                      <option value="">— quién aprueba —</option>
                      {equipoAprob.map((p) => (
                        <option key={p.id} value={p.id} className="text-navy-900">
                          {`${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email}
                        </option>
                      ))}
                    </select>
                    <input value={notaAprobacion} onChange={(e) => setNotaAprobacion(e.target.value)}
                      placeholder="Por qué a este importe (opcional): sedes, complejidad, plantilla…"
                      className="mt-2 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[13px] text-white placeholder-white/40 focus:border-brand-orange focus:outline-none" />
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button onClick={() => generar('pdf')}
                    disabled={estado === 'gen' || plazoMal || (!publico && !aprobador)}
                    title={!publico && !aprobador ? 'Elige quién aprueba el precio' : ''}
                    className="flex-1 rounded-xl bg-[#10394A] py-3 text-sm font-extrabold text-[#EAF4F7] transition hover:bg-white/90 disabled:opacity-50">
                    {estado === 'gen' ? 'Generando…'
                      : plazoMal ? `El plazo no llega al mínimo del modelo (${res.minMeses} meses)`
                      : (!publico && !aprobador) ? 'Falta quién aprueba el precio'
                      : (publico ? 'Recibir mi propuesta' : 'Generar oferta')}
                  </button>
                </div>
                {error && <p className="mt-3 rounded-lg bg-red-500/20 p-2 text-xs font-bold text-red-100">{error}</p>}
                {estado?.ok && (
                  <div className="mt-3 rounded-xl bg-brand-orange/15 p-3 text-sm">
                    <p className="font-extrabold text-brand-orange">{publico ? 'Solicitud registrada' : `Oferta ${estado.numero} generada`}</p>
                    {estado.parcial ? (
                      <p className="mt-1 text-xs font-medium text-white/80">
                        {publico
                          ? 'Hemos recibido tu solicitud. Una persona del equipo te enviará la propuesta en PDF muy pronto.'
                          : `Oferta ${estado.numero} registrada. El documento se está generando; si no aparece, puedes regenerarlo desde Ofertas.`}
                      </p>
                    ) : (
                      <div className="mt-2 flex gap-3">
                        {estado.url_pdf && <a href={estado.url_pdf} target="_blank" rel="noreferrer" className="font-bold text-white underline">PDF</a>}
                        {estado.url_pptx && <a href={estado.url_pptx} target="_blank" rel="noreferrer" className="font-bold text-white underline">PowerPoint</a>}
                      </div>
                    )}
                    {!publico && cli.telefono.trim() && (
                      <a href={linkWhatsApp(cli.telefono, `Hola ${cli.nombre}, te enviamos la oferta ${estado.numero} de TuConsultor.`)}
                        target="_blank" rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-extrabold text-white transition hover:opacity-90">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                        Enviar por WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
            <div className="mt-5 border-t border-white/15 pt-4 text-[11px] font-medium leading-relaxed text-white/60">
              <p className="rounded-lg bg-white/5 p-2.5 text-white/70">
                <b className="block text-white/85">Aviso sobre esta oferta</b>
                {publico ? DISCLAIMER_OFERTA : DISCLAIMER_CORTO}
              </p>
              <p className="mt-2 font-semibold text-white/60">
                {LEYENDA_IMPUESTOS} El impuesto aplicable (IVA, IGIC o IPSI) se determina según el domicilio fiscal del cliente y se repercute en factura.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
