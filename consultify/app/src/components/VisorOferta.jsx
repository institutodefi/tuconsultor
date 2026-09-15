import { useState } from 'react';
import DialogoFicha from './DialogoFicha.jsx';
import VistaOferta, { PanelLogicaOferta } from './VistaOferta.jsx';

// ════════════════════════════════════════════════════════════════════════════
// VISOR DE LA OFERTA · la ventana (v141)
//
// Envuelve VistaOferta en un diálogo ancho con dos vistas:
//   · «Como la ve el cliente»: solo el documento. Es EXACTAMENTE lo que ve el
//     cliente en su portal o en el enlace del correo.
//   · «Con la lógica»: el mismo documento y, al lado, lo que solo ve el
//     equipo (tarifa, reglas, horas por nivel, margen, motivos, notas internas).
// Las acciones (generar, enviar, enlace, editar…) las pone quien lo abre en
// `acciones`: desde el visor se puede hacer todo lo que se hace en la tabla.
// ════════════════════════════════════════════════════════════════════════════
export default function VisorOferta({ documento, logica = null, notasInternas = null, titulo = 'Vista previa de la oferta', subtitulo = '', onCerrar, acciones = null, mensaje = null, cabecera = null, modoInicial = 'equipo', soloCliente = false }) {
  const [modo, setModo] = useState(soloCliente ? 'cliente' : modoInicial);
  const conLogica = modo === 'equipo' && !soloCliente && !!logica;
  const esMes = documento?.r?.tipo === 'mes' && documento?.r?.modelo !== 'Implantación';
  return (
    <DialogoFicha titulo={titulo} subtitulo={subtitulo} onCerrar={onCerrar} ancho={conLogica ? '1240px' : '900px'}
      pie={<div className="flex w-full flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {!soloCliente && (
            <div className="inline-flex rounded-lg border border-[#1E5468] p-0.5 text-[11.5px] font-bold">
              <button type="button" onClick={() => setModo('cliente')} className={`rounded-md px-2.5 py-1 ${modo === 'cliente' ? 'bg-brand-orange text-[#0A2B3A]' : 'text-[#9FC0CB] hover:text-[#EAF4F7]'}`} title="Exactamente lo que ve el cliente: el documento, sin la lógica">Como la ve el cliente</button>
              <button type="button" onClick={() => setModo('equipo')} className={`rounded-md px-2.5 py-1 ${modo === 'equipo' ? 'bg-brand-orange text-[#0A2B3A]' : 'text-[#9FC0CB] hover:text-[#EAF4F7]'}`} title="El documento y, al lado, tarifa, reglas, horas, margen y notas internas">Con la lógica</button>
            </div>
          )}
          {mensaje}
        </div>
        <div className="flex flex-wrap items-center gap-2">{acciones}<button type="button" onClick={onCerrar} className="btn-ghost !px-3 !py-1.5 text-[12.5px]">Cerrar</button></div>
      </div>}>
      <div className={conLogica ? 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start' : ''}>
        <div>
          {cabecera && <div className="mb-3">{cabecera}</div>}
          {modo === 'cliente' && !soloCliente && <p className="mb-2 text-center text-[11px] font-bold text-[#7FA7B4]">Así llega al cliente. Lo que no está aquí, el cliente no lo ve.</p>}
          <VistaOferta documento={documento} />
        </div>
        {conLogica && <div className="lg:sticky lg:top-0"><PanelLogicaOferta logica={logica} notasInternas={notasInternas} esMes={esMes} /></div>}
      </div>
    </DialogoFicha>
  );
}
