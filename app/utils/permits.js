// app/utils/permits.js
export const ACTIONS = {
  BACKUP_NOW: 'backup.now',
  CATALOGS_EDIT: 'catalogs.edit',
  APIKEY_ROTATE: 'apikey.rotate',
  ENV_VIEW: 'env.view',
  DANGER_PURGE_ALL: 'danger.purge_all',
};

const MAP = {
  [ACTIONS.BACKUP_NOW]: ['administracion', 'dueno', 'super admin'],
  [ACTIONS.CATALOGS_EDIT]: ['administracion', 'dueno', 'super admin'],
  [ACTIONS.APIKEY_ROTATE]: ['super admin'],
  [ACTIONS.ENV_VIEW]: ['super admin'],
  [ACTIONS.DANGER_PURGE_ALL]: ['super admin'],
};

export function can(user, action) {
  const role = (user?.role || '').toLowerCase();
  const allowed = MAP[action] || [];
  return role && allowed.includes(role);
}
