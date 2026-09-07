// ════════════════════════════════════════════════════════════════════════════
// SUBTAREAS BASE DE CADA SUBPROCESO
//
// Origen: «Estructura proyecto / tareas» (Excel 20240405_TUCONS_ESTRUCTURA_PROY_TAREAS).
// Una lista de subtareas por código de subproceso (S1 PE1, S2 PA4…), común a
// las normas. Las que solo tienen sentido en unas normas llevan `normas`: la
// evaluación de aspectos ambientales va a la 14001, la SOA a la 27001/27701,
// la política de PRL a la 45001… Sin `normas`, vale para todas.
//
// Es la semilla del catálogo (migración v122) y el respaldo cuando una fila
// del catálogo no tiene subtareas propias. Lo que se edite en Sistemas de
// gestión manda sobre esto.
// ════════════════════════════════════════════════════════════════════════════

export const SUBTAREAS_BASE = {
 "S1 PE1": [
  {
   "texto": "Contexto interno y externo"
  },
  {
   "texto": "Ecosistema"
  },
  {
   "texto": "Necesidades y expectativas de partes interesadas"
  },
  {
   "texto": "Revisión mapa de procesos"
  },
  {
   "texto": "SOA / declaración de aplicabilidad",
   "normas": [
    "27001",
    "27701"
   ]
  }
 ],
 "S2 PE1": [
  {
   "texto": "Evaluación riesgos estratégicos"
  },
  {
   "texto": "Evaluación de riesgos operativos"
  },
  {
   "texto": "Evaluación de aspectos ambientales",
   "normas": [
    "14001"
   ]
  },
  {
   "texto": "Evaluación de riesgos seguridad información",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Plan de acción de riesgos"
  },
  {
   "texto": "Plan de tratamiento de riesgos seguridad información",
   "normas": [
    "27001",
    "27701"
   ]
  }
 ],
 "S3 PE1": [
  {
   "texto": "Política de gestión integrada"
  },
  {
   "texto": "Política de calidad",
   "normas": [
    "9001",
    "21001",
    "9004",
    "une93200",
    "une158101",
    "une66181"
   ]
  },
  {
   "texto": "Política de PRL",
   "normas": [
    "45001"
   ]
  },
  {
   "texto": "Política compliance"
  },
  {
   "texto": "Código ético"
  },
  {
   "texto": "Políticas específicas contraseñas",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas cookies",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas gestión activos",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas equipos, dispositivos móviles y extraibles",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas privacidad",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas software de explotación",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas entorno desarrollo seguro",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas monitorización",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas arquitectura segura",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas cifrado de información",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas mantenimiento de sistemas",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas servicios en la nube",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas accesos permisos",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas gestión de recursos",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas personas de seguridad de la información",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas redes sociales",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas relación de terceros",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas seguridad física",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas seguridad lógica",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas wifi",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Políticas específicas control de impresoras",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Objetivos de calidad",
   "normas": [
    "9001",
    "21001",
    "9004",
    "une93200",
    "une158101",
    "une66181"
   ]
  },
  {
   "texto": "Objetivos medioambiente",
   "normas": [
    "14001"
   ]
  },
  {
   "texto": "Objetivos de seguridad de la información",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Objetivos de seguridad y salud",
   "normas": [
    "45001"
   ]
  },
  {
   "texto": "Política de igualdad",
   "normas": [
    "igualdad",
    "igualdad-seg",
    "diversidad",
    "diversidad-seg",
    "9001",
    "45001"
   ]
  }
 ],
 "S1 PE2": [
  {
   "texto": "Actualización de cuadro de mando operaciones",
   "normas": [
    "9001",
    "21001",
    "9004",
    "une93200",
    "une158101",
    "une66181"
   ]
  },
  {
   "texto": "Actualización de cuadro de mando de seguridad de la información",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Actualización de cuadro de mando de consumos e impactos",
   "normas": [
    "14001"
   ]
  },
  {
   "texto": "Actualización cuadro de mando seguridad y salud",
   "normas": [
    "45001"
   ]
  }
 ],
 "S2 PE2": [
  {
   "texto": "Planificación, realización e informe de auditoria interna"
  }
 ],
 "S3 PE2": [
  {
   "texto": "Elaboración de acta de revisión por la dirección"
  }
 ],
 "S1 PE3": [
  {
   "texto": "Registro y cierre de no conformidades"
  },
  {
   "texto": "Gestión de incidentes de seguridad",
   "normas": [
    "27001",
    "27701"
   ]
  }
 ],
 "S2 PE3": [
  {
   "texto": "Proyectos de mejora"
  },
  {
   "texto": "Gestión de quejas y reclamaciones",
   "normas": [
    "9001",
    "21001",
    "9004",
    "une93200",
    "une158101",
    "une66181"
   ]
  }
 ],
 "S1 PA1": [
  {
   "texto": "Definición de perfiles"
  },
  {
   "texto": "Organigrama"
  },
  {
   "texto": "Roles y responsabilidades"
  }
 ],
 "S2 PA1": [
  {
   "texto": "Plan de formación"
  },
  {
   "texto": "Plan de sensibilización"
  }
 ],
 "S3 PA1": [
  {
   "texto": "Vinculación y desvinculación"
  },
  {
   "texto": "Evaluación de riesgos",
   "normas": [
    "45001"
   ]
  },
  {
   "texto": "Planificación accion preventiva",
   "normas": [
    "45001"
   ]
  },
  {
   "texto": "Memoria de actividades de prevención",
   "normas": [
    "45001"
   ]
  },
  {
   "texto": "Ofrecimiento reconocimiento médico",
   "normas": [
    "45001"
   ]
  },
  {
   "texto": "Recibí epis",
   "normas": [
    "45001"
   ]
  },
  {
   "texto": "Recibí activos",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Comunicación y aceptación de políticas",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Acuerdo de confidencialidad",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Clima laboral",
   "normas": [
    "igualdad",
    "igualdad-seg",
    "diversidad",
    "diversidad-seg",
    "9001",
    "45001"
   ]
  }
 ],
 "S2 PA2": [
  {
   "texto": "Papel",
   "normas": [
    "14001"
   ]
  },
  {
   "texto": "RAES",
   "normas": [
    "14001"
   ]
  },
  {
   "texto": "Toner",
   "normas": [
    "14001"
   ]
  },
  {
   "texto": "Vertidos",
   "normas": [
    "14001"
   ]
  }
 ],
 "S1 PA3": [
  {
   "texto": "Listado de información documentada"
  },
  {
   "texto": "Procedimiento de información documentada"
  }
 ],
 "S2 PA3": [
  {
   "texto": "Identificación y evaluacion de requisitos legales"
  }
 ],
 "S1 PA4": [
  {
   "texto": "Revisión rite"
  },
  {
   "texto": "Revisión aire acondicionado"
  },
  {
   "texto": "Revisión extintores anual"
  },
  {
   "texto": "Revisión extintores trimestral"
  },
  {
   "texto": "Revisión alarma"
  },
  {
   "texto": "Revisión equipo electrógenos"
  },
  {
   "texto": "Revisión eléctrica"
  },
  {
   "texto": "Revisión de ascensores"
  },
  {
   "texto": "Legionela"
  }
 ],
 "S2 PA4": [
  {
   "texto": "Certificado baja/ media/ alta tensión"
  },
  {
   "texto": "Licencia de actividad"
  },
  {
   "texto": "Licencia de apertura"
  },
  {
   "texto": "Comunicación de apertura"
  },
  {
   "texto": "IAE"
  },
  {
   "texto": "Censo"
  },
  {
   "texto": "Contrato de alquiler/ propiedad"
  }
 ],
 "S3 PA4": [
  {
   "texto": "Inventario de activos",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Etiquetado",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Mantenimiento de equipos informáticos",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Gestión de SW",
   "normas": [
    "27001",
    "27701"
   ]
  }
 ],
 "S4 PA4": [
  {
   "texto": "Control de acceso",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Plan de emergencias",
   "normas": [
    "45001"
   ]
  },
  {
   "texto": "Simulacro de emergencias",
   "normas": [
    "45001"
   ]
  },
  {
   "texto": "Planos"
  },
  {
   "texto": "Seguros"
  },
  {
   "texto": "Cableado",
   "normas": [
    "27001",
    "27701"
   ]
  }
 ],
 "S1 PA5": [
  {
   "texto": "Procedimiento de la seguridad operacional",
   "normas": [
    "27001",
    "27701"
   ]
  }
 ],
 "S2 PA5": [
  {
   "texto": "Mapa de red",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Control de accesos lógico",
   "normas": [
    "27001",
    "27701"
   ]
  }
 ],
 "S3 PA5": [
  {
   "texto": "Plan de continuidad",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Procedimiento de continuidad",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Planificación de simulacro continuidad de negocio",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Simulacro de continuidad",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Informe simulacro de continuidad",
   "normas": [
    "27001",
    "27701"
   ]
  }
 ],
 "S4 PA5": [
  {
   "texto": "Procedimiento tratamiento de datos",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Procedimiento brechas de seguridad de datos",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Registro de actividades",
   "normas": [
    "27001",
    "27701"
   ]
  },
  {
   "texto": "Procedimiento ejercicio de derechos",
   "normas": [
    "27001",
    "27701"
   ]
  }
 ],
 "S1 PA6": [
  {
   "texto": "Procedimiento homologación"
  },
  {
   "texto": "Registro homologación"
  }
 ],
 "S2 PA6": [
  {
   "texto": "Procedimiento evaluación de proveedores"
  },
  {
   "texto": "Registro evaluación de proveedores"
  },
  {
   "texto": "Comunicación proveedores"
  }
 ],
 "S1 PA7": [
  {
   "texto": "Presupuesto"
  }
 ],
 "S1PA7": [
  {
   "texto": "Procedimiento gestión económica"
  }
 ],
 "S2PA7": [
  {
   "texto": "Procedimiento gestión administrativa"
  }
 ]
};

const S = (v) => String(v ?? '');
/** Código de subproceso («S1 PE1») a partir de su nombre. */
export const codigoSubproceso = (subproceso) => {
  const m = S(subproceso).toUpperCase().match(/^(S\d\s?P[EA]\d+)/);
  return m ? m[1] : null;
};

/** Subtareas base para un subproceso y una norma: [{texto}]. */
export function subtareasBasePara(subproceso, normaId) {
  const cod = codigoSubproceso(subproceso);
  const lista = cod ? SUBTAREAS_BASE[cod] : null;
  if (!lista) return [];
  const n = S(normaId);
  return lista.filter((x) => !x.normas || !n || x.normas.includes(n)).map((x) => ({ texto: x.texto }));
}
