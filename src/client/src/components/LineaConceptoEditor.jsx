import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatEuro } from './EstadoBadge';

export default function LineaConceptoEditor({ lineas, onChange, ivaPct = 21 }) {
  const [conceptos, setConceptos] = useState([]);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    api.conceptos.list().then(setConceptos).catch(() => {});
  }, []);

  const addLinea = () => {
    onChange([...lineas, { concepto: '', descripcion: '', cantidad: 1, precio_unitario: 0, iva_porcentaje: ivaPct }]);
  };

  const addConcepto = (c) => {
    onChange([...lineas, {
      concepto: c.nombre,
      descripcion: c.descripcion || '',
      cantidad: 1,
      precio_unitario: c.precio_base,
      iva_porcentaje: c.iva_porcentaje || ivaPct
    }]);
    setShowSelector(false);
  };

  const updateLinea = (i, field, value) => {
    const updated = lineas.map((l, idx) => {
      if (idx !== i) return l;
      return { ...l, [field]: value };
    });
    onChange(updated);
  };

  const removeLinea = (i) => {
    onChange(lineas.filter((_, idx) => idx !== i));
  };

  const subtotal = lineas.reduce((s, l) => s + (parseFloat(l.cantidad || 0) * parseFloat(l.precio_unitario || 0)), 0);
  const ivaTotal = subtotal * (ivaPct / 100);
  const total = subtotal + ivaTotal;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="label mb-0">Líneas de concepto</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowSelector(true)} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-200 active:scale-95">
            ⚡ Reutilizable
          </button>
          <button type="button" onClick={addLinea} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg border border-gray-200 active:scale-95">
            + Línea
          </button>
        </div>
      </div>

      {/* Selector de conceptos reutilizables */}
      {showSelector && (
        <div className="mb-3 bg-blue-50 rounded-xl p-3 border border-blue-200">
          <div className="text-xs font-semibold text-blue-700 mb-2">Selecciona un concepto:</div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {conceptos.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => addConcepto(c)}
                className="w-full text-left bg-white rounded-lg p-2.5 border border-blue-100 active:scale-95 transition-transform"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{c.nombre}</span>
                  <span className="text-sm font-bold text-blue-700">{formatEuro(c.precio_base)}</span>
                </div>
                {c.descripcion && <div className="text-xs text-gray-500 mt-0.5">{c.descripcion}</div>}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowSelector(false)} className="mt-2 text-xs text-gray-500 w-full text-center py-1">
            Cancelar
          </button>
        </div>
      )}

      {/* Líneas */}
      <div className="space-y-3">
        {lineas.map((l, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="flex gap-2 mb-2">
              <input
                className="input flex-1 text-sm py-2"
                placeholder="Concepto *"
                value={l.concepto}
                onChange={e => updateLinea(i, 'concepto', e.target.value)}
              />
              <button type="button" onClick={() => removeLinea(i)} className="text-red-400 text-lg px-1">✕</button>
            </div>
            <input
              className="input text-sm py-2 mb-2"
              placeholder="Descripción (opcional)"
              value={l.descripcion || ''}
              onChange={e => updateLinea(i, 'descripcion', e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500">Cant.</label>
                <input
                  type="number" min="0.01" step="0.01"
                  className="input text-sm py-2"
                  value={l.cantidad}
                  onChange={e => updateLinea(i, 'cantidad', parseFloat(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Precio €</label>
                <input
                  type="number" min="0" step="0.01"
                  className="input text-sm py-2"
                  value={l.precio_unitario}
                  onChange={e => updateLinea(i, 'precio_unitario', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Total</label>
                <div className="input text-sm py-2 bg-gray-100 font-semibold text-right">
                  {formatEuro(l.cantidad * l.precio_unitario)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {lineas.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-4 border-2 border-dashed border-gray-200 rounded-xl">
          Sin líneas — pulsa "+ Línea" o "⚡ Reutilizable"
        </div>
      )}

      {/* Resumen totales */}
      {lineas.length > 0 && (
        <div className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-200">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Base imponible</span><span className="font-medium">{formatEuro(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>IVA ({ivaPct}%)</span><span className="font-medium">{formatEuro(ivaTotal)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-blue-900 mt-2 pt-2 border-t border-blue-200">
            <span>TOTAL</span><span>{formatEuro(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
