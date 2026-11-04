import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { EstadoBadge, formatEuro, formatFecha, esVencida, diasHasta } from '../components/EstadoBadge';

export default function FacturaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [factura, setFactura] = useState(null);
  const [marking, setMarking] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => api.facturas.get(id).then(setFactura);
  useEffect(() => { load(); }, [id]);

  const marcarPagada = async () => {
    setMarking(true);
    try { await api.facturas.marcarPagada(id); await load(); setMsg('✅ Factura marcada como pagada'); }
    catch (e) { setMsg(e.message); }
    finally { setMarking(false); }
  };

  const cambiarEstado = async (estado) => {
    await api.facturas.update(id, { estado });
    await load();
  };

  if (!factura) return <div className="p-4 text-center text-gray-400">Cargando...</div>;

  const dias = diasHasta(factura.vencimiento);
  const estaVencida = factura.estado !== 'pagada' && esVencida(factura.vencimiento);

  return (
    <div className="p-3 space-y-3 pb-8">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-blue-600 text-lg px-1">‹</button>
        <h1 className="text-lg font-bold flex-1">{factura.numero}</h1>
        <button onClick={() => navigate(`/facturas/${id}/editar`)} className="text-blue-600 text-sm">Editar</button>
      </div>

      {msg && <div className={`text-sm p-3 rounded-xl ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

      <div className="card">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-sm font-bold text-blue-800">{factura.numero}</div>
            <div className="text-xs text-gray-500">Fecha: {formatFecha(factura.fecha)}</div>
            <div className={`text-xs font-medium mt-0.5 ${estaVencida ? 'text-red-600' : dias !== null && dias <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
              Vence: {formatFecha(factura.vencimiento)}
              {dias !== null && factura.estado !== 'pagada' && (
                <span className="ml-1">
                  {estaVencida ? '⚠️ VENCIDA' : dias === 0 ? '(hoy)' : `(en ${dias}d)`}
                </span>
              )}
            </div>
          </div>
          <EstadoBadge estado={factura.estado} size="lg" />
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-400 font-medium mb-0.5">CLIENTE</div>
          <div className="font-semibold text-sm cursor-pointer text-blue-700" onClick={() => navigate(`/clientes/${factura.cliente_id}`)}>
            {factura.cliente_nombre}
          </div>
          {factura.cliente_direccion && <div className="text-xs text-gray-500">{factura.cliente_direccion}</div>}
          {factura.cliente_nif && <div className="text-xs text-gray-400">NIF: {factura.cliente_nif}</div>}
        </div>

        {factura.notas && (
          <div className="mt-2 bg-gray-50 rounded-xl p-2 text-sm text-gray-600 italic">"{factura.notas}"</div>
        )}
      </div>

      {/* Líneas */}
      <div className="card">
        <div className="text-xs font-semibold text-gray-500 mb-2">CONCEPTOS</div>
        <div className="space-y-2">
          {(factura.lineas || []).map((l, i) => (
            <div key={i} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{l.concepto}</div>
                {l.descripcion && <div className="text-xs text-gray-400">{l.descripcion}</div>}
                <div className="text-xs text-gray-400">{l.cantidad} × {formatEuro(l.precio_unitario)}</div>
              </div>
              <div className="text-sm font-bold">{formatEuro(l.total || l.cantidad * l.precio_unitario)}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Base imponible</span><span>{formatEuro(factura.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>IVA ({factura.iva_porcentaje}%)</span><span>{formatEuro(factura.iva_total)}</span>
          </div>
          {factura.descuento > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Descuento ({factura.descuento}%)</span>
              <span>-{formatEuro(factura.subtotal * factura.descuento / 100)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-1 border-t">
            <span>TOTAL</span><span className="text-blue-800">{formatEuro(factura.total)}</span>
          </div>
        </div>
      </div>

      {/* Cobros */}
      {(factura.cobros || []).length > 0 && (
        <div className="card">
          <div className="text-xs font-semibold text-gray-500 mb-2">COBRO ASOCIADO</div>
          {factura.cobros.map(c => (
            <div key={c.id} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{formatEuro(c.importe)}</div>
                <div className="text-xs text-gray-400">{c.metodo} · vence {formatFecha(c.fecha_vencimiento)}</div>
                {c.fecha_pago && <div className="text-xs text-green-600">Pagado: {formatFecha(c.fecha_pago)}</div>}
              </div>
              <EstadoBadge estado={c.estado} />
            </div>
          ))}
        </div>
      )}

      {/* Acciones */}
      <div className="space-y-2">
        {factura.estado !== 'pagada' && factura.estado !== 'anulada' && (
          <button onClick={marcarPagada} disabled={marking}
            className="btn-green w-full py-4 text-base">
            {marking ? '...' : '✅ Marcar como pagada'}
          </button>
        )}
        {factura.estado !== 'pagada' && factura.estado !== 'anulada' && (
          <div className="grid grid-cols-3 gap-2">
            {['emitida','enviada','anulada'].filter(e => e !== factura.estado).map(e => (
              <button key={e} onClick={() => cambiarEstado(e)}
                className="py-2.5 rounded-xl border border-gray-200 text-xs active:scale-95 text-gray-600">
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </button>
            ))}
          </div>
        )}
        <a
          href={api.facturas.pdfUrl(id)}
          target="_blank" rel="noopener noreferrer"
          className="btn-secondary w-full py-3 text-center block"
        >
          📄 Descargar / Ver PDF
        </a>
      </div>
    </div>
  );
}
