import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { api } from '../api';
import LineaConceptoEditor from '../components/LineaConceptoEditor';
import { formatEuro } from '../components/EstadoBadge';

export default function PresupuestoNuevo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams(); // para edición
  const esEdicion = !!id;

  const [clientes, setClientes] = useState([]);
  const [trabajos, setTrabajos] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    cliente_id: searchParams.get('cliente_id') || '',
    trabajo_id: searchParams.get('trabajo_id') || '',
    fecha: new Date().toISOString().split('T')[0],
    validez_hasta: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })(),
    estado: 'borrador',
    iva_porcentaje: 21,
    descuento: 0,
    notas: '',
  });

  useEffect(() => {
    api.clientes.list().then(setClientes);
    if (esEdicion) {
      api.presupuestos.get(id).then(p => {
        setForm({
          cliente_id: p.cliente_id, trabajo_id: p.trabajo_id || '',
          fecha: p.fecha, validez_hasta: p.validez_hasta, estado: p.estado,
          iva_porcentaje: p.iva_porcentaje, descuento: p.descuento, notas: p.notas || '',
        });
        setLineas(p.lineas || []);
      });
    }
  }, [id]);

  useEffect(() => {
    if (form.cliente_id) {
      api.trabajos.list({ cliente_id: form.cliente_id }).then(setTrabajos);
    }
  }, [form.cliente_id]);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const calcTotales = () => {
    const sub = lineas.reduce((s, l) => s + (l.cantidad * l.precio_unitario), 0) * (1 - form.descuento / 100);
    const iva = sub * (form.iva_porcentaje / 100);
    return { subtotal: sub, iva_total: iva, total: sub + iva };
  };

  const save = async () => {
    if (!form.cliente_id) { setError('Selecciona un cliente'); return; }
    if (lineas.length === 0) { setError('Añade al menos una línea'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, lineas };
      if (esEdicion) {
        await api.presupuestos.update(id, payload);
        navigate(`/presupuestos/${id}`);
      } else {
        const p = await api.presupuestos.create(payload);
        navigate(`/presupuestos/${p.id}`);
      }
    } catch (e) { setError(e.message); setSaving(false); }
  };

  const { subtotal, iva_total, total } = calcTotales();

  const vencimientoOpciones = [
    { label: '7 días', dias: 7 }, { label: '15 días', dias: 15 }, { label: '30 días', dias: 30 },
  ];
  const setVencimiento = (dias) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    setForm(p => ({ ...p, validez_hasta: d.toISOString().split('T')[0] }));
  };

  return (
    <div className="p-3 space-y-3 pb-8">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-blue-600 text-lg px-1">‹</button>
        <h1 className="text-lg font-bold">{esEdicion ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h1>
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
              <option value="enviado">Enviado</option>
              <option value="aceptado">Aceptado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Válido hasta</label>
          <div className="flex gap-2 mb-2">
            {vencimientoOpciones.map(o => (
              <button key={o.dias} type="button" onClick={() => setVencimiento(o.dias)}
                className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 active:scale-95">
                {o.label}
              </button>
            ))}
          </div>
          <input className="input" type="date" value={form.validez_hasta} onChange={f('validez_hasta')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">IVA (%)</label>
            <select className="input" value={form.iva_porcentaje} onChange={e => setForm(p => ({ ...p, iva_porcentaje: parseFloat(e.target.value) }))}>
              <option value={0}>0%</option>
              <option value={4}>4% (super reducido)</option>
              <option value={10}>10% (reducido)</option>
              <option value={21}>21% (general)</option>
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
        {saving ? 'Guardando…' : esEdicion ? '💾 Guardar cambios' : '✅ Crear presupuesto'}
      </button>
    </div>
  );
}
