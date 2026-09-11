// ════════════════════════════════════════════════════════════════════════════
// RGPD · el texto que se le pasa a un contacto para pedirle el consentimiento
//
// Una sola versión, con número: lo que se guarda en `consentimientos` es la
// versión que la persona aceptó, para poder demostrarlo después. Si cambia el
// texto, sube la versión.
// ════════════════════════════════════════════════════════════════════════════

export const RGPD_VERSION = 'v1-2026-09';

export const RGPD_RESPONSABLE = 'Instituto de Excelencia Europea, S.L. (TuConsultor) · CIF B87093076 · C/ Fuente Cisneros 66, 7º D, 28922 Alcorcón (Madrid) · hola@tuconsultor.com';

/** Párrafos de la información básica (art. 13 RGPD), en lenguaje llano. */
export const RGPD_TEXTO = [
  'Responsable del tratamiento: Instituto de Excelencia Europea, S.L. (TuConsultor), CIF B87093076, C/ Fuente Cisneros 66, 7º D, 28922 Alcorcón (Madrid), hola@tuconsultor.com.',
  'Finalidad: gestionar la relación comercial y profesional contigo y con tu organización (ofertas, contratos, proyectos de consultoría, comunicaciones de seguimiento) y, solo si lo marcas, enviarte información sobre nuestros servicios, novedades y formación.',
  'Legitimación: la ejecución de la relación precontractual o contractual y, para las comunicaciones comerciales, tu consentimiento, que puedes retirar en cualquier momento.',
  'Destinatarios: no se ceden datos a terceros, salvo obligación legal y los proveedores que nos prestan servicios de alojamiento y envío de correo, con contratos de encargo de tratamiento dentro de la Unión Europea.',
  'Conservación: mientras dure la relación y, después, los plazos que exige la ley. Las comunicaciones comerciales, hasta que retires el consentimiento.',
  'Derechos: acceso, rectificación, supresión, oposición, limitación y portabilidad, escribiendo a hola@tuconsultor.com. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
];

/** Lo que acepta al marcar cada casilla. */
export const RGPD_CASILLAS = {
  datos: 'He leído la información sobre protección de datos y acepto que TuConsultor trate mis datos para gestionar la relación comercial y profesional.',
  marketing: 'Quiero recibir información de TuConsultor sobre servicios, novedades y formación (opcional; puedo darme de baja cuando quiera).',
};

/** Canales por los que se puede recoger el consentimiento. */
export const CANALES_CONSENTIMIENTO = [
  ['enlace', 'Enlace por correo (la persona lo acepta en la web)'],
  ['formulario', 'Formulario firmado o correo de aceptación'],
  ['verbal', 'Verbal (reunión o teléfono), anotado por el equipo'],
  ['oferta', 'Al pedir una oferta en la web'],
];

export const enlaceConsentimiento = (token, origen = '') => `${origen || (typeof window !== 'undefined' ? window.location.origin : 'https://consultify.tuconsultor.com')}/app/consentimiento?t=${encodeURIComponent(token)}`;
