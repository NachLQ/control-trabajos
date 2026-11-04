import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { api } from '../api';
import LineaConceptoEditor from '../components/LineaConceptoEditor';

export default function FacturaNueva() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const esEdicion = !!id;

  const [clientes, setClientes] = useState([]);
  const [trabajos, setTrabajos] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const makeVenc = (dias) => {
    const d = new Date(); d.setDate(d.getDate() + dias); return d.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    cliente_id: searchParams.get('cliente_id') || '',
    trabajo_id: searchParams.get('trabajo_id') || '',
    fecha: new Date().toISOString().split('T')[0],
    vencimiento: makeVenc(30),
    estado: 'emitida',
    iva_porcentaje: 21,
    descuento: 0,
    notas: '',
  });

  useEffect(() => {
    api.clientes.list().then(setClientes);
    if (esEdicion) {
      api.facturas.get(id).then(f => {
        setForm({
          cliente_id: f.cliente_id, trabajo_id: f.trabajo_id || '',
          fecha: f.fecha, vencimiento: f.vencimiento, estado: f.estado,
          iva_porcentaje: f.iva_porcentaje, descuento: f.descuento, notas: f.notas || '',
        });
        setLineas(f.lineas || []);
      });
    }
  }, [id]);

  useEffect(() => {
    if (form.cliente_id) {
      api.trabajos.list({ cliente_id: form.cliente_id }).then(setTrabajos);
    }
  }, [form.cliente_id]);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const setVencimiento = (dias) => setForm(p => ({ ...p, vencimiento: makeVenc(dias) }));

  const save = async () => {
    if (!form.cliente_id) { setError('Selecciona un cliente'); return; }
    if (lineas.length === 0) { setError('Añade al menos una línea'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, lineas };
      if (esEdicion) {
        await api.facturas.update(id, payload);
        navigate(`/facturas/${id}`);
      } else {
        const fac = await api.facturas.create(payload);
        navigate(`/facturas/${fac.id}`);
      }
    } catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <div className="p-3 space-y-3 pb-8">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-blue-600 text-lg px-1">‹</button>
        <h1 className="text-lg font-bold">{esEdicion ? 'Editar factura' : 'Nueva factura'}</h1>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">{error}</div>}

      <div className="card space-y-3">
        <div>
          <label className="label">Cliente *</label>
          <select className="input" value={form.cliente_id} onChange={f('cliente_id')}>
            <option value="">Seleccionar cliente…</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        {form.cliente_id && trabajos.length > 0 && (
          <div>
            <label className="label">Trabajo (opcional)</label>
            <select className="input" value={form.trabajo_id} onChange={f('trabajo_id')}>
              <option value="">Sin trabajo asociado</option>
              {trabajos.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" value={form.fecha} onChange={f('fecha')} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.estado} onChange={f('estado')}>
              <option value="borrador">Borrador</option>
              <option value="emitida">Emitida</option>
              <option value="enviada">Enviada</option>
              <option value="pagada">Pagada</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Vencimiento</label>
          <div className="flex gap-2 mb-2">
            {[7, 15, 30].map(d => (
              <button key={d} type="button" onClick={() => setVencimiento(d)}
                className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 active:scale-95">
                {d} días
              </button>
            ))}
          </div>
          <input className="input" type="date" value={form.vencimiento} onChange={f('vencimiento')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">IVA (%)</label>
            <select className="input" value={form.iva_porcentaje} onChange={e => setForm(p => ({ ...p, iva_porcentaje: parseFloat(e.target.value) }))}>
              <option value={0}>0%</option>
              <option value={4}>4%</option>
              <option value={10}>10%</option>
              <option value={21}>21%</option>
            </select>
          </div>
          <div>
            <label className="label">Descuento (%)</label>
            <input className="input" type="number" min="0" max="100" value={form.descuento}
              onChange={e => setForm(p => ({ ...p, descuento: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea className="input" rows={2} placeholder="Notas para el cliente…" value={form.notas} onChange={f('notas')} />
        </div>
      </div>

      <div className="card">
        <LineaConceptoEditor lineas={lineas} onChange={setLineas} ivaPct={form.iva_porcentaje} />
      </div>

      <button onClick={save} disabled={saving}
        className="btn-primary w-full text-base py-4">
        {saving ? 'Guardando…' : esEdicion ? '💾 Guardar cambios' : '✅ Crear factura'}
      </button>
    </div>
  );
}
