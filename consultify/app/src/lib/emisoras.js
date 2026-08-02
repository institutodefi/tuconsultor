// ════════════════════════════════════════════════════════════════════════════
// SOCIEDADES QUE PUEDEN EMITIR
//
// La marca es común —TuConsultor— pero la razón social y el CIF no. La oferta
// es el documento que se firma: si dice una sociedad y factura otra, el
// contrato no se sostiene.
//
// Esta lista es el respaldo. Lo que manda es la tabla `empresas_emisoras`; esto
// solo se usa mientras la migración no esté aplicada o en modo demostración,
// para que el selector no desaparezca sin explicación.
// ════════════════════════════════════════════════════════════════════════════

export const EMISORAS_BASE = [
  { id: 'trescore', marca: 'TuConsultor', razon_social: 'TRESCORE PROYECTOS ITE, S.L.',
    cif: 'B84867670', orden: 10, por_defecto: true, activa: true },
  { id: 'iee', marca: 'TuConsultor', razon_social: 'INSTITUTO EXCELENCIA EUROPEA, S.L.',
    cif: 'B87093076', orden: 20, por_defecto: false, activa: true },
  { id: 'defi', marca: 'TuConsultor', razon_social: 'INSTITUTO EUROPEO DE BLOCKCHAIN Y DEFI, S.L.',
    cif: 'B06996631', orden: 30, por_defecto: false, activa: true },
];
