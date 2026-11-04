import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';

function ModalNuevoCliente({ onClose, onCreated }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', direccion: '', nif: '', notas: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const c = await api.clientes.create(form);
      onCreated(c);
    } catch (e) { setError(e.message); setSaving(false); }
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-4">Nuevo cliente</h2>
        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-3">{error}</div>}
        <div className="space-y-3">
          <div><label className="label">Nombre *</label><input className="input" placeholder="Nombre completo" value={form.nombre} onChange={f('nombre')} /></div>
          <div><label className="label">Teléfono</label><input className="input" type="tel" placeholder="6XX XXX XXX" value={form.telefono} onChange={f('telefono')} /></div>
          <div><label className="label">Email</label><input className="input" type="email" placeholder="email@ejemplo.com" value={form.email} onChange={f('email')} /></div>
          <div><label className="label">Dirección</label><input className="input" placeholder="Calle, número, ciudad" value={form.direccion} onChange={f('direccion')} /></div>
          <div><label className="label">NIF/CIF</label><input className="input" placeholder="Opcional" value={form.nif} onChange={f('nif')} /></div>
          <div><label className="label">Notas</label><textarea className="input" rows={2} placeholder="Notas internas" value={form.notas} onChange={f('notas')} /></div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando…' : 'Crear cliente'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (params.get('nuevo') === '1') setModal(true);
  }, [params]);

  const load = (q = '') => {
    setLoading(true);
    api.clientes.list(q).then(data => { setClientes(data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  return (
    <div className="p-3">
      {modal && (
        <ModalNuevoCliente
          onClose={() => setModal(false)}
          onCreated={c => { setModal(false); navigate(`/clientes/${c.id}`); }}
        />
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            className="input pl-8"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <button onClick={() => setModal(true)} className="btn-primary px-4 py-3 whitespace-nowrap">
          + Nuevo
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Cargando...</div>
      ) : clientes.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-4xl mb-2">👥</div>
          <div>No hay clientes</div>
          <button onClick={() => setModal(true)} className="btn-primary mt-4 px-6">Añadir primer cliente</button>
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map(c => (
            <div key={c.id} onClick={() => navigate(`/clientes/${c.id}`)}
              className="card cursor-pointer active:scale-95 transition-transform">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
                  {c.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm">{c.nombre}</div>
                  <div className="text-xs text-gray-500 flex gap-2">
                    {c.telefono && <span>📞 {c.telefono}</span>}
                    {c.nif && <span>· {c.nif}</span>}
                  </div>
                  {c.direccion && <div className="text-xs text-gray-400 truncate">{c.direccion}</div>}
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
