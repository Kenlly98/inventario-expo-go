// data/repositories/dashboardRepository.js
import client from '../api/client';

function mapError(err) {
  const code = err?.error || err?.code || 'INTERNAL_ERROR';
  const map = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    SHEETS_ERROR: 'SHEETS_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
  };
  const m = map[code] || 'INTERNAL_ERROR';
  const e = new Error(m);
  e.code = m;
  return e;
}

export const dashboardRepository = {
  async owners(period) {
    try {
      const res = await client.get('dashboard/owners', { period });
      if (!res?.ok) throw mapError(res);
      return res.data; // exactamente el contrato .data
    } catch (e) {
      if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
        const ne = new Error('NETWORK_ERROR'); ne.code = 'NETWORK_ERROR'; throw ne;
      }
      throw mapError(e);
    }
  },
};
