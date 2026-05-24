import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { isAuthenticated } from './services/api';
import { ToastProvider } from './context/ToastContext';
import { ROLES } from './config/constants';

// Cargador de pantalla completa premium para transiciones de ruta
const PageLoader = () => (
  <div className="min-h-screen bg-[#0f1523] flex flex-col items-center justify-center animate-in fade-in duration-500">
    <div className="relative flex flex-col items-center">
      <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full" />
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative z-10" />
      <p className="text-white font-black uppercase tracking-[0.4em] text-[10px] mt-6 relative z-10 opacity-50">
        Iniciando Módulo
      </p>
    </div>
  </div>
);

// Lazy Loading de páginas y layouts
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Equipos = lazy(() => import('./pages/Equipos'));
const Soporte = lazy(() => import('./pages/Soporte'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Historial = lazy(() => import('./pages/Historial'));
const Componentes = lazy(() => import('./pages/Componentes'));
const MensajeAdmin = lazy(() => import('./pages/MensajeAdmin'));
const Prestamos = lazy(() => import('./pages/Prestamos'));
const IPAM = lazy(() => import('./pages/IPAM'));

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RoleRoute = ({ children, roles }) => {
  const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const userRole = (userData.rol || ROLES.USER).toUpperCase();
  
  if (!roles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const IndexRedirect = () => {
  const userData = JSON.parse(localStorage.getItem("equipos_user_data") || "{}");
  const userRole = (userData.rol || ROLES.USER).toUpperCase();
  
  if (userRole === ROLES.ADMIN) {
    return <Dashboard />;
  } else {
    // Los usuarios estándar no ven el Dashboard, van directo a equipos o dejar nota
    return <Navigate to="/equipos" replace />;
  }
};

function App() {
  const [authError, setAuthError] = React.useState(null);

  React.useEffect(() => {
    const handleUnauthorized = () => {
      setAuthError("Sesión expirada. Por favor, ingrese de nuevo.");
      window.location.href = "/login";
    };

    const handleForbidden = () => {
      // Evitar alertas intrusivas en el bucle si es posible, o redirigir con gracia
      window.location.href = "/";
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    window.addEventListener("auth:forbidden", handleForbidden);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
      window.removeEventListener("auth:forbidden", handleForbidden);
    };
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<IndexRedirect />} />
              <Route path="equipos" element={<Equipos />} />
              <Route path="soporte" element={
                <RoleRoute roles={[ROLES.ADMIN]}>
                  <Soporte />
                </RoleRoute>
              } />
              <Route path="configuracion" element={
                <RoleRoute roles={[ROLES.ADMIN]}>
                  <Configuracion />
                </RoleRoute>
              } />
              <Route path="historial" element={
                <RoleRoute roles={[ROLES.ADMIN]}>
                  <Historial />
                </RoleRoute>
              } />
              <Route path="componentes" element={
                <RoleRoute roles={[ROLES.ADMIN]}>
                  <Componentes />
                </RoleRoute>
              } />
              <Route path="prestamos" element={
                <RoleRoute roles={[ROLES.ADMIN]}>
                  <Prestamos />
                </RoleRoute>
              } />
              <Route path="ipam" element={
                <RoleRoute roles={[ROLES.ADMIN]}>
                  <IPAM />
                </RoleRoute>
              } />
              <Route path="mensaje-admin" element={<MensajeAdmin />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
