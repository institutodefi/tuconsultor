import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import Shell from './components/Shell.jsx';
import Calculadora from './pages/Calculadora.jsx';
import GeneradorOfertas from './pages/GeneradorOfertas.jsx';
import Acceso from './pages/Acceso.jsx';
import EstablecerPassword from './pages/EstablecerPassword.jsx';
import ClientePortal from './portal/ClientePortal.jsx';
import ConsultorPortal from './portal/ConsultorPortal.jsx';
import './index.css';

function Protected({ allow, children }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-[#9FC0CB] font-semibold">Cargando…</div>;

  // Sin sesión, a identificarse.
  if (!user) return <Navigate to="/acceso" replace />;

  // Con sesión pero sin permiso para ESTA zona, al panel que sí le corresponde.
  // Mandarlo a /acceso era el fallo: ya está identificado, así que le salía la
  // pantalla de credenciales con su propio correo visible en la barra lateral,
  // y no había forma de salir de ahí.
  if (allow && !allow.includes(role)) {
    const suyo = role === 'cliente' ? '/clientes' : '/consultores/mi-agenda';
    return <Navigate to={suyo} replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter basename="/app">
      <AuthProvider>
        <Shell>
          <Routes>
            <Route path="/" element={<Navigate to="/calculadora" replace />} />
            <Route path="/calculadora" element={<GeneradorOfertas publico />} />
            <Route path="/acceso" element={<Acceso />} />
            <Route path="/establecer-password" element={<EstablecerPassword />} />
            <Route path="/nueva-password" element={<EstablecerPassword />} />
            <Route path="/clientes/*" element={<Protected allow={['cliente','admin','superadmin']}><ClientePortal /></Protected>} />
            <Route path="/consultores/*" element={<Protected allow={['director','consultor','admin','superadmin','gestion']}><ConsultorPortal /></Protected>} />
            <Route path="*" element={<Navigate to="/calculadora" replace />} />
          </Routes>
        </Shell>
      </AuthProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
