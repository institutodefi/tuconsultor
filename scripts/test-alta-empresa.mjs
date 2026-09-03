// Réplica del ciclo de efectos de FichaEmpresa, para comprobar que el alta
// abre el formulario UNA vez y no se rehace mientras se escribe.
const ok = c => c ? '✓' : '✗ FALLO';

function simular({ empresaEstable, rendersDelPadre, escrituras }) {
  let form = null, aperturas = 0, empresaAnterior;
  const recienGuardada = { current: false };

  // Efecto viejo: dependía del objeto `empresa` completo
  const efectoViejo = (empresa) => {
    if (empresa !== empresaAnterior || form !== formAnterior) {
      if (empresa && !empresa.id && form === null && !recienGuardada.current) {
        form = { nuevo: true }; aperturas += 1;
      }
    }
  };
  // Efecto nuevo: depende solo de empresa?.id
  let idAnterior = Symbol('inicial');
  const efectoNuevo = (empresa) => {
    if (empresa?.id !== idAnterior) {
      idAnterior = empresa?.id;
      form = !empresa?.id ? { nuevo: true } : null;
      aperturas += 1;
    }
  };

  let formAnterior = null;
  const efecto = arguments.length ? null : null;
  return { aperturas };
}

// Versión directa y legible del contraste
function ciclo({ referenciaEstable, usarEfectoUnico, rendersPadre, escrituras }) {
  let form = null, aperturas = 0;
  let idAnterior = Symbol('sin montar');
  let empresaAnterior = Symbol('sin montar');
  let formAnterior = Symbol('sin montar');

  const render = (empresa) => {
    if (usarEfectoUnico) {
      if (empresa?.id !== idAnterior) {
        idAnterior = empresa?.id;
        form = !empresa?.id ? { nuevo: true, texto: '' } : null;
        aperturas += 1;
      }
    } else {
      if (empresa !== empresaAnterior || form !== formAnterior) {
        empresaAnterior = empresa; formAnterior = form;
        if (empresa && !empresa.id && form === null) { form = { nuevo: true, texto: '' }; aperturas += 1; }
      }
    }
  };

  const ESTABLE = {};
  for (let i = 0; i < rendersPadre; i++) render(referenciaEstable ? ESTABLE : {});
  // El usuario escribe: cada tecla es un render del hijo con la MISMA empresa
  for (let i = 0; i < escrituras; i++) {
    form = { ...form, texto: form.texto + 'a' };
    render(referenciaEstable ? ESTABLE : {});
  }
  return { aperturas, texto: form?.texto };
}

console.log('── ANTES: `{}` inline + dos efectos ──');
const antes = ciclo({ referenciaEstable: false, usarEfectoUnico: false, rendersPadre: 4, escrituras: 5 });
console.log('  aperturas del formulario:', antes.aperturas, '· texto escrito:', JSON.stringify(antes.texto));

console.log('\n── AHORA: referencia estable + un solo efecto ──');
const ahora = ciclo({ referenciaEstable: true, usarEfectoUnico: true, rendersPadre: 4, escrituras: 5 });
console.log('  aperturas del formulario:', ahora.aperturas, ok(ahora.aperturas === 1));
console.log('  texto escrito conservado:', JSON.stringify(ahora.texto), ok(ahora.texto === 'aaaaa'));

console.log('\n── Al abrir una empresa existente, el formulario NO se abre ──');
{
  let form = 'x', aperturas = 0, idAnterior = Symbol('i');
  const render = (empresa) => {
    if (empresa?.id !== idAnterior) { idAnterior = empresa?.id; form = !empresa?.id ? {} : null; aperturas += 1; }
  };
  const EMP = { id: 'a4ace829', nombre: 'Prueba' };
  render(EMP); render(EMP); render(EMP);
  console.log('  form en modo lectura:', form, ok(form === null));
  console.log('  efecto ejecutado una vez:', aperturas, ok(aperturas === 1));
}
