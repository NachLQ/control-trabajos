import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Panel', icon: '🏠' },
  { path: '/clientes', label: 'Clientes', icon: '👥' },
  { path: '/trabajos', label: 'Trabajos', icon: '🔧' },
  { path: '/cobros', label: 'Cobros', icon: '💶' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const acciones = [
    { label: 'Nuevo cliente', icon: '👤', path: '/clientes?nuevo=1' },
    { label: 'Nuevo trabajo', icon: '🔧', path: '/trabajos?nuevo=1' },
    { label: 'Nuevo presupuesto', icon: '📋', path: '/presupuestos/nuevo' },
    { label: 'Nueva factura', icon: '🧾', path: '/facturas/nueva' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔧</span>
          <div>
            <div className="font-bold text-sm leading-tight">Control de Trabajos</div>
            <div className="text-blue-200 text-xs">Fontanería Rápida Martín</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/plantillas-recordatorio')}
          className="text-blue-200 text-xs active:scale-95 transition-transform"
        >
          ⚙️
        </button>
      </header>

      {/* Contenido */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Overlay menú nuevo */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute bottom-20 left-0 right-0 mx-4 bg-white rounded-2xl shadow-2xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center text-sm font-semibold text-gray-500 mb-3">¿Qué quieres crear?</div>
            <div className="grid grid-cols-2 gap-3">
              {acciones.map(a => (
                <button
                  key={a.path}
                  onClick={() => { setMenuOpen(false); navigate(a.path); }}
                  className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl active:scale-95 transition-transform border border-blue-100"
                >
                  <span className="text-2xl">{a.icon}</span>
                  <span className="text-sm font-medium text-blue-800">{a.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full mt-3 py-3 text-gray-500 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Navegación inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-bottom">
        <div className="flex items-end justify-around px-1 pt-1 pb-2 max-w-md mx-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-0 transition-colors active:scale-95 ${
                isActive(item.path)
                  ? 'text-blue-700'
                  : 'text-gray-400'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={`text-xs font-medium ${isActive(item.path) ? 'text-blue-700' : 'text-gray-400'}`}>
                {item.label}
              </span>
              {isActive(item.path) && <div className="w-1 h-1 bg-blue-700 rounded-full" />}
            </button>
          ))}

          {/* Botón nuevo central */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 -mt-4 bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg active:scale-95 transition-transform justify-center"
          >
            <span className="text-2xl leading-none font-light">+</span>
            <span className="text-xs font-bold leading-none">Nuevo</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
