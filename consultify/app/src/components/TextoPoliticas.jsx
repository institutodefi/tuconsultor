// ════════════════════════════════════════════════════════════════════════════
// POLÍTICAS DE ÓRBITA · el texto, en un solo sitio
// Lo lee el equipo al entrar por primera vez (GatePoliticas) y queda para
// consulta en Organización → Políticas y avisos. Si cambia, cambia aquí.
// ════════════════════════════════════════════════════════════════════════════

export const POLITICAS_VERSION = 'v2 · septiembre de 2026';

export const POLITICAS = [
  ['1. Confidencialidad', 'Toda la información de clientes, proyectos, ofertas, precios y datos personales a la que accedas es estrictamente confidencial. No la compartirás, copiarás ni divulgarás fuera de la organización, ni durante ni después de tu relación con la empresa.'],
  ['2. Protección de datos (RGPD/LOPDGDD)', 'Tratarás los datos personales de clientes y contactos conforme al Reglamento (UE) 2016/679 y la LOPDGDD, únicamente para las finalidades del proyecto y bajo las instrucciones de la organización, aplicando las medidas de seguridad establecidas.'],
  ['3. Seguridad de la información', 'Custodiarás tus credenciales de acceso, no las compartirás con terceros, usarás contraseñas robustas y notificarás de inmediato cualquier incidente de seguridad o acceso no autorizado que detectes. Los accesos y las acciones relevantes quedan registrados (ENS / ISO 27001).'],
  ['4. Uso adecuado', 'Utilizarás la plataforma y la información exclusivamente para el desempeño de tus funciones profesionales, sin extraer datos para fines personales ni ajenos a la organización.'],
  ['5. Herramientas con inteligencia artificial', 'Órbita usa IA para clasificar y resumir documentos, responder preguntas del cliente sobre su documentación, ayudar a redactar y planificar, y localizar información profesional pública de una persona (buscador de contactos). La IA propone; decides tú. Revisa siempre lo que devuelve antes de guardarlo o enviarlo, no le pases datos que no sean necesarios para la tarea y nunca datos de categorías especiales (salud, ideología, etc.). Los datos se envían al proveedor del modelo solo para esa operación y no se usan para entrenar modelos.'],
  ['6. Contactos obtenidos de fuentes públicas', 'Cuando des de alta a una persona con el buscador de LinkedIn/web, solo se recogen datos profesionales (nombre, cargo, empresa, perfil público, correo profesional publicado). Nunca teléfonos personales, direcciones ni nada de la vida privada. La ficha guarda la fuente y hay que informar a la persona de que tenemos sus datos y de dónde salen en el primer contacto o antes de un mes (art. 14 RGPD); márcalo en la ficha cuando lo hagas. Nada de extracciones masivas ni de acceder a redes sociales con tu cuenta para sacar datos.'],
  ['7. Comunicaciones: correo, WhatsApp y consentimiento', 'A Brevo (correo comercial) solo van los contactos con consentimiento de comunicaciones, y con doble opt-in. El botón de WhatsApp de la ficha es para gestiones puntuales del servicio con quien nos ha dado su móvil profesional: no se manda publicidad por WhatsApp. El consentimiento RGPD se pide por su enlace personal o se registra con canal, fecha y nota; nunca se marca «aceptado» sin prueba.'],
  ['8. Publicación en redes sociales', 'El calendario de redes (LinkedIn de empresa y perfil del administrador, Instagram) se publica de forma automática desde la web. En esas publicaciones no aparecen datos personales de clientes ni de contactos, ni información de proyectos, salvo autorización expresa y por escrito del cliente.'],
  ['9. Datos de clientes en el portal', 'Los clientes ven y editan sus propios datos de empresa y de persona desde su portal; son los mismos del CRM. Lo que un cliente escribe o sube es suyo: no se comparte con otros clientes ni se usa fuera de su proyecto.'],
  ['10. Ofertas y contratos', 'Las ofertas se aceptan desde el portal del cliente o desde el enlace personal del correo; la aceptación queda registrada con fecha, IP y navegador. No se marca una oferta como aceptada en nombre del cliente sin esa prueba o sin su confirmación escrita.'],
];

export default function TextoPoliticas({ compacto = false }) {
  return (
    <div className={`space-y-4 text-[13px] leading-relaxed text-[#B9D2DA] ${compacto ? '' : 'max-w-3xl'}`}>
      {POLITICAS.map(([t, p]) => (
        <div key={t}>
          <h2 className="font-extrabold text-[#EAF4F7]">{t}</h2>
          <p>{p}</p>
        </div>
      ))}
      <p className="text-xs text-[#9FC0CB]">Versión {POLITICAS_VERSION}. La política de privacidad completa de TuConsultor está en <a href="https://www.tuconsultor.com/legal/privacidad.html" target="_blank" rel="noopener noreferrer" className="text-brand-orange underline">tuconsultor.com/legal/privacidad.html</a> (apartado 12: herramientas, automatizaciones e inteligencia artificial).</p>
    </div>
  );
}
