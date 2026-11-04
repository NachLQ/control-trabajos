import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { EstadoBadge, formatEuro, formatFecha } from '../components/EstadoBadge';

export default function PresupuestoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pres, setPres] = useState(null);
  const [converting, setConverting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => api.presupuestos.get(id).then(setPres);
  useEffect(() => { load(); }, [id]);

  const cambiarEstado = async (estado) => {
    await api.presupuestos.update(id, { estado });
    await load();
  };

  const convertir = async () => {
    if (!window.confirm('¿Convertir este presupuesto en factura?')) return;
    setConverting(true);
    try {
      const f = await api.presupuestos.convertir(id);
      navigate(`/facturas/${f.id}`);
    } catch (e) { setMsg(e.message); setConverting(false); }
  };

  if (!pres) return <div className="p-4 text-center text-gray-400">Cargando...</div>;

  return (
    <div className="p-3 space-y-3 pb-8">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-blue-600 text-lg px-1">‹</button>
        <h1 className="text-lg font-bold flex-1">{pres.numero}</h1>
        <button onClick={() => navigate(`/presupuestos/${id}/editar`)} className="text-blue-600 text-sm">Editar</button>
      </div>

      {msg && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">{msg}</div>}

      <div className="card">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-sm font-bold text-blue-800">{pres.numero}</div>
            <div className="text-xs text-gray-500">Fecha: {formatFecha(pres.fecha)}</div>
            <div className="text-xs text-gray-500">Válido hasta: {formatFecha(pres.validez_hasta)}</div>
          </div>
          <EstadoBadge estado={pres.estado} size="lg" />
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-400 font-medium mb-0.5">CLIENTE</div>
          <div className="font-semibold text-sm">{pres.cliente_nombre}</div>
          {pres.cliente_direccion && <div className="text-xs text-gray-500">{pres.cliente_direccion}</div>}
          {pres.cliente_nif && <div className="text-xs text-gray-400">NIF: {pres.cliente_nif}</div>}
        </div>

        {pres.notas && (
          <div className="mt-2 bg-gray-50 rounded-xl p-2 text-sm text-gray-600 italic">"{pres.notas}"</div>
        )}
      </div>

      {/* Líneas */}
      <div className="card">
        <div className="text-xs font-semibold text-gray-500 mb-2">CONCEPTOS</div>
        <div className="space-y-2">
          {(pres.lineas || []).map((l, i) => (
            <div key={i} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{l.concepto}</div>
                {l.descripcion && <div className="text-xs text-gray-400">{l.descripcion}</div>}
                <div className="text-xs text-gray-400">{l.cantidad} × {formatEuro(l.precio_unitario)}</div>
              </div>
              <div className="text-sm font-bold text-right">{formatEuro(l.total || l.cantidad * l.precio_unitario)}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Base imponible</span><span>{formatEuro(pres.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>IVA ({pres.iva_porcentaje}%)</span><span>{formatEuro(pres.iva_total)}</span>
          </div>
          {pres.descuento > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Descuento ({pres.descuento}%)</span><span>-{formatEuro(pres.subtotal * pres.descuento / 100)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t">
            <span>TOTAL</span><span className="text-blue-800">{formatEuro(pres.total)}</span>
          </div>
        </div>
      </div>

      {/* Cambiar estado */}
      <div className="card">
        <div className="text-xs font-semibold text-gray-500 mb-2">CAMBIAR ESTADO</div>
        <div className="grid grid-cols-2 gap-2">
          {['borrador','enviado','aceptado','rechazado'].filter(e => e !== pres.estado).map(e => (
            <button key={e} onClick={() => cambiarEstado(e)}
              className="py-2.5 px-3 rounded-xl border border-gray-200 text-sm active:scale-95 transition-transform">
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="space-y-2">
        {pres.estado !== 'convertido' && pres.estado !== 'rechazado' && (
          <button onClick={convertir} disabled={converting}
            className="btn-primary w-full py-4 text-base">
            {converting ? 'Convirtiendo…' : '🧾 Convertir a factura'}
          </button>
        )}
        {pres.estado === 'convertido' && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center text-sm text-purple-700">
            ✅ Presupuesto convertido en factura
          </div>
        )}
        <a
          href={api.presupuestos.pdfUrl(id)}
          target="_blank" rel="noopener noreferrer"
          className="btn-secondary w-full py-3 text-center block"
        >
          📄 Descargar PDF
        </a>
      </div>
    </div>
  );
}
