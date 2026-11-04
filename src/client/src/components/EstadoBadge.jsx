const ESTADOS = {
  // Trabajos
  pendiente:         { label: 'Pendiente',         cls: 'bg-gray-100 text-gray-700' },
  en_curso:          { label: 'En curso',           cls: 'bg-blue-100 text-blue-800' },
  esperando_material:{ label: 'Esperando material', cls: 'bg-amber-100 text-amber-800' },
  terminado:         { label: 'Terminado',          cls: 'bg-teal-100 text-teal-800' },
  facturado:         { label: 'Facturado',          cls: 'bg-purple-100 text-purple-800' },
  cobrado:           { label: 'Cobrado',            cls: 'bg-green-100 text-green-800' },
  cancelado:         { label: 'Cancelado',          cls: 'bg-red-100 text-red-700' },
  presupuestado:     { label: 'Presupuestado',      cls: 'bg-indigo-100 text-indigo-700' },
  // Presupuestos
  borrador:          { label: 'Borrador',           cls: 'bg-gray-100 text-gray-600' },
  enviado:           { label: 'Enviado',            cls: 'bg-blue-100 text-blue-700' },
  aceptado:          { label: 'Aceptado',           cls: 'bg-green-100 text-green-700' },
  rechazado:         { label: 'Rechazado',          cls: 'bg-red-100 text-red-700' },
  convertido:        { label: 'Convertido',         cls: 'bg-purple-100 text-purple-700' },
  // Facturas
  emitida:           { label: 'Emitida',            cls: 'bg-blue-100 text-blue-800' },
  enviada:           { label: 'Enviada',            cls: 'bg-indigo-100 text-indigo-800' },
  pagada:            { label: 'Pagada',             cls: 'bg-green-100 text-green-800' },
  vencida:           { label: 'Vencida',            cls: 'bg-red-100 text-red-800' },
  anulada:           { label: 'Anulada',            cls: 'bg-gray-200 text-gray-600' },
  // Cobros
  recordado:         { label: 'Recordado',          cls: 'bg-yellow-100 text-yellow-800' },
  incobrable:        { label: 'Incobrable',         cls: 'bg-red-200 text-red-900' },
};

const PRIORIDADES = {
  baja:    { label: 'Baja',    cls: 'bg-gray-100 text-gray-600' },
  normal:  { label: 'Normal',  cls: 'bg-blue-100 text-blue-700' },
  urgente: { label: '🚨 Urgente', cls: 'bg-red-100 text-red-700' },
};

export function EstadoBadge({ estado, size = 'sm' }) {
  const e = ESTADOS[estado] || { label: estado, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`badge ${e.cls} ${size === 'lg' ? 'text-sm px-3 py-1' : ''}`}>
      {e.label}
    </span>
  );
}

export function PrioridadBadge({ prioridad }) {
  const p = PRIORIDADES[prioridad] || PRIORIDADES.normal;
  return <span className={`badge ${p.cls}`}>{p.label}</span>;
}

export function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

export function formatFecha(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

export function esVencida(fechaStr) {
  if (!fechaStr) return false;
  return new Date(fechaStr) < new Date(new Date().toDateString());
}

export function diasHasta(fechaStr) {
  if (!fechaStr) return null;
  const diff = Math.ceil((new Date(fechaStr) - new Date(new Date().toDateString())) / 86400000);
  return diff;
}
