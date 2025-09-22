// navigation/routes.js
export const ROUTES = {
  HOME: 'Home',

  // Tabs (nivel superior)
  INVENTARIO_LIST: 'InventarioList',
  INCIDENCIAS: 'Incidencias',
  OTS: 'OrdenesTrabajo',
  DOCUMENTOS: 'Documentos',
  EVENTOS: 'Eventos',
  RESPONSABLES: 'Responsables',
  EVALUACIONES: 'Evaluaciones',
  SCANNER: 'Scanner',
  TAREAS: 'Tareas',
  AJUSTES: 'Ajustes',

  // Stack-only (detalles / modales)
  INVENTARIO_DETAIL: 'InventarioDetail',

  // Incidencias
  INCIDENCIA_FORM: 'IncidenciaFormModal',
  INCIDENCIA_DETAIL: 'IncidenciaDetailModal',

  // Evaluaciones
  EVALUACION_FORM: 'EvaluacionFormModal',
  EVALUACION_DETAIL: 'EvaluacionDetailModal',

  // Responsables
  RESPONSABLE_FORM: 'ResponsableFormModal',
  RESPONSABLE_DETAIL: 'ResponsableDetailModal',

  // ➕ Tareas
  TAREA_FORM: 'TareaFormModal',
  TAREA_DETAIL: 'TareaDetailModal',
};

// Verificador para detectar claves undefined
export function assertRoutesDefined(keys = []) {
  if (__DEV__) {
    const bad = keys.filter(k => !(k in ROUTES) || !ROUTES[k]);
    if (bad.length) console.error('[ROUTES undefined]', bad, ROUTES);
  }
}
