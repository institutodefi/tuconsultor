// ════════════════════════════════════════════════════════════════════════════
// VALIDACIÓN CONTRA VIES
//
// VIES es el registro de la Comisión Europea donde consta si un número de IVA
// intracomunitario está OPERATIVO. Es la diferencia entre «el número está bien
// formado» —que es todo lo que puede decir una comprobación local— y «existe y
// está dado de alta», que es lo que hace falta antes de facturar sin IVA.
//
// Es gratuito y no necesita clave. A cambio, se cae con cierta frecuencia: es
// un servicio de la Comisión, no una API comercial. Por eso un fallo de VIES
// NUNCA bloquea: se informa de que no se ha podido comprobar y se sigue.
// Tratar una caída del servicio como «CIF inválido» sería mucho peor.
// ════════════════════════════════════════════════════════════════════════════

const ES_PAIS = /^[A-Z]{2}$/;

/** Separa «ESB84867670» en país y número. Sin prefijo se asume España. */
function partir(identificador) {
  const v = String(identificador || '').toUpperCase().replace(/[\s\-.]/g, '');
  const m = /^([A-Z]{2})(.+)$/.exec(v);
  // «B84867670» empieza por letra pero NO es un prefijo de país: se distingue
  // porque lo que sigue no encaja con un número de IVA sin su letra inicial.
  if (m && ES_PAIS.test(m[1]) && m[2].length >= 2 && !/^\d{7}[0-9A-J]$/.test(v.slice(1))) {
    return { pais: m[1] === 'EL' ? 'EL' : m[1], numero: m[2] };
  }
  return { pais: 'ES', numero: v };
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { identificador } = await req.json();
    if (!identificador) return Response.json({ ok: false, error: 'Falta el identificador.' }, { status: 400 });

    const { pais, numero } = partir(identificador);

    // Reino Unido salió de la UE: VIES ya no lo cubre. Decirlo es más útil que
    // devolver «no válido», que haría pensar que el número está mal.
    if (pais === 'GB') {
      return Response.json({
        ok: true, comprobado: false, pais, numero,
        motivo: 'Reino Unido ya no está en VIES. Compruébalo en el registro británico.',
      });
    }

    const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${pais}/vat/${encodeURIComponent(numero)}`;

    // VIES es lento a ratos. Ocho segundos y se abandona: hacer esperar más a
    // quien está rellenando una ficha no compensa.
    const corte = AbortSignal.timeout(8000);
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: corte });

    if (!r.ok) {
      return Response.json({
        ok: true, comprobado: false, pais, numero,
        motivo: `VIES respondió ${r.status}. El servicio de la Comisión falla a ratos; inténtalo más tarde.`,
      });
    }

    const d = await r.json();

    // VIES devuelve `userError` cuando el país o el formato no le encajan.
    if (d.userError && d.userError !== 'VALID') {
      const explica = {
        INVALID_INPUT: 'El formato del número no es correcto para ese país.',
        MS_UNAVAILABLE: 'El registro de ese país no responde ahora mismo.',
        SERVICE_UNAVAILABLE: 'VIES no está disponible en este momento.',
        TIMEOUT: 'El registro de ese país ha tardado demasiado.',
        MS_MAX_CONCURRENT_REQ: 'Demasiadas consultas a ese país. Espera un momento.',
      }[d.userError];
      const esNuestro = d.userError === 'INVALID_INPUT';
      return Response.json({
        ok: true, comprobado: esNuestro, valido: esNuestro ? false : null,
        pais, numero, motivo: explica || d.userError,
      });
    }

    return Response.json({
      ok: true,
      comprobado: true,
      valido: !!d.isValid,
      pais, numero,
      // VIES devuelve razón social y dirección cuando el país las publica.
      // Alemania y España, por ejemplo, no las dan.
      nombre: (d.name && d.name !== '---') ? d.name : null,
      direccion: (d.address && d.address !== '---') ? d.address : null,
      consultado: d.requestDate || new Date().toISOString(),
      motivo: d.isValid
        ? 'Número operativo en VIES.'
        : 'VIES no reconoce ese número como operativo. Revísalo antes de facturar sin IVA.',
    });
  } catch (e) {
    const abortado = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    return Response.json({
      ok: true, comprobado: false,
      motivo: abortado
        ? 'VIES ha tardado demasiado. No se ha podido comprobar.'
        : `No se ha podido consultar VIES: ${e?.message || e}`,
    });
  }
};
