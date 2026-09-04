import { useState } from 'react';
import { ROLES_CONTACTO, ROL_LABEL, emailValido } from '../../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// CONTACTOS AL CREAR LA EMPRESA
//
// Antes solo se podían asignar contactos con la empresa ya creada, y eso obliga
// a guardar, esperar y volver. Aquí se apuntan durante el alta y se crean
// después, en la misma operación.
//
// Se quedan en memoria hasta que la empresa existe: no tienen a qué vincularse
// antes. Si el guardado de la empresa falla, no queda ningún contacto suelto.
// ════════════════════════════════════════════════════════════════════════════

const VACIO = () => ({ nombre: '', apellidos: '', email: '', movil: '', rol: 'directivo' });

export default function ContactosAlta({ lista, setLista }) {
  const [form, setForm] = useState(VACIO());
  const [error, setError] = useState(null);

  function anadir() {
    const n = form.nombre.trim();
    if (!n) { setError('Falta el nombre.'); return; }
    if (!form.email.trim()) { setError('Falta el correo: es lo que identifica a un contacto.'); return; }
    if (!emailValido(form.email.trim())) { setError(`«${form.email.trim()}» no es un correo válido.`); return; }
    if (lista.some((c) => c.email.toLowerCase() === form.email.trim().toLowerCase())) {
      setError('Ya has añadido ese correo a esta empresa.'); return;
    }
    if (form.rol !== 'secundario' && lista.some((c) => c.rol === form.rol)) {
      setError(`Ya hay alguien como ${(ROLES_CONTACTO.find((r) => r.k === form.rol)?.corto || form.rol).toLowerCase()}. Solo puede haber uno; el resto van como secundarios.`);
      return;
    }
    setLista([...lista, { ...form, nombre: n, email: form.email.trim().toLowerCase() }]);
    setForm(VACIO()); setError(null);
  }

  const quitar = (i) => setLista(lista.filter((_, j) => j !== i));

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] leading-relaxed text-[#9FC0CB]">
        Se crearán junto con la empresa. El primero con rol de dirección queda como contacto principal.
      </p>

      {lista.length > 0 && (
        <ul className="space-y-1.5">
          {lista.map((c, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-[#0D3242] px-3 py-2">
              <span className="chip !px-2 !py-0 bg-brand-verde/15 text-[10px] text-brand-verdeTexto">
                {ROLES_CONTACTO.find((r) => r.k === c.rol)?.corto || 'Secundario'}
              </span>
              <span className="text-[13px] font-bold text-[#EAF4F7]">
                {c.nombre} {c.apellidos}
              </span>
              <span className="text-[11.5px] text-[#9FC0CB]">{c.email}</span>
              {c.movil && <span className="text-[11.5px] text-[#7FA7B4]">· {c.movil}</span>}
              <button type="button" onClick={() => quitar(i)}
                className="ml-auto text-[11px] font-bold text-red-300 hover:text-red-200">Quitar</button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label" htmlFor="ca-nombre">Nombre <span className="text-brand-orange">*</span></label>
          <input id="ca-nombre" className="input !py-1.5 !text-[13px]" value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="ca-apellidos">Apellidos</label>
          <input id="ca-apellidos" className="input !py-1.5 !text-[13px]" value={form.apellidos}
            onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="ca-email">Correo <span className="text-brand-orange">*</span></label>
          <input id="ca-email" type="email" className="input !py-1.5 !text-[13px]" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="ca-movil">Móvil</label>
          <input id="ca-movil" type="tel" className="input !py-1.5 !text-[13px]" value={form.movil}
            onChange={(e) => setForm({ ...form, movil: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="ca-rol">Rol</label>
          <select id="ca-rol" className="input !py-1.5 !text-[13px]" value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}>
            {ROLES_CONTACTO.map((r) => <option key={r.k} value={r.k}>{r.corto}</option>)}
            <option value="secundario">Secundario</option>
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/12 px-3 py-2 text-[12px] font-bold text-red-200">{error}</p>
      )}

      <button type="button" onClick={anadir} className="btn-ghost !px-3 !py-1.5 text-xs">
        + Añadir contacto a la lista
      </button>
    </div>
  );
}
