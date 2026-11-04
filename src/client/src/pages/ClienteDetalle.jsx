import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { EstadoBadge, PrioridadBadge, formatEuro, formatFecha } from '../components/EstadoBadge';

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('trabajos');

  const load = () => api.clientes.get(id).then(c => { setCliente(c); setForm(c); });
  useEffect(() => { load(); }, [id]);

  const save = async () => {
    setSaving(true);
    try { await api.clientes.update(id, form); await load(); setEditando(false); }
    finally { setSaving(false); }
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  if (!cliente) return <div className="p-4 text-center text-gray-400">Cargando...</div>;

  const cobrosActivos = (cliente.cobros || []).filter(c => c.estado !== 'pagado');
  const totalPendiente = cobrosActivos.reduce((s, c) => s + c.importe, 0);

  return (
    <div className="p-3 space-y-3 pb-6">
      {/* Cabecera cliente */}
      <div className="card">
        {editando ? (
          <div className="space-y-3">
            <div><label className="label">Nombre *</label><input className="input" value={form.nombre || ''} onChange={f('nombre')} /></div>
            <div><label className="label">Teléfono</label><input className="input" type="tel" value={form.telefono || ''} onChange={f('telefono')} /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email || ''} onChange={f('email')} /></div>
            <div><label className="label">Dirección</label><input className="input" value={form.direccion || ''} onChange={f('direccion')} /></div>
            <div><label className="label">NIF/CIF</label><input className="input" value={form.nif || ''} onChange={f('nif')} /></div>
            <div><label className="label">Notas</label><textarea className="input" rows={2} value={form.notas || ''} onChange={f('notas')} /></div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditando(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? '...' : 'Guardar'}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold">
                  {cliente.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-lg font-bold">{cliente.nombre}</h1>
                  {cliente.nif && <div className="text-xs text-gray-400">NIF: {cliente.nif}</div>}
                </div>
              </div>
              <button onClick={() => setEditando(true)} className="text-blue-600 text-sm font-medium">Editar</button>
            </div>
            {cliente.direccion && <div className="text-sm text-gray-600 mt-2">📍 {cliente.direccion}</div>}
            {cliente.email && <div className="text-sm text-gray-500">✉️ {cliente.email}</div>}
            {cliente.notas && <div className="text-sm text-gray-500 mt-1 italic">"{cliente.notas}"</div>}

            {/* Total pendiente */}
            {totalPendiente > 0 && (
              <div className="mt-3 bg-amber-50 rounded-xl p-3 border border-amber-200">
                <div className="text-xs text-amber-700 font-medium">Pendiente de cobro</div>
                <div className="text-xl font-bold text-amber-800">{formatEuro(totalPendiente)}</div>
              </div>
            )}

            {/* Acciones rápidas */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {cliente.telefono && (
                <a href={`tel:${cliente.telefono}`} className="btn-secondary text-center text-xs py-2.5">
                  📞 Llamar
                </a>
              )}
              {cliente.telefono && (
                <button onClick={() => { navigator.clipboard.writeText(cliente.telefono); alert('Teléfono copiado'); }}
                  className="btn-secondary text-xs py-2.5">
                  📋 Copiar tel.
                </button>
              )}
              <button onClick={() => navigate(`/trabajos?nuevo=1&cliente_id=${cliente.id}`)}
                className="btn-primary text-xs py-2.5">
                + Trabajo
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={() => navigate(`/presupuestos/nuevo?cliente_id=${cliente.id}`)}
                className="btn-secondary text-xs py-2.5">
                📋 Presupuesto
              </button>
              <button onClick={() => navigate(`/facturas/nueva?cliente_id=${cliente.id}`)}
                className="btn-secondary text-xs py-2.5">
                🧾 Factura
              </button>
            </div>
          </>
        )}
      </div>

      {/* Tabs historial */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'trabajos', label: `🔧 Trabajos (${(cliente.trabajos||[]).length})` },
          { key: 'facturas', label: `🧾 Facturas (${(cliente.facturas||[]).length})` },
          { key: 'cobros', label: `💶 Cobros (${cobrosActivos.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === t.key ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Trabajos */}
      {tab === 'trabajos' && (
        <div className="space-y-2">
          {(cliente.trabajos || []).length === 0 ? (
            <div className="text-center text-gray-400 py-6">Sin trabajos</div>
          ) : (cliente.trabajos || []).map(t => (
            <div key={t.id} onClick={() => navigate(`/trabajos/${t.id}`)}
              className="card cursor-pointer active:scale-95 transition-transform">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{t.titulo}</div>
                  <div className="text-xs text-gray-400">{formatFecha(t.fecha_creacion)}</div>
                  {t.prioridad === 'urgente' && <PrioridadBadge prioridad={t.prioridad} />}
                </div>
                <EstadoBadge estado={t.estado} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Facturas */}
      {tab === 'facturas' && (
        <div className="space-y-2">
          {(cliente.facturas || []).length === 0 ? (
            <div className="text-center text-gray-400 py-6">Sin facturas</div>
          ) : (cliente.facturas || []).map(f => (
            <div key={f.id} onClick={() => navigate(`/facturas/${f.id}`)}
              className="card cursor-pointer active:scale-95 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{f.numero}</div>
                  <div className="text-xs text-gray-400">{formatFecha(f.fecha)} · vence {formatFecha(f.vencimiento)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{formatEuro(f.total)}</div>
                  <EstadoBadge estado={f.estado} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cobros */}
      {tab === 'cobros' && (
        <div className="space-y-2">
          {(cliente.cobros || []).length === 0 ? (
            <div className="text-center text-gray-400 py-6">Sin cobros pendientes</div>
          ) : (cliente.cobros || []).map(c => (
            <div key={c.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{c.factura_numero}</div>
                  <div className="text-xs text-gray-400">Vence: {formatFecha(c.fecha_vencimiento)}</div>
                  <div className="text-xs text-gray-400">{c.metodo}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatEuro(c.importe)}</div>
                  <EstadoBadge estado={c.estado} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
