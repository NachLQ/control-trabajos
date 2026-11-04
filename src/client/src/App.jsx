import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import ClienteDetalle from './pages/ClienteDetalle';
import Trabajos from './pages/Trabajos';
import TrabajoDetalle from './pages/TrabajoDetalle';
import PresupuestoNuevo from './pages/PresupuestoNuevo';
import PresupuestoDetalle from './pages/PresupuestoDetalle';
import FacturaNueva from './pages/FacturaNueva';
import FacturaDetalle from './pages/FacturaDetalle';
import Cobros from './pages/Cobros';
import PlantillasRecordatorio from './pages/PlantillasRecordatorio';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<ClienteDetalle />} />
        <Route path="/trabajos" element={<Trabajos />} />
        <Route path="/trabajos/:id" element={<TrabajoDetalle />} />
        <Route path="/presupuestos/nuevo" element={<PresupuestoNuevo />} />
        <Route path="/presupuestos/:id" element={<PresupuestoDetalle />} />
        <Route path="/presupuestos/:id/editar" element={<PresupuestoNuevo />} />
        <Route path="/facturas/nueva" element={<FacturaNueva />} />
        <Route path="/facturas/:id" element={<FacturaDetalle />} />
        <Route path="/facturas/:id/editar" element={<FacturaNueva />} />
        <Route path="/cobros" element={<Cobros />} />
        <Route path="/plantillas-recordatorio" element={<PlantillasRecordatorio />} />
      </Routes>
    </Layout>
  );
}
