import { apiGet, apiPost } from '../api/client';

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}` : '';
}

export const eventosRepository = {
  async list({ from, to, estado, search, page = 1, page_size = 50 } = {}) {
    const query = qs({ route: 'eventos/list', from, to, estado, search, page, page_size });
    const json = await apiGet(`${query}`);
    return { items: json.items || [], total: json.total ?? 0, page: json.page ?? page };
  },
  async create(payload) {
    const json = await apiPost(`?route=eventos/create`, payload);
    return json.data || { id: null };
  },
};
