import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { EstadoBadge, formatEuro, formatFecha, esVencida, diasHasta } from '../components/EstadoBadge';

function ModalRecordatorio({ cobro, onClose, onSent }) {
  const [tipo, setTipo] = useState('amable');
  const [plantillas, setPlantillas] = useState([]);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.plantillas.list().then(setPlantillas);
  }, []);

  const generarPreview = () => {
    const p = plantillas.find(p => p.tipo === tipo);
    if (!p) return;
    let msg = p.contenido
      .replace(/\{\{nombre\}\}/g, cobro.cliente_nombre)
      .replace(/\{\{numero\}\}/g, cobro.factura_numero)
      .replace(/\{\{importe\}\}/g, cobro.importe.toFixed(2))
      .replace(/\{\{vencimiento\}\}/g, cobro.fecha_vencimiento)
      .replace(/\{\{metodo\}\}/g, cobro.metodo);
    setPreview(msg);
  };

  useEffect(() => { if (plantillas.length) generarPreview(); }, [tipo, plantillas]);

  const enviar = async () => {
    setSending(true);
    try {
      const result = await api.cobros.recordatorio(cobro.id, tipo, 'whatsapp');
      onSent(result);
    } catch (e) { alert(e.message); setSending(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-1">Enviar recordatorio</h2>
        <div className="text-sm text-gray-500 mb-4">{cobro.cliente_nombre} · {formatEuro(cobro.importe)}</div>

        <div className="mb-3">
          <label className="label">Tipo de recordatorio</label>
          <div className="grid grid-cols-1 gap-2">
            {plantillas.map(p => (
              <label key={p.tipo}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${tipo === p.tipo ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <input type="radio" name="tipo" value={p.tipo} checked={tipo === p.tipo} onChange={() => setTipo(p.tipo)} className="sr-only" />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${tipo === p.tipo ? 'border-blue-600' : 'border-gray-300'}`}>
                  {tipo === p.tipo && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                </div>
                <div>
                  <div className="text-sm font-medium">{p.nombre}</div>
                  <div className="text-xs text-gray-400 capitalize">{p.tipo.replace('_', ' ')}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {preview && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <div className="text-xs font-semibold text-green-700 mb-1">💬 Vista previa del mensaje (simulado)</div>
            <div className="text-sm text-gray-700 leading-relaxed">{preview}</div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
          ⚠️ Este es un recordatorio SIMULADO. No se envía ningún mensaje real.
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={enviar} disabled={sending} className="btn-primary flex-1">
            {sending ? 'Enviando…' : '📤 Enviar simulado'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalConfirmPago({ cobro, onClose, onPaid }) {
  const [metodo, setMetodo] = useState(cobro.metodo || 'transferencia');
  const [saving, setSaving] = useState(false);

  const confirmar = async () => {
    setSaving(true);
    try { await api.cobros.marcarPagado(cobro.id, metodo); onPaid(); }
    catch (e) { alert(e.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-4">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-1">Confirmar pago</h2>
        <div className="text-sm text-gray-500 mb-4">{cobro.cliente_nombre} · {formatEuro(cobro.importe)}</div>
        <div className="mb-4">
          <label className="label">Método de pago</label>
          <select className="input" value={metodo} onChange={e => setMetodo(e.target.value)}>
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="bizum">Bizum</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={confirmar} disabled={saving} className="btn-green flex-1">
            {saving ? '...' : '✅ Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

const FILTROS = [
  { key: '', label: 'Todos' },
  { key: 'pendientes', label: '⏳ Pendientes' },
  { key: 'vencidos', label: '🔴 Vencidos' },
  { key: 'hoy', label: '📅 Hoy' },
  { key: 'proximos7', label: '📆 7 días' },
  { key: 'pagados', label: '✅ Pagados' },
];

export default function Cobros() {
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendientes');
  const [modalRecordatorio, setModalRecordatorio] = useState(null);
  const [modalPago, setModalPago] = useState(null);
  const [enviado, setEnviado] = useState(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const f = params.get('filtro');
    if (f) setFiltro(f);
  }, [params]);

  const load = () => {
    setLoading(true);
    api.cobros.list(filtro).then(d => { setCobros(d); setLoading(false); });
  };

  useEffect(() => { load(); }, [filtro]);

  const totalFiltrado = cobros.filter(c => c.estado !== 'pagado').reduce((s, c) => s + c.importe, 0);

  return (
    <div className="p-3">
      {modalRecordatorio && (
        <ModalRecordatorio
          cobro={modalRecordatorio}
          onClose={() => setModalRecordatorio(null)}
          onSent={(r) => { setModalRecordatorio(null); setEnviado(r); load(); }}
        />
      )}
      {modalPago && (
        <ModalConfirmPago
          cobro={modalPago}
          onClose={() => setModalPago(null)}
          onPaid={() => { setModalPago(null); load(); }}
        />
      )}

      {/* Mensaje enviado */}
      {enviado && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
          <div className="font-semibold text-green-700 text-sm mb-1">✅ Recordatorio simulado enviado</div>
          <div className="text-xs text-gray-600">{enviado.mensaje}</div>
          <button onClick={() => setEnviado(null)} className="text-xs text-gray-400 mt-2">Cerrar</button>
        </div>
      )}

      {/* Total pendiente */}
      {filtro !== 'pagados' && totalFiltrado > 0 && (
        <div className="card bg-blue-700 text-white mb-3">
          <div className="text-xs text-blue-200">Total pendiente</div>
          <div className="text-2xl font-bold">{formatEuro(totalFiltrado)}</div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0 transition-colors ${filtro === f.key ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Cargando...</div>
      ) : cobros.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-4xl mb-2">💶</div>
          <div>No hay cobros en este filtro</div>
        </div>
      ) : (
        <div className="space-y-2">
          {cobros.map(c => {
            const dias = diasHasta(c.fecha_vencimiento);
            const vencido = c.estado === 'vencido';
            const venceHoy = dias === 0 && c.estado !== 'pagado';
            return (
              <div key={c.id}
                className={`card ${vencido ? 'border-red-200 bg-red-50' : venceHoy ? 'border-amber-200 bg-amber-50' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div
                      className="font-semibold text-sm cursor-pointer text-blue-700"
                      onClick={() => navigate(`/clientes/${c.cliente_id}`)}
                    >
                      {c.cliente_nombre}
                    </div>
                    <div
                      className="text-xs text-gray-500 cursor-pointer"
                      onClick={() => navigate(`/facturas/${c.factura_id}`)}
                    >
                      {c.factura_numero}
                    </div>
                    <div className={`text-xs mt-0.5 ${vencido ? 'text-red-600 font-medium' : venceHoy ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                      {vencido ? `⚠️ Venció ${formatFecha(c.fecha_vencimiento)}` :
                       venceHoy ? '📅 Vence hoy' :
                       dias !== null && dias > 0 ? `Vence en ${dias} días (${formatFecha(c.fecha_vencimiento)})` :
                       `Pagado ${formatFecha(c.fecha_pago)}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{c.metodo}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-lg font-bold ${vencido ? 'text-red-700' : ''}`}>{formatEuro(c.importe)}</div>
                    <EstadoBadge estado={c.estado} />
                  </div>
                </div>

                {c.notas && <div className="text-xs text-gray-500 italic mb-2">{c.notas}</div>}

                {c.estado !== 'pagado' && c.estado !== 'incobrable' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModalPago(c)}
                      className="flex-1 bg-green-600 text-white text-sm py-2.5 rounded-xl font-medium active:scale-95 transition-transform">
                      ✅ Cobrado
                    </button>
                    <button
                      onClick={() => setModalRecordatorio(c)}
                      className="flex-1 bg-blue-50 text-blue-700 text-sm py-2.5 rounded-xl font-medium border border-blue-200 active:scale-95 transition-transform">
                      💬 Recordatorio
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
