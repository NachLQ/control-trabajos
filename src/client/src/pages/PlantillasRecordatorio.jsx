import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const VARIABLES = ['{{nombre}}', '{{numero}}', '{{importe}}', '{{vencimiento}}', '{{metodo}}'];

function EditorPlantilla({ plantilla, onSaved }) {
  const [form, setForm] = useState({ nombre: plantilla.nombre, contenido: plantilla.contenido });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.plantillas.update(plantilla.id, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally { setSaving(false); }
  };

  const insertVar = (v) => {
    setForm(p => ({ ...p, contenido: p.contenido + v }));
  };

  return (
    <div className="card mb-3">
      <div className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">{plantilla.tipo.replace('_', ' ')}</div>
      <div className="space-y-2">
        <div>
          <label className="label text-xs">Nombre de la plantilla</label>
          <input className="input text-sm py-2"
            value={form.nombre}
            onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
          />
        </div>
        <div>
          <label className="label text-xs">Mensaje</label>
          <textarea
            className="input text-sm"
            rows={5}
            value={form.contenido}
            onChange={e => setForm(p => ({ ...p, contenido: e.target.value }))}
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Variables disponibles (toca para insertar):</div>
          <div className="flex flex-wrap gap-1">
            {VARIABLES.map(v => (
              <button key={v} type="button" onClick={() => insertVar(v)}
                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-200 active:scale-95 font-mono">
                {v}
              </button>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors active:scale-95 ${saved ? 'bg-green-100 text-green-700 border border-green-300' : 'btn-primary'}`}>
          {saved ? '✅ Guardado' : saving ? 'Guardando…' : '💾 Guardar plantilla'}
        </button>
      </div>
    </div>
  );
}

// Sección de conceptos reutilizables
function ConceptosReutilizables() {
  const [conceptos, setConceptos] = useState([]);
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio_base: '', tipo: 'servicio', iva_porcentaje: 21 });
  const [adding, setAdding] = useState(false);

  const load = () => api.conceptos.list().then(setConceptos);
  useEffect(() => { load(); }, []);

  const crear = async () => {
    if (!form.nombre) return;
    await api.conceptos.create({ ...form, precio_base: parseFloat(form.precio_base) || 0 });
    setForm({ nombre: '', descripcion: '', precio_base: '', tipo: 'servicio', iva_porcentaje: 21 });
    setAdding(false);
    load();
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar concepto?')) return;
    await api.conceptos.del(id);
    load();
  };

  const TIPOS = ['mano_obra','desplazamiento','material','servicio','urgencia','otro'];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-sm">⚡ Conceptos reutilizables</div>
        <button onClick={() => setAdding(!adding)} className="text-blue-600 text-sm font-medium">
          {adding ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>

      {adding && (
        <div className="bg-blue-50 rounded-xl p-3 mb-3 space-y-2">
          <input className="input text-sm py-2" placeholder="Nombre *" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          <input className="input text-sm py-2" placeholder="Descripción" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input text-sm py-2" type="number" placeholder="Precio base" value={form.precio_base} onChange={e => setForm(p => ({ ...p, precio_base: e.target.value }))} />
            <select className="input text-sm py-2" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
              {TIPOS.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <button onClick={crear} className="btn-primary w-full text-sm py-2.5">Crear concepto</button>
        </div>
      )}

      <div className="space-y-2">
        {conceptos.map(c => (
          <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{c.nombre}</div>
              <div className="text-xs text-gray-400">{c.tipo.replace('_', ' ')} · {c.iva_porcentaje}% IVA</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold text-blue-700">{c.precio_base.toFixed(2)}€</div>
              <button onClick={() => eliminar(c.id)} className="text-red-400 text-sm active:scale-95">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlantillasRecordatorio() {
  const [plantillas, setPlantillas] = useState([]);
  const navigate = useNavigate();

  const load = () => api.plantillas.list().then(setPlantillas);
  useEffect(() => { load(); }, []);

  return (
    <div className="p-3 space-y-3 pb-8">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-blue-600 text-lg px-1">‹</button>
        <h1 className="text-lg font-bold">Configuración</h1>
      </div>

      <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800 border border-blue-200">
        📝 Edita las plantillas de recordatorio. Usa las variables para insertar datos del cliente y la factura automáticamente.
      </div>

      <div>
        <div className="text-sm font-bold text-gray-700 mb-2">💬 Plantillas de recordatorio</div>
        {plantillas.map(p => (
          <EditorPlantilla key={p.id} plantilla={p} onSaved={load} />
        ))}
      </div>

      <ConceptosReutilizables />

      <div className="card bg-amber-50 border-amber-200">
        <div className="text-sm font-bold text-amber-800 mb-2">⚠️ Aviso legal — Fase 2 obligatoria</div>
        <div className="text-xs text-amber-700 space-y-1">
          <p>Este MVP está diseñado solo para gestión interna. Antes de uso comercial real en España es obligatorio:</p>
          <ul className="list-disc list-inside space-y-0.5 mt-1">
            <li><strong>Verifactu</strong> — sistema de verificación de facturas (obligatorio desde 2026)</li>
            <li><strong>Facturación electrónica</strong> — B2B obligatoria por Ley Crea y Crece</li>
            <li><strong>Firma digital</strong> de documentos</li>
            <li><strong>Autenticación</strong> y gestión de usuarios</li>
            <li><strong>Backups</strong> seguros y cifrados</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
