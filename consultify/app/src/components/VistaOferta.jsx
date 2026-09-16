import { useMemo } from 'react';
import {
  condiciones, REQUISITOS_LEGALES, clausulas, propuesta, textoDedicacion,
  nombresDeNormas, fasesDeLosPlanes, describirAjuste, emisorDe,
} from '../lib/contenidoOferta.js';
import { cuadroFacturacion, mesLargo } from '../lib/facturacion.js';
import { eurES, numeroES } from '../lib/formato.js';

// ════════════════════════════════════════════════════════════════════════════
// VISTA DE LA OFERTA · el documento, en pantalla (v141)
//
// Es el PDF, sección por sección, pintado en HTML con los MISMOS textos
// (contenidoOferta.js) y los mismos datos (`documento` = { r, cli, anexo }).
// La ve el cliente en su portal y en el enlace del correo, y la ve el equipo
// antes de generar la oferta y desde el histórico. Un solo componente: si se
// cambia algo aquí, cambia para los dos.
//
// El cliente no ve la lógica: ni reglas, ni horas por nivel, ni márgenes, ni
// motivos de los ajustes. Eso lo pinta el padre (PanelLogicaOferta) solo en
// modo equipo, fuera del documento.
// ════════════════════════════════════════════════════════════════════════════

const eur = (v) => eurES(v, 2);
const eur0 = (v) => eurES(v, 0);
const fechaLarga = (f) => {
  if (!f) return null;
  const d = new Date(`${String(f).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
};
const HOY = () => new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

// Paleta del documento (la del PDF), sobre papel blanco.
const C = { navy: '#0A2B3A', hondo: '#06131B', teal: '#1FA1A6', naranja: '#F99001', tinta: '#12303D', apagado: '#6B8795', linea: '#E2EAEF', suave: '#F4F8FA', claro: '#8CB3C0' };

function Seccion({ children }) {
  return (
    <div className="mt-7 first:mt-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: C.naranja }}>{children}</p>
      <span className="mt-1 block h-[2px] w-8" style={{ background: C.naranja }} />
    </div>
  );
}
const H2 = ({ children }) => <h3 className="mt-3 text-[19px] font-extrabold leading-tight" style={{ color: C.tinta }}>{children}</h3>;
const P = ({ children, className = '' }) => <p className={`mt-2 text-[12.5px] leading-relaxed ${className}`} style={{ color: C.tinta }}>{children}</p>;
const Dato = ({ etq, v }) => (
  <div>
    <p className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: C.apagado }}>{etq}</p>
    <p className="mt-0.5 text-[13px] font-semibold" style={{ color: C.tinta }}>{v || '—'}</p>
  </div>
);

export default function VistaOferta({ documento, compacto = false }) {
  const r = documento?.r; const cli = documento?.cli || {}; const anexo = documento?.anexo || [];
  const EM = useMemo(() => emisorDe(r), [r]);
  if (!r) return <p className="text-[12.5px] text-[#9FC0CB]">No hay documento que enseñar.</p>;

  const esImpl = r.modelo === 'Implantación';
  const esMes = r.tipo === 'mes' && !esImpl;
  const esWeb = r.canal === 'web';
  const adelantadoPortada = esMes && r.pagoAdelantado && r.adelantado;
  const importePortada = adelantadoPortada ? r.adelantado.total : r.formasPago ? (r.formasPago.unico?.sinIva ?? r.precioCatalogo) : r.precioCatalogo;
  const prop = propuesta(r, cli);
  const normas = nombresDeNormas(r);
  const planes = fasesDeLosPlanes(r);
  const ajustes = (r.ajustes || []).filter((a) => a.efecto);
  const hitos = [
    ['Inicio previsto', fechaLarga(r.fecha_inicio)],
    [esImpl ? 'Fin del proyecto' : 'Fin de contrato', fechaLarga(r.fecha_fin)],
    ['Certificación prevista', fechaLarga(r.fecha_certificacion) || 'Por determinar'],
  ].filter(([, v]) => v);
  const cuadro = cuadroFacturacion({
    tipo: r.tipo, importe: r.precioCatalogo, adelantado: !!r.pagoAdelantado,
    firma: r.fecha_primer_pago || r.fecha_inicio || null, meses: r.tipo === 'mes' ? 12 : r.meses,
    formaPago: r.formaPagoElegida || r.forma_pago, certificacion: r.fecha_certificacion || null,
  });
  const hComprometidas = Number(r.hTotal) || 0;
  const horasDe = (f) => (r.tipo === 'mes' ? hComprometidas : cuadro.totalBase > 0 ? Math.round(hComprometidas * (Number(f.base || 0) / cuadro.totalBase) * 10) / 10 : 0);
  let acumulado = 0;

  return (
    <div className="mx-auto max-w-[800px] overflow-hidden rounded-2xl bg-white text-left shadow-2xl" style={{ color: C.tinta }}>
      {/* ══ Portada ══ */}
      <div className="relative px-8 pb-8 pt-7 sm:px-12" style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navy} 70%, ${C.hondo} 100%)` }}>
        <div className="absolute inset-x-0 top-0 flex h-1.5"><span className="w-[42%]" style={{ background: C.teal }} /><span className="w-[24%]" style={{ background: '#8C5C14' }} /><span className="flex-1" style={{ background: C.naranja }} /></div>
        <p className="text-[13px] font-extrabold tracking-tight text-white">TuConsultor</p>
        <p className="mt-6 text-[9.5px] font-bold uppercase tracking-[0.24em]" style={{ color: C.naranja }}>Propuesta de servicios</p>
        <h2 className="mt-3 text-[28px] font-extrabold leading-tight text-white sm:text-[32px]">{cli.empresa || 'Propuesta'}</h2>
        <p className="mt-2 text-[12.5px]" style={{ color: C.claro }}>{normas.join(' · ')}</p>
        <div className={compacto ? 'mt-6' : 'mt-10'}>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: C.teal }}>
            {(adelantadoPortada ? 'Pago anual por adelantado' : esMes ? 'Cuota mensual' : 'Inversión') + (esWeb ? ' desde' : '')}
          </p>
          <p className="mt-1 text-[40px] font-extrabold leading-none text-white">
            {eur0(importePortada)}<span className="ml-2 text-[11px] font-normal" style={{ color: C.claro }}>{adelantadoPortada ? '/año · sin impuestos' : esMes ? '/mes · sin impuestos' : 'sin impuestos'}</span>
          </p>
          {adelantadoPortada && <p className="mt-1.5 text-[11px]" style={{ color: C.naranja }}>{r.adelantado.mesesServicio} meses de servicio por {r.adelantado.mesesCobrados} mensualidades de {eur0(r.precioCatalogo)} · ahorro de {eur0(r.adelantado.ahorro)}</p>}
          {r.formasPago && <p className="mt-1.5 text-[11px]" style={{ color: C.naranja }}>con {Math.round((r.formasPago.descuentoUnico || 0) * 100)} % de descuento por pago único</p>}
        </div>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-2 text-[10px]" style={{ color: '#7399A8' }}>
          <div><p className="font-semibold">Oferta {r.numero || cli.ref || '—'}</p><p>{fechaLarga(r.fecha_emision) || HOY()}</p></div>
          <p>{EM.pieCorto}</p>
        </div>
      </div>

      <div className="px-8 py-8 sm:px-12">
        {/* ══ La propuesta ══ */}
        <Seccion>La propuesta</Seccion>
        <H2>{prop.titulo}</H2>
        <P>{prop.texto}</P>
        <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Dato etq="Cliente" v={cli.empresa} />
          <Dato etq="CIF" v={cli.cif} />
          <Dato etq="Persona de contacto" v={[cli.contacto || cli.email, cli.cargo].filter(Boolean).join(' · ')} />
          {cli.email && cli.contacto && <Dato etq="Correo de contacto" v={cli.email} />}
          <Dato etq="Modelo de servicio" v={r.modelo + (esImpl && r.meses ? ` · ${r.meses} meses` : '')} />
          <Dato etq="Sistemas incluidos" v={String(normas.length)} />
          <Dato etq="Dedicación comprometida" v={textoDedicacion(r)} />
          {r.complejidad && <Dato etq="Complejidad" v={r.complejidad} />}
          {r.sedes > 1 && <Dato etq="Sedes o alcances" v={String(r.sedes)} />}
        </div>

        {/* ══ Alcance ══ */}
        <Seccion>Alcance</Seccion>
        <ul className="mt-3 space-y-1.5">
          {normas.map((n) => <li key={n} className="flex items-center gap-2.5 text-[13px] font-semibold"><span className="h-2 w-2 shrink-0" style={{ background: C.teal }} />{n}</li>)}
        </ul>

        {/* ══ Fases de los planes ══ */}
        {planes.map((plan) => (
          <div key={plan.plan}>
            <Seccion>Fases · {plan.plan}</Seccion>
            <P>{plan.parcial
              ? `Se contratan ${plan.fases.length} de las ${plan.totalFases} fases del plan, ${plan.horas} horas en total. Las fases no incluidas quedan fuera del alcance y pueden contratarse por separado.`
              : `El plan se desarrolla en ${plan.fases.length} fases, ${plan.horas} horas en total. Cada una tiene sus tareas y su dedicación.`}</P>
            <div className="mt-2 space-y-2">
              {plan.fases.map((f) => (
                <div key={f.nombre} className="border-l-[3px] pl-3" style={{ borderColor: C.teal }}>
                  <div className="flex items-baseline justify-between gap-3"><p className="text-[12.5px] font-bold">{f.nombre}</p><p className="text-[12.5px] font-bold" style={{ color: C.teal }}>{f.horas} h</p></div>
                  <p className="text-[11px]" style={{ color: C.apagado }}>{f.tareas.join(' · ')}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ══ Calendario ══ */}
        {hitos.length > 0 && (
          <>
            <Seccion>Calendario</Seccion>
            <div className="mt-3 grid gap-3 border-l-4 px-4 py-3 sm:grid-cols-3" style={{ background: C.suave, borderColor: C.naranja }}>
              {hitos.map(([etq, v]) => <Dato key={etq} etq={etq} v={v} />)}
            </div>
          </>
        )}

        {/* ══ Inversión ══ */}
        <Seccion>Inversión</Seccion>
        <div className="mt-3 border-l-4 px-5 py-4" style={{ background: C.suave, borderColor: C.naranja }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: C.apagado }}>
            {(esMes ? 'Cuota mensual' : r.tipo === 'bolsa' ? 'Importe de la bolsa' : 'Importe del proyecto') + (esWeb ? ' desde' : '')}
          </p>
          <p className="mt-1 text-[28px] font-extrabold leading-none">
            {eur(r.formasPago ? (r.formasPago.dos?.sinIva ?? r.precioCatalogo) : r.precioCatalogo)}
            <span className="ml-2 text-[11px] font-normal" style={{ color: C.apagado }}>{esMes ? '/mes sin impuestos' : 'sin impuestos'}</span>
          </p>
          <p className="mt-1.5 text-[11px]" style={{ color: C.apagado }}>Impuestos indirectos no incluidos.</p>
          {r.pagoAdelantado && r.adelantado && (
            <div className="mt-3 border-l-[3px] bg-white px-3 py-2" style={{ borderColor: C.naranja }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: C.apagado }}>Pago anual por adelantado</p>
              <p className="text-[17px] font-extrabold">{eur(r.adelantado.total)} <span className="text-[11px] font-normal" style={{ color: C.apagado }}>{r.adelantado.mesesCobrados} mensualidades · {r.adelantado.mesesServicio} meses de servicio · ahorro de {eur(r.adelantado.ahorro)}</span></p>
            </div>
          )}
          {esWeb && (
            <div className="mt-3 border-l-[3px] px-3 py-2" style={{ background: '#FEF3E0', borderColor: C.naranja }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: '#8C5908' }}>Estimación · pendiente de aprobación</p>
              <p className="text-[11.5px]" style={{ color: '#6B470A' }}>El equipo consultor revisará alcance, sedes y plantilla antes de la propuesta definitiva.</p>
            </div>
          )}
        </div>

        {/* ══ Condiciones particulares (ajustes) ══ */}
        {ajustes.length > 0 && (
          <div className="mt-5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: C.teal }}>Condiciones particulares de esta propuesta</p>
            <p className="mt-1 text-[11.5px]" style={{ color: C.apagado }}>Precio de catálogo: {eur(r.precioAntesDeAjustes)}{esMes ? '/mes' : ''}</p>
            <ul className="mt-1.5 space-y-1">
              {ajustes.map((a, i) => { const d = describirAjuste(a); return <li key={i} className="flex justify-between gap-3 text-[12.5px]"><span className="font-semibold">· {d.concepto}</span><span className="font-semibold" style={{ color: a.efecto < 0 ? C.teal : C.naranja }}>{d.efecto}</span></li>; })}
            </ul>
            <p className="mt-2 border-t pt-2 text-[13px] font-extrabold" style={{ borderColor: C.linea }}>Precio de esta propuesta: {eur(r.precioCatalogo)}{esMes ? '/mes' : ''}</p>
          </div>
        )}

        {/* ══ Formas de pago (implantación) ══ */}
        {r.formasPago && (
          <>
            <Seccion>Formas de pago</Seccion>
            <P>{r.formasPago.intro || 'La implantación no admite cuota mensual. Se abona de una de estas dos formas, a elección de la organización:'}</P>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[r.formasPago.unico, r.formasPago.dos].filter(Boolean).map((op, i) => {
                const elegida = r.formaPagoElegida === op.id || (!r.formaPagoElegida && i === 0);
                return (
                  <div key={op.id} className="rounded-lg border-2 px-4 py-3" style={{ borderColor: elegida ? C.naranja : C.linea }}>
                    <p className="text-[12.5px] font-bold"><span className="mr-2 text-[10px]" style={{ color: elegida ? C.naranja : C.apagado }}>{String.fromCharCode(65 + i)}</span>{op.titulo}</p>
                    <p className="mt-1 text-[18px] font-extrabold">{eur(op.sinIva)} <span className="text-[10px] font-normal" style={{ color: C.apagado }}>sin impuestos</span></p>
                    {op.ahorro ? <p className="text-[11.5px] font-semibold" style={{ color: C.teal }}>Ahorras {eur(op.ahorro)}</p> : op.cuota1SinIva ? <p className="text-[11.5px]" style={{ color: C.apagado }}>{eur(op.cuota1SinIva)} + {eur(op.cuota2SinIva)}</p> : null}
                    <p className="mt-1 text-[11px]" style={{ color: C.apagado }}>{op.condicion}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══ Cuándo se factura ══ */}
        {r.pagoAdelantado && r.adelantado ? (
          <>
            <Seccion>Cuándo se factura</Seccion>
            <P>Pago único por adelantado: se abonan {r.adelantado.mesesCobrados} mensualidades y se prestan {r.adelantado.mesesServicio} meses de servicio.</P>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-l-4 px-4 py-3" style={{ background: C.suave, borderColor: C.naranja }}>
              <div><p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: C.apagado }}>Pago único</p><p className="text-[24px] font-extrabold leading-none">{eur(r.adelantado.total)} <span className="text-[10px] font-normal" style={{ color: C.apagado }}>sin impuestos</span></p></div>
              <div className="text-right"><p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: C.apagado }}>Vencimiento</p><p className="text-[13px] font-bold">{fechaLarga(r.fecha_primer_pago || r.fecha_inicio) || 'a la firma del contrato'}</p></div>
              <p className="w-full text-[11px]" style={{ color: C.apagado }}>Equivale a {eur(r.precioCatalogo)}/mes durante {r.adelantado.mesesServicio} meses · ahorro de {eur(r.adelantado.ahorro)} frente al pago mensual{hComprometidas > 0 ? ` · ${numeroES(hComprometidas * r.adelantado.mesesServicio, null)} h comprometidas` : ''}</p>
            </div>
          </>
        ) : (cuadro.filas.length > 1 || r.tipo === 'mes') ? (
          <>
            <Seccion>Cuándo se factura</Seccion>
            <P>{r.tipo === 'mes' ? `Cuota mensual desde el inicio del servicio. ${cuadro.filas.length} ${cuadro.filas.length === 1 ? 'cargo' : 'cargos'} durante la vigencia del contrato.` : 'Calendario de facturación previsto desde la firma.'}</P>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead><tr className="text-left text-[9px] uppercase tracking-[0.12em]" style={{ color: C.apagado }}><th className="py-1 font-bold">Fecha</th><th className="py-1 font-bold">Concepto</th><th className="py-1 text-right font-bold">Horas</th><th className="py-1 text-right font-bold">Importe</th><th className="py-1 text-right font-bold">Acumulado</th></tr></thead>
                <tbody>
                  {cuadro.filas.map((f, i) => { acumulado = Math.round((acumulado + Number(f.base || 0)) * 100) / 100; return (
                    <tr key={i} className="border-t" style={{ borderColor: C.linea }}>
                      <td className="py-1.5 capitalize">{mesLargo(f.mes)}</td>
                      <td className="py-1.5" style={{ color: C.apagado }}>{f.concepto}</td>
                      <td className="py-1.5 text-right" style={{ color: C.apagado }}>{hComprometidas > 0 ? `${numeroES(horasDe(f), null)} h` : '—'}</td>
                      <td className="py-1.5 text-right" style={{ color: C.apagado }}>{eur(f.base)}</td>
                      <td className="py-1.5 text-right font-semibold">{eur(acumulado)}</td>
                    </tr>); })}
                </tbody>
              </table>
              <p className="mt-2 border-t pt-2 text-right text-[12px] font-extrabold" style={{ borderColor: C.linea }}>{hComprometidas > 0 ? `${numeroES(r.tipo === 'mes' ? hComprometidas * cuadro.filas.length : hComprometidas, null)} h · ` : ''}{eur(cuadro.totalBase)} en total · impuestos indirectos no incluidos</p>
            </div>
          </>
        ) : null}

        {/* ══ Servicios adicionales (v143) ══
            El acompañamiento a la auditoría externa se contrata por jornadas y
            se factura aparte de la cuota o del proyecto. En el modelo
            «Auditoría» es lo único que se contrata y ya va en el importe. */}
        {r.auditoria && !r.auditoria.enPrecio && (
          <>
            <Seccion>Servicios adicionales</Seccion>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3 border-l-4 px-4 py-3" style={{ background: C.suave, borderColor: C.teal }}>
              <div>
                <p className="text-[13px] font-bold">Acompañamiento a la auditoría externa</p>
                <p className="text-[11.5px]" style={{ color: C.apagado }}>{r.auditoria.jornadas} {r.auditoria.jornadas === 1 ? 'jornada' : 'jornadas'} × {eur(r.auditoria.precioDia)} · un consultor presente el día de la auditoría</p>
              </div>
              <p className="text-[20px] font-extrabold">{eur(r.auditoria.importe)} <span className="text-[10px] font-normal" style={{ color: C.apagado }}>sin impuestos</span></p>
              <p className="w-full text-[11px]" style={{ color: C.apagado }}>Se factura aparte de {esMes ? 'la cuota' : 'el importe del proyecto'}, en el mes en que se preste. Resérvalo con al menos 15 días.</p>
            </div>
          </>
        )}

        {/* ══ Condiciones ══ */}
        <Seccion>Condiciones</Seccion>
        <ul className="mt-3 space-y-1.5">
          {condiciones(r).map((c, i) => <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed" style={{ color: C.apagado }}><span className="font-extrabold" style={{ color: C.naranja }}>·</span><span>{c}</span></li>)}
        </ul>

        {/* ══ Notas ══ */}
        {r.notas && String(r.notas).trim() && (
          <>
            <Seccion>Notas de esta propuesta</Seccion>
            <ul className="mt-3 space-y-1.5">
              {String(r.notas).split('\n').map((x) => x.trim()).filter(Boolean).map((l, i) => <li key={i} className="border-l-[3px] pl-3 text-[12.5px] leading-relaxed" style={{ borderColor: C.teal }}>{l}</li>)}
            </ul>
          </>
        )}

        {/* ══ Aceptación ══ */}
        <Seccion>Aceptación</Seccion>
        <P>La firma de este documento supone la aceptación de la propuesta y de las condiciones recogidas en los anexos.</P>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="px-4 py-3" style={{ background: C.suave }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: C.apagado }}>Por {EM.marca}</p>
            <p className="mt-2 text-[13px] font-bold">{EM.firmante}</p>
            <p className="text-[11px]" style={{ color: C.apagado }}>{EM.cargo}</p>
            <p className="text-[10px]" style={{ color: C.apagado }}>{EM.razonSocial} · CIF {EM.cif}</p>
            <p className="mt-5 border-t pt-1 text-[9px]" style={{ borderColor: C.linea, color: C.apagado }}>Firma y fecha</p>
          </div>
          <div className="border px-4 py-3" style={{ borderColor: C.linea }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: C.apagado }}>Por la organización</p>
            <p className="mt-2 text-[13px] font-bold">{cli.empresa || ''}</p>
            <p className="text-[11px]" style={{ color: C.apagado }}>{cli.contacto || 'Persona con capacidad de firma'}</p>
            <p className="mt-9 border-t pt-1 text-[9px]" style={{ borderColor: C.linea, color: C.apagado }}>Firma y fecha</p>
          </div>
        </div>

        {/* ══ Anexos ══ */}
        {!compacto && (
          <>
            <Seccion>Anexo I</Seccion>
            <H2>Tareas incluidas</H2>
            <P>Relación de tareas del programa, agrupadas por proceso. Es el detalle de lo que se ejecuta, no un cronograma.</P>
            {anexo.some((g) => (g.subs || []).length) ? anexo.map((g) => (
              <div key={g.bloque} className="mt-3">
                <p className="border-b pb-1 text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: C.teal, borderColor: C.linea }}>{g.bloque}</p>
                <ul className="mt-1.5 space-y-0.5">{(g.subs || []).map((t, i) => <li key={i} className="flex gap-2 text-[11.5px]"><span style={{ color: C.naranja }}>•</span>{typeof t === 'string' ? t : (t.subproceso || t.sub || t.titulo || '')}</li>)}</ul>
              </div>
            )) : <P>No hay tareas asociadas a los sistemas seleccionados en este modelo.</P>}

            <Seccion>Anexo II</Seccion>
            <H2>Requisitos legales aplicables</H2>
            <P>Marco normativo que enmarca los servicios de esta propuesta. No es una lista exhaustiva ni sustituye al asesoramiento jurídico: el marco aplicable a cada organización depende de su sector, su tamaño y su actividad.</P>
            <div className="mt-3 space-y-3">
              {REQUISITOS_LEGALES.map(([t, x]) => <div key={t}><p className="text-[12.5px] font-bold">{t}</p><p className="text-[11.5px] leading-relaxed" style={{ color: C.apagado }}>{x}</p></div>)}
            </div>

            <Seccion>Anexo III</Seccion>
            <H2>Qué se contrata exactamente</H2>
            <P>Este anexo explica en lenguaje claro cómo funciona el modelo contratado. Está aquí para que no haya interpretaciones distintas dentro de seis meses.</P>
            <div className="mt-3 space-y-3">
              {clausulas(r).map(([t, x]) => <div key={t} className="border-l-[3px] pl-3" style={{ borderColor: C.naranja }}><p className="text-[13px] font-bold">{t}</p><p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed">{x}</p></div>)}
            </div>
          </>
        )}

        <p className="mt-8 border-t pt-3 text-[10px]" style={{ borderColor: C.linea, color: C.apagado }}>{EM.legalPie}</p>
      </div>
    </div>
  );
}

// ── Lo que solo ve el equipo ────────────────────────────────────────────────
export function PanelLogicaOferta({ logica, notasInternas = null, esMes = false, extra = null }) {
  if (!logica) return null;
  const L = logica;
  const r = L.rentabilidad;
  const T = r ? ({ si: 'bg-emerald-500/15 text-emerald-200', justo: 'bg-amber-400/15 text-amber-100', no: 'bg-red-500/15 text-red-200' }[r.encaja] || 'bg-white/10 text-white/70') : '';
  return (
    <aside className="space-y-3 rounded-2xl border border-brand-orange/40 bg-[#0B2E3D] p-4 text-[12px] text-[#CFE3E9]">
      <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-brand-orange">Lógica de la oferta · solo equipo</p>
      <p className="text-[11px] text-[#7FA7B4]">Nada de esto sale en el documento ni lo ve el cliente.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.05] p-2"><p className="text-[10px] text-[#7FA7B4]">Tarifa (sin reglas)</p><p className="font-extrabold text-[#EAF4F7]">{L.precioBase != null ? eur(L.precioBase) : '—'}</p></div>
        <div className="rounded-lg bg-white/[0.05] p-2"><p className="text-[10px] text-[#7FA7B4]">Precio final</p><p className="font-extrabold text-[#EAF4F7]">{eur(L.precioCatalogo)}{esMes ? '/mes' : ''}</p></div>
        {L.hTotal != null && <div className="rounded-lg bg-white/[0.05] p-2"><p className="text-[10px] text-[#7FA7B4]">Horas comprometidas</p><p className="font-extrabold text-[#EAF4F7]">{L.hTotal} h{esMes ? '/mes' : ''}</p></div>}
        {L.hInternas != null && <div className="rounded-lg bg-white/[0.05] p-2"><p className="text-[10px] text-[#7FA7B4]">Horas internas (coste real)</p><p className="font-extrabold text-[#EAF4F7]">{L.hInternas} h{esMes ? '/mes' : ''}</p></div>}
      </div>
      {L.horas && Object.keys(L.horas).length > 0 && (
        <p className="text-[11px]"><b className="text-[#EAF4F7]">Por nivel:</b> {Object.entries(L.horas).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${Math.round(v * 10) / 10} h`).join(' · ')}</p>
      )}
      {L.desgloseSistemas?.length > 0 && (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9FC0CB]">Cómo se forma la cuota</p>
          {L.desgloseSistemas.map((s) => <p key={s.id} className="flex justify-between"><span>{s.nombre}{s.manual ? ' · pactado' : ''}{s.suelo ? ' · mínimo' : ''}</span><b className="text-[#EAF4F7]">{eur(s.precio)}</b></p>)}
          {L.volumen && <>
            {L.volumen.presencialIncluido > 0 && <p className="text-[11px] text-[#7FA7B4]">Incluye {eur(L.volumen.presencialIncluido)} de horas presenciales, repartidos entre los sistemas: no se cobran aparte.</p>}
            <p className="flex justify-between border-t border-white/10 pt-1"><span>Subtotal</span><b className="text-[#EAF4F7]">{eur(L.volumen.subtotal)}</b></p>
            {L.volumen.pct > 0 && <p className="flex justify-between text-brand-verdeTexto"><span>Descuento por {L.volumen.nSistemas} sistemas · {L.volumen.pct} %</span><b>−{eur(L.volumen.importeDto)}</b></p>}
          </>}
        </div>
      )}
      {L.reglas?.length > 0 ? (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9FC0CB]">Reglas comerciales aplicadas</p>
          <ul className="mt-1 space-y-0.5">{L.reglas.map((x, i) => <li key={i}><b className="text-[#EAF4F7]">{x.nombre}</b> · {x.efecto}</li>)}</ul>
          {L.ajusteReglas ? <p className="mt-1 text-[11px] text-brand-verdeTexto">{L.ajusteReglas < 0 ? 'Ahorro' : 'Ajuste'} sobre tarifa: {eur(Math.abs(L.ajusteReglas))}</p> : null}
        </div>
      ) : L.reglasActivas === false ? <p className="text-[11px] text-brand-orange">Reglas comerciales desactivadas: precio de catálogo.</p> : null}
      {L.ajustes?.length > 0 && (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9FC0CB]">Ajustes de esta oferta (con su motivo)</p>
          <ul className="mt-1 space-y-0.5">{L.ajustes.map((a, i) => <li key={i}><b className="text-[#EAF4F7]">{describirAjuste(a).concepto}</b> {describirAjuste(a).efecto}{a.motivo ? <span className="text-[#7FA7B4]"> — {a.motivo}</span> : null}</li>)}</ul>
        </div>
      )}
      {r && (
        <div className={`rounded-lg px-2.5 py-1.5 ${T}`}>
          <p className="font-extrabold">{({ si: 'Encaja', justo: 'Justo', no: 'Por debajo' }[r.encaja] || '—')}{r.margenReal != null ? ` · margen ${Math.round(r.margenReal * 100)} %` : ''}</p>
          {r.mensual && <p className="text-[11px]">{eur(r.mensual.cobrado)}/mes cobrado · {eur(r.mensual.coste)}/mes coste · {r.mensual.resultado >= 0 ? '+' : '−'}{eur(Math.abs(r.mensual.resultado))}/mes{r.anual ? ` · ${r.anual.resultado >= 0 ? '+' : '−'}${eur(Math.abs(r.anual.resultado))}/año` : ''}</p>}
        </div>
      )}
      {L.margen != null && !r && <p className="text-[11px]">Margen teórico: {Math.round(L.margen * 100)} %{L.coste != null ? ` · coste ${eur(L.coste)}` : ''}</p>}
      {notasInternas && <div><p className="text-[10px] font-extrabold uppercase tracking-wider text-red-300">Notas internas · no salen en ningún documento</p><p className="mt-1 whitespace-pre-line">{notasInternas}</p></div>}
      {extra}
    </aside>
  );
}
