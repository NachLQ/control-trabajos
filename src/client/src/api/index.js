const BASE = '/api';

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Error de servidor');
  }
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),

  // PDF download helpers
  pdfUrl: (path) => `${BASE}${path}`,

  dashboard: () => api.get('/dashboard'),

  clientes: {
    list: (q) => api.get(`/clientes${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    get: (id) => api.get(`/clientes/${id}`),
    create: (data) => api.post('/clientes', data),
    update: (id, data) => api.put(`/clientes/${id}`, data),
  },

  trabajos: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/trabajos${q ? `?${q}` : ''}`);
    },
    get: (id) => api.get(`/trabajos/${id}`),
    create: (data) => api.post('/trabajos', data),
    update: (id, data) => api.put(`/trabajos/${id}`, data),
  },

  presupuestos: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/presupuestos${q ? `?${q}` : ''}`);
    },
    get: (id) => api.get(`/presupuestos/${id}`),
    create: (data) => api.post('/presupuestos', data),
    update: (id, data) => api.put(`/presupuestos/${id}`, data),
    convertir: (id, opts) => api.post(`/presupuestos/${id}/convertir-a-factura`, opts || {}),
    pdfUrl: (id) => `/api/presupuestos/${id}/pdf`,
  },

  facturas: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/facturas${q ? `?${q}` : ''}`);
    },
    get: (id) => api.get(`/facturas/${id}`),
    create: (data) => api.post('/facturas', data),
    update: (id, data) => api.put(`/facturas/${id}`, data),
    marcarPagada: (id) => api.post(`/facturas/${id}/marcar-pagada`, {}),
    pdfUrl: (id) => `/api/facturas/${id}/pdf`,
  },

  cobros: {
    list: (filtro) => api.get(`/cobros${filtro ? `?filtro=${filtro}` : ''}`),
    update: (id, data) => api.put(`/cobros/${id}`, data),
    marcarPagado: (id, metodo) => api.post(`/cobros/${id}/marcar-pagado`, { metodo }),
    recordatorio: (id, tipo, canal) => api.post(`/cobros/${id}/recordatorio`, { tipo, canal }),
    historial: (id) => api.get(`/cobros/${id}/recordatorios`),
  },

  conceptos: {
    list: () => api.get('/conceptos-reutilizables'),
    create: (data) => api.post('/conceptos-reutilizables', data),
    update: (id, data) => api.put(`/conceptos-reutilizables/${id}`, data),
    del: (id) => api.del(`/conceptos-reutilizables/${id}`),
  },

  plantillas: {
    list: () => api.get('/plantillas-recordatorio'),
    get: (id) => api.get(`/plantillas-recordatorio/${id}`),
    update: (id, data) => api.put(`/plantillas-recordatorio/${id}`, data),
  },
};
