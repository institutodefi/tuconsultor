import { Link } from 'react-router-dom';

// ════════════════════════════════════════════════════════════════════════════
// UN DATO QUE SE VE AQUÍ PERO SE EDITA EN SU SITIO
//
// El nombre de una empresa, su CIF o el correo de un contacto aparecen en la
// oferta, en el contrato, en el proyecto y en los paneles. Si en cada uno se
// pueden editar, cada uno acaba con su propia versión y no hay forma de saber
// cuál es la buena: se corrige el CIF en la oferta, sigue mal en el CRM, y el
// siguiente documento vuelve a salir con el equivocado.
//
// Estos datos tienen UN dueño:
//   · empresa, CIF, dirección  →  ficha de Empresa
//   · nombre, cargo, correo, teléfono de una persona  →  ficha de Contacto
//
// Aquí se muestran en solo lectura, con un enlace a donde sí se editan. Es la
// única forma de que la bidireccionalidad sea real: un solo origen, y todos los
// sitios lo leen.
//
// El valor guardado en la oferta se conserva —es lo que se imprimió y no debe
// cambiar retroactivamente—, pero si difiere del CRM se avisa.
// ════════════════════════════════════════════════════════════════════════════

export default function DatoEspejo({
  etiqueta,
  valor,
  enCrm,          // valor actual en la ficha dueña, si se conoce
  href,           // dónde se edita
  comoEditar,     // texto del enlace
  vacio = '—',
}) {
  const difiere = enCrm != null && String(enCrm).trim() !== String(valor || '').trim()
    && String(enCrm).trim() !== '';

  return (
    <div className="campo">
      <span className="label">{etiqueta}</span>
      <div className="input flex items-center bg-[#0A2634] text-[#B9D2DA]" aria-readonly="true">
        <span className="truncate">{valor || <span className="text-[#5E8494]">{vacio}</span>}</span>
      </div>
      <p className="campo-nota">
        {difiere ? (
          <span className="font-bold text-amber-200" title="El documento se emitió con este valor">
            En el CRM: {enCrm}
          </span>
        ) : href ? (
          <Link to={href} className="font-bold text-[#7FA7B4] hover:text-brand-orange hover:underline">
            {comoEditar || 'Editar en su ficha →'}
          </Link>
        ) : (comoEditar || 'Se edita en su ficha.')}
      </p>
    </div>
  );
}

/**
 * Aviso agrupado cuando varios datos difieren del CRM.
 * Uno por campo sería ruido; agrupados se leen de una vez y se entiende que hay
 * que decidir: o se actualiza el CRM, o se reemite el documento.
 */
export function AvisoDesfase({ campos = [], href }) {
  if (!campos.length) return null;
  return (
    <div className="rounded-xl border border-amber-300/40 bg-amber-400/[0.07] px-3 py-2.5">
      <p className="text-[12.5px] font-bold text-amber-200">
        {campos.length === 1 ? 'Un dato no coincide' : `${campos.length} datos no coinciden`} con la ficha del CRM
      </p>
      <ul className="mt-1 space-y-0.5">
        {campos.map((c) => (
          <li key={c.etiqueta} className="text-[11.5px] text-[#DFF1F5]">
            · <b>{c.etiqueta}</b>: aquí «{c.valor || '—'}», en el CRM «{c.enCrm}»
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] leading-snug text-[#9FC0CB]">
        El documento se emitió con los valores de la izquierda y no se cambian solos:
        alterarlos ahora haría que el PDF que tiene el cliente dejara de coincidir.
        Si el CRM es lo correcto, regenera el documento; si no, corrige la ficha.
        {href && <> <Link to={href} className="font-bold text-brand-orange hover:underline">Abrir la ficha →</Link></>}
      </p>
    </div>
  );
}
