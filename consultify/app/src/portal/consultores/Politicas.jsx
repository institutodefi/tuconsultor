import TextoPoliticas, { POLITICAS_VERSION } from '../../components/TextoPoliticas.jsx';

// Organización → Políticas y avisos: lo que se aceptó al entrar, para consulta.
export default function Politicas() {
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Organización</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Políticas y avisos</h1>
        <p className="mt-1 text-sm font-medium text-[#9FC0CB]">Lo que aceptaste al entrar en Órbita ({POLITICAS_VERSION}): confidencialidad, protección de datos, IA, contactos de fuentes públicas, WhatsApp, redes sociales, ofertas.</p>
      </div>
      <div className="card"><TextoPoliticas /></div>
    </div>
  );
}
