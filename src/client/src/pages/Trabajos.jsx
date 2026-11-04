import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { EstadoBadge, PrioridadBadge, formatFecha } from '../components/EstadoBadge';

const ESTADOS = ['', 'pendiente', 'en_curso', 'esperando_material', 'terminado', 'facturado', 'cobrado', 'cancelado'];
const PRIORIDADES = ['', 'urgente', 'normal', 'baja'];

function ModalNuevoTrabajo({ clienteIdInicial, onClose, onCreated }) {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({
    cliente_id: clienteIdInicial || '',
    titulo: '', descripcion: '', estado: 'pendiente', prioridad: 'normal',
    fecha_prevista: '', materiales: '', notas: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.clientes.list().then(setClientes); }, []);

  const save = async () => {
    if (!form.titulo.trim()) { setError('El título es obligatorio'); return; }
    if (!form.cliente_id) { setError('Selecciona un cliente'); return; }
    setSaving(true);
    try { const t = await api.trabajos.create(form); onCreated(t); }
    catch (e) { setError(e.message); setSaving(false); }
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-4 max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-4">Nuevo trabajo</h2>
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-3">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="label">Cliente *</label>
            <select className="input" value={form.cliente_id} onChange={f('cliente_id')}>
              <option value="">Seleccionar cliente…</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div><label className="label">Título *</label><input className="input" placeholder="Ej: Fuga en baño" value={form.titulo} onChange={f('titulo')} /></div>
          <div><label className="label">Descripción</label><textarea className="input" rows={2} value={form.descripcion} onChange={f('descripcion')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={f('estado')}>
                <option value="pendiente">Pendiente</option>
                <option value="en_curso">En curso</option>
                <option value="esperando_material">Esperando material</option>
                <option value="terminado">Terminado</option>
              </select>
            </div>
            <div>
              <label className="label">Prioridad</label>
              <select className="input" value={form.prioridad} onChange={f('prioridad')}>
                <option value="baja">Baja</option>
                <option value="normal">Normal</option>
                <option value="urgente">🚨 Urgente</option>
              </select>
            </div>
          </div>
          <div><label className="label">Fecha prevista</label><input className="input" type="date" value={form.fecha_prevista} onChange={f('fecha_prevista')} /></div>
          <div><label className="label">Materiales</label><input className="input" placeholder="Juntas, llave de paso..." value={form.materiales} onChange={f('materiales')} /></div>
          <div><label className="label">Notas internas</label><textarea className="input" rows={2} value={form.notas} onChange={f('notas')} /></div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? '...' : 'Crear trabajo'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Trabajos() {
  const [trabajos, setTrabajos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [modal, setModal] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clienteIdInicial = params.get('cliente_id') || '';

  useEffect(() => {
    if (params.get('nuevo') === '1') setModal(true);
  }, [params]);

  const load = () => {
    setLoading(true);
    const p = {};
    if (filtroEstado) p.estado = filtroEstado;
    if (filtroPrioridad) p.prioridad = filtroPrioridad;
    api.trabajos.list(p).then(d => { setTrabajos(d); setLoading(false); });
  };

  useEffect(() => { load(); }, [filtroEstado, filtroPrioridad]);

  return (
    <div className="p-3">
      {modal && (
        <ModalNuevoTrabajo
          clienteIdInicial={clienteIdInicial}
          onClose={() => setModal(false)}
          onCreated={t => { setModal(false); navigate(`/trabajos/${t.id}`); }}
        />
      )}

      <div className="flex gap-2 mb-3">
        <select className="input flex-1 py-2.5 text-sm" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.slice(1).map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
        </select>
        <select className="input w-28 py-2.5 text-sm" value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}>
          <option value="">Prioridad</option>
          {PRIORIDADES.slice(1).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={() => setModal(true)} className="btn-primary px-3 py-2.5 text-sm whitespace-nowrap">+ Nuevo</button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Cargando...</div>
      ) : trabajos.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-4xl mb-2">🔧</div>
          <div>No hay trabajos</div>
          <button onClick={() => setModal(true)} className="btn-primary mt-4 px-6">Crear trabajo</button>
        </div>
      ) : (
        <div className="space-y-2">
          {trabajos.map(t => (
            <div key={t.id} onClick={() => navigate(`/trabajos/${t.id}`)}
              className={`card cursor-pointer active:scale-95 transition-transform ${t.prioridad === 'urgente' ? 'border-red-200 bg-red-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{t.titulo}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.cliente_nombre}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <EstadoBadge estado={t.estado} />
                    {t.prioridad === 'urgente' && <PrioridadBadge prioridad={t.prioridad} />}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {t.fecha_prevista && <div className="text-xs text-gray-400">{formatFecha(t.fecha_prevista)}</div>}
                  <span className="text-gray-300 text-lg">›</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
