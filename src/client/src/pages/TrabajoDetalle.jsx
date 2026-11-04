import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { EstadoBadge, PrioridadBadge, formatFecha } from '../components/EstadoBadge';

const ESTADOS_TRABAJO = ['pendiente','en_curso','esperando_material','terminado','facturado','cobrado','cancelado'];

export default function TrabajoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trabajo, setTrabajo] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => api.trabajos.get(id).then(t => { setTrabajo(t); setForm(t); });
  useEffect(() => { load(); }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      await api.trabajos.update(id, {
        titulo: form.titulo, descripcion: form.descripcion, estado: form.estado,
        prioridad: form.prioridad, fecha_prevista: form.fecha_prevista,
        materiales: form.materiales, notas: form.notas
      });
      await load();
      setEditando(false);
    } finally { setSaving(false); }
  };

  const cambiarEstado = async (nuevoEstado) => {
    await api.trabajos.update(id, { estado: nuevoEstado });
    await load();
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (!trabajo) return <div className="p-4 text-center text-gray-400">Cargando...</div>;

  return (
    <div className="p-3 space-y-3 pb-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            {editando ? (
              <input className="input text-base font-bold mb-1" value={form.titulo || ''} onChange={f('titulo')} />
            ) : (
              <h1 className="text-lg font-bold leading-tight">{trabajo.titulo}</h1>
            )}
            <div
              className="text-sm text-blue-600 cursor-pointer"
              onClick={() => navigate(`/clientes/${trabajo.cliente_id}`)}
            >
              👤 {trabajo.cliente_nombre}
            </div>
          </div>
          <button onClick={() => setEditando(!editando)} className="text-blue-600 text-sm font-medium ml-2">
            {editando ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-3">
          <EstadoBadge estado={trabajo.estado} size="lg" />
          <PrioridadBadge prioridad={trabajo.prioridad} />
        </div>

        {editando ? (
          <div className="space-y-3">
            <div><label className="label">Descripción</label><textarea className="input" rows={3} value={form.descripcion || ''} onChange={f('descripcion')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Estado</label>
                <select className="input" value={form.estado || ''} onChange={f('estado')}>
                  {ESTADOS_TRABAJO.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Prioridad</label>
                <select className="input" value={form.prioridad || ''} onChange={f('prioridad')}>
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="urgente">🚨 Urgente</option>
                </select>
              </div>
            </div>
            <div><label className="label">Fecha prevista</label><input className="input" type="date" value={form.fecha_prevista || ''} onChange={f('fecha_prevista')} /></div>
            <div><label className="label">Materiales</label><input className="input" value={form.materiales || ''} onChange={f('materiales')} /></div>
            <div><label className="label">Notas internas</label><textarea className="input" rows={2} value={form.notas || ''} onChange={f('notas')} /></div>
            <button onClick={save} disabled={saving} className="btn-primary w-full">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        ) : (
          <>
            {trabajo.descripcion && <p className="text-sm text-gray-600 mb-2">{trabajo.descripcion}</p>}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 rounded-xl p-2">
                <div className="text-xs text-gray-400">Creado</div>
                <div className="font-medium">{formatFecha(trabajo.fecha_creacion)}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-2">
                <div className="text-xs text-gray-400">Previsto</div>
                <div className="font-medium">{formatFecha(trabajo.fecha_prevista) || '—'}</div>
              </div>
            </div>
            {trabajo.materiales && (
              <div className="mt-2 text-sm">
                <span className="text-gray-500 font-medium">Materiales: </span>
                <span className="text-gray-700">{trabajo.materiales}</span>
              </div>
            )}
            {trabajo.notas && (
              <div className="mt-2 bg-yellow-50 rounded-xl p-2 text-sm text-yellow-800 border border-yellow-200">
                📝 {trabajo.notas}
              </div>
            )}
          </>
        )}
      </div>

      {/* Cambio rápido de estado */}
      {!editando && (
        <div className="card">
          <div className="text-xs font-semibold text-gray-500 mb-2">Cambiar estado rápido</div>
          <div className="grid grid-cols-2 gap-2">
            {ESTADOS_TRABAJO.filter(e => e !== trabajo.estado).slice(0, 4).map(e => (
              <button key={e} onClick={() => cambiarEstado(e)}
                className="py-2.5 px-3 rounded-xl border border-gray-200 text-sm active:scale-95 transition-transform text-gray-700">
                {e.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fotos simuladas */}
      {(trabajo.fotos || []).length > 0 && (
        <div className="card">
          <div className="text-xs font-semibold text-gray-500 mb-2">📷 Fotos ({trabajo.fotos.length})</div>
          <div className="grid grid-cols-3 gap-2">
            {trabajo.fotos.map((foto, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl">🖼️</div>
                  <div className="text-xs text-gray-400 mt-1 px-1 truncate">{foto}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presupuesto y factura asociados */}
      <div className="grid grid-cols-2 gap-2">
        {trabajo.presupuesto ? (
          <div onClick={() => navigate(`/presupuestos/${trabajo.presupuesto.id}`)}
            className="card cursor-pointer active:scale-95 transition-transform border-purple-200 bg-purple-50">
            <div className="text-xs text-purple-600 font-medium mb-1">Presupuesto</div>
            <div className="text-sm font-bold">{trabajo.presupuesto.numero}</div>
            <EstadoBadge estado={trabajo.presupuesto.estado} />
          </div>
        ) : (
          <button onClick={() => navigate(`/presupuestos/nuevo?trabajo_id=${trabajo.id}&cliente_id=${trabajo.cliente_id}`)}
            className="card border-dashed text-center active:scale-95 transition-transform">
            <div className="text-gray-400 text-xs">+ Crear presupuesto</div>
          </button>
        )}

        {trabajo.factura ? (
          <div onClick={() => navigate(`/facturas/${trabajo.factura.id}`)}
            className="card cursor-pointer active:scale-95 transition-transform border-blue-200 bg-blue-50">
            <div className="text-xs text-blue-600 font-medium mb-1">Factura</div>
            <div className="text-sm font-bold">{trabajo.factura.numero}</div>
            <EstadoBadge estado={trabajo.factura.estado} />
          </div>
        ) : (
          <button onClick={() => navigate(`/facturas/nueva?trabajo_id=${trabajo.id}&cliente_id=${trabajo.cliente_id}`)}
            className="card border-dashed text-center active:scale-95 transition-transform">
            <div className="text-gray-400 text-xs">+ Crear factura</div>
          </button>
        )}
      </div>
    </div>
  );
}
