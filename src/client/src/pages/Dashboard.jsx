import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { EstadoBadge, PrioridadBadge, formatEuro, formatFecha } from '../components/EstadoBadge';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.dashboard().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center text-gray-400">
        <div className="text-4xl mb-2">🔧</div>
        <div>Cargando...</div>
      </div>
    </div>
  );

  if (!data) return (
    <div className="p-4 text-center text-red-500">
      No se puede conectar al servidor. Asegúrate de que está arrancado.
    </div>
  );

  const { total_por_cobrar, cobros_vencidos, cobros_hoy, trabajos_activos, urgentes, resumen } = data;

  return (
    <div className="p-3 space-y-3">
      {/* KPIs superiores — sin scroll en móvil */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="card bg-gradient-to-br from-blue-700 to-blue-900 text-white cursor-pointer active:scale-95 transition-transform"
          onClick={() => navigate('/cobros')}
        >
          <div className="text-xs font-medium text-blue-200 mb-1">💶 Por cobrar</div>
          <div className="text-2xl font-bold">{formatEuro(total_por_cobrar)}</div>
          <div className="text-xs text-blue-200 mt-1">{resumen.cobros_vencidos_count + resumen.cobros_hoy_count} pendientes</div>
        </div>

        <div
          className={`card cursor-pointer active:scale-95 transition-transform ${resumen.cobros_vencidos_count > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}
          onClick={() => navigate('/cobros?filtro=vencidos')}
        >
          <div className="text-xs font-medium text-red-500 mb-1">🔴 Vencidos</div>
          <div className={`text-2xl font-bold ${resumen.cobros_vencidos_count > 0 ? 'text-red-700' : 'text-gray-400'}`}>
            {resumen.cobros_vencidos_count}
          </div>
          <div className="text-xs text-gray-400 mt-1">cobros</div>
        </div>

        <div
          className={`card cursor-pointer active:scale-95 transition-transform ${resumen.cobros_hoy_count > 0 ? 'bg-amber-50 border-amber-200' : ''}`}
          onClick={() => navigate('/cobros?filtro=hoy')}
        >
          <div className="text-xs font-medium text-amber-600 mb-1">📅 Vence hoy</div>
          <div className={`text-2xl font-bold ${resumen.cobros_hoy_count > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
            {resumen.cobros_hoy_count}
          </div>
          <div className="text-xs text-gray-400 mt-1">cobros</div>
        </div>

        <div
          className="card cursor-pointer active:scale-95 transition-transform"
          onClick={() => navigate('/trabajos')}
        >
          <div className="text-xs font-medium text-blue-600 mb-1">🔧 Activos</div>
          <div className="text-2xl font-bold text-blue-800">{resumen.trabajos_activos}</div>
          <div className="text-xs text-gray-400 mt-1">trabajos</div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => navigate('/presupuestos/nuevo')} className="btn-primary py-3 text-sm flex flex-col items-center gap-1">
          <span className="text-lg">📋</span>
          <span className="text-xs">Presupuesto</span>
        </button>
        <button onClick={() => navigate('/facturas/nueva')} className="btn-primary py-3 text-sm flex flex-col items-center gap-1">
          <span className="text-lg">🧾</span>
          <span className="text-xs">Factura</span>
        </button>
        <button onClick={() => navigate('/trabajos?nuevo=1')} className="btn-secondary py-3 text-sm flex flex-col items-center gap-1 border-blue-300">
          <span className="text-lg">🔧</span>
          <span className="text-xs">Trabajo</span>
        </button>
      </div>

      {/* Urgentes */}
      {urgentes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600 font-bold text-sm">🚨 Urgentes</span>
            <span className="badge bg-red-100 text-red-700">{urgentes.length}</span>
          </div>
          <div className="space-y-2">
            {urgentes.map(t => (
              <div key={t.id} onClick={() => navigate(`/trabajos/${t.id}`)}
                className="card border-red-200 bg-red-50 cursor-pointer active:scale-95 transition-transform">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-red-900 truncate">{t.titulo}</div>
                    <div className="text-xs text-red-600">{t.cliente_nombre}</div>
                    {t.fecha_prevista && <div className="text-xs text-gray-500 mt-0.5">Previsto: {formatFecha(t.fecha_prevista)}</div>}
                  </div>
                  <EstadoBadge estado={t.estado} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cobros que vencen hoy */}
      {cobros_hoy.length > 0 && (
        <div>
          <div className="text-amber-700 font-bold text-sm mb-2">📅 Cobros para hoy</div>
          <div className="space-y-2">
            {cobros_hoy.map(c => (
              <div key={c.id} onClick={() => navigate('/cobros')}
                className="card border-amber-200 bg-amber-50 cursor-pointer active:scale-95 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{c.cliente_nombre}</div>
                    <div className="text-xs text-gray-500">{c.factura_numero}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-800">{formatEuro(c.importe)}</div>
                    <EstadoBadge estado={c.estado} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cobros vencidos */}
      {cobros_vencidos.length > 0 && (
        <div>
          <div className="text-red-600 font-bold text-sm mb-2">🔴 Cobros vencidos</div>
          <div className="space-y-2">
            {cobros_vencidos.map(c => (
              <div key={c.id} onClick={() => navigate('/cobros?filtro=vencidos')}
                className="card border-red-200 bg-red-50 cursor-pointer active:scale-95 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{c.cliente_nombre}</div>
                    <div className="text-xs text-gray-500">{c.factura_numero} · venció {formatFecha(c.fecha_vencimiento)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-700">{formatEuro(c.importe)}</div>
                    <EstadoBadge estado={c.estado} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trabajos activos */}
      {trabajos_activos.length > 0 && (
        <div>
          <div className="text-gray-700 font-bold text-sm mb-2">🔧 Trabajos activos</div>
          <div className="space-y-2">
            {trabajos_activos.map(t => (
              <div key={t.id} onClick={() => navigate(`/trabajos/${t.id}`)}
                className="card cursor-pointer active:scale-95 transition-transform">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{t.titulo}</div>
                    <div className="text-xs text-gray-500">{t.cliente_nombre}</div>
                    {t.fecha_prevista && <div className="text-xs text-gray-400 mt-0.5">Previsto: {formatFecha(t.fecha_prevista)}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <EstadoBadge estado={t.estado} />
                    {t.prioridad === 'urgente' && <PrioridadBadge prioridad={t.prioridad} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acceso rápido */}
      <div className="grid grid-cols-2 gap-2 pb-2">
        <button onClick={() => navigate('/clientes')} className="card text-center active:scale-95 transition-transform">
          <div className="text-2xl mb-1">👥</div>
          <div className="text-sm font-medium text-gray-700">Clientes</div>
        </button>
        <button onClick={() => navigate('/cobros')} className="card text-center active:scale-95 transition-transform">
          <div className="text-2xl mb-1">💶</div>
          <div className="text-sm font-medium text-gray-700">Todos los cobros</div>
        </button>
      </div>

      <button onClick={load} className="w-full text-center text-xs text-gray-400 py-2 active:scale-95">
        ↻ Actualizar panel
      </button>
    </div>
  );
}
