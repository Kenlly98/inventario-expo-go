// utils/permits.js

/**
 * Roles esperados (case-insensitive):
 *  - tecnico
 *  - mantenimiento
 *  - administracion
 *  - dueno
 *  - super admin | super_admin | super
 *
 * Nota: usamos jerarquía: tecnico < mantenimiento < administracion < dueno < super admin
 */

export const ROLE_ORDER = ['tecnico','mantenimiento','administracion','dueno','super admin'];

export function normalizeRole(role) {
  if (!role) return 'tecnico';
  const r = String(role).trim().toLowerCase()
    .replace(/[á]/g,'a')
    .replace(/[é]/g,'e')
    .replace(/[í]/g,'i')
    .replace(/[ó]/g,'o')
    .replace(/[ú]/g,'u')
    .replace(/_/g,' ')
    .replace(/\s+/g,' ');
  if (r === 'super' || r === 'superadmin') return 'super admin';
  return r;
}

export function isRoleAtLeast(userRole, minRole) {
  const ur = normalizeRole(userRole);
  const mr = normalizeRole(minRole);
  return ROLE_ORDER.indexOf(ur) >= ROLE_ORDER.indexOf(mr);
}

// ───────────────────────────────────────────────────────────
// Permisos por módulo (lista abierta; puedes extender)
// ───────────────────────────────────────────────────────────

const DOC_PERMS = {
  'doc.view'   : ['tecnico','mantenimiento','administracion','dueno','super admin'],
  'doc.create' : ['mantenimiento','administracion','dueno','super admin'],
  'doc.edit'   : ['administracion','dueno','super admin'],
  'doc.delete' : ['super admin'],
};

const EVAL_PERMS = {
  // Todos pueden ver
  'eval.view'   : ['tecnico','mantenimiento','administracion','dueno','super admin'],
  // Crear: mantenimiento | administracion | dueno | super admin
  // (Regla especial para técnico se maneja en can(): solo si target_type==='equipo')
  'eval.create' : ['mantenimiento','administracion','dueno','super admin','tecnico'],
  'eval.edit'   : ['administracion','dueno','super admin'],
  'eval.delete' : ['super admin'],
};

// Eventos (MVP)
// - view: todos
// - create: administracion | dueno | super admin
// - edit/delete quedan reservados para v1 (dejamos definidas por claridad)
const EVENT_PERMS = {
  'event.view'   : ['tecnico','mantenimiento','administracion','dueno','super admin'],
  'event.create' : ['administracion','dueno','super admin'],
  // v1
  'event.edit'   : ['administracion','dueno','super admin'],
  'event.delete' : ['super admin'],
};

// Incidencias (según especificación del PR)
// - view: todos
// - create: tecnico | mantenimiento | administracion | dueno | super admin
// - edit: mantenimiento | administracion | dueno | super admin
// - close: mantenimiento | administracion | dueno | super admin
// - delete: super admin
const INC_PERMS = {
  'inc.view'   : ['tecnico','mantenimiento','administracion','dueno','super admin'],
  'inc.create' : ['tecnico','mantenimiento','administracion','dueno','super admin'],
  'inc.edit'   : ['mantenimiento','administracion','dueno','super admin'],
  'inc.close'  : ['mantenimiento','administracion','dueno','super admin'],
  'inc.delete' : ['super admin'],
};

// Si tienes más módulos, agrégalos aquí (ots, etc.)
const EXTRA_PERMS = {
  // 'ot.view': [...],
};

// Mapa maestro
export const PERMISSIONS = {
  ...DOC_PERMS,
  ...EVAL_PERMS,
  ...EVENT_PERMS,
  ...INC_PERMS,
  ...EXTRA_PERMS,
  // TODO: fusiona aquí otras claves existentes si las tenías en otro archivo
};

// ───────────────────────────────────────────────────────────
// Motor de autorización
// ───────────────────────────────────────────────────────────

/**
 * can(user, action, ctx?)
 * - action: string (ej. 'doc.view', 'eval.create', 'event.create', 'inc.close')
 * - ctx: objeto opcional con datos de contexto, ej:
 *   { target_type: 'equipo', target_id: 'EQ-0001' }
 */
export function can(user, action, ctx = {}) {
  const roleRaw = user?.role || 'tecnico';
  const role = normalizeRole(roleRaw);

  // Super Admin siempre puede
  if (role === 'super admin') return true;

  // Si la acción no existe en el mapa maestro, permite enganchar lógica antigua:
  if (!PERMISSIONS[action]) {
    // TODO: si tenías previousCan(user, action) aquí puedes llamarlo
    return false;
  }

  // Regla base por lista
  const allowed = PERMISSIONS[action] || [];
  let ok = allowed.includes(role);

  // Reglas especiales por acción
  if (ok) {
    // 1) eval.create: el técnico solo puede si target_type === 'equipo'
    if (action === 'eval.create' && role === 'tecnico') {
      if (ctx?.target_type !== 'equipo') {
        ok = false;
      }
    }
    // (Espacio para más reglas específicas si las necesitas)
  }

  return ok;
}

/**
 * requireCan(user, action, ctx?)
 * Lanza un Error con code='UNAUTHORIZED' si no tiene permiso.
 */
export function requireCan(user, action, ctx = {}) {
  if (!can(user, action, ctx)) {
    const err = new Error('UNAUTHORIZED');
    err.code = 'UNAUTHORIZED';
    err.action = action;
    err.role = normalizeRole(user?.role);
    throw err;
  }
}

/**
 * listUserPerms(user): devuelve las acciones para las que el usuario tiene permiso.
 */
export function listUserPerms(user) {
  const result = [];
  for (const k of Object.keys(PERMISSIONS)) {
    if (can(user, k)) result.push(k);
  }
  return result.sort();
}

// ───────────────────────────────────────────────────────────
// Helpers opcionales de sugar
// ───────────────────────────────────────────────────────────

/**
 * atLeast(user, minRole): boolean — útil para gates por jerarquía
 */
export function atLeast(user, minRole) {
  return isRoleAtLeast(user?.role, minRole);
}

/**
 * gate(action, ctx?): Higher-order para envolver handlers UI/APIs
 * Uso:
 *   const safeHandler = gate('eval.create', { target_type:'equipo' })(user, () => doCreate());
 */
export function gate(action, ctx = {}) {
  return (user, fn) => {
    requireCan(user, action, ctx);
    return fn();
  };
}

// ───────────────────────────────────────────────────────────
// Ejemplos de uso (borra si no quieres ejemplos en prod):
// ───────────────────────────────────────────────────────────
/*
const user1 = { role: 'tecnico' };
console.log(can(user1, 'doc.view')); // true
console.log(can(user1, 'doc.edit')); // false
console.log(can(user1, 'eval.create', { target_type:'equipo' })); // true
console.log(can(user1, 'eval.create', { target_type:'evento' })); // false
console.log(can(user1, 'inc.create')); // true
console.log(can(user1, 'inc.close'));  // false

const user2 = { role: 'mantenimiento' };
console.log(can(user2, 'inc.edit'));   // true
console.log(can(user2, 'inc.close'));  // true

const admin = { role: 'super admin' };
console.log(can(admin, 'inc.delete')); // true
*/
