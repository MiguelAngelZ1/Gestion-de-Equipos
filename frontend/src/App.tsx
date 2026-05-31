import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROLES } from './config/constants';

const Spinner = () => (
  <div className="w-12 h-12 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin relative z-10" />
);

const PageLoader = () => (
  <div className="min-h-screen bg-[#0f1523] flex flex-col items-center justify-center animate-in fade-in duration-500">
    <div className="relative flex flex-col items-center">
      <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full" />
      <Spinner />
      <p className="text-white font-black uppercase tracking-[0.4em] text-[10px] mt-6 relative z-10 opacity-50">
        Iniciando Módulo
      </p>
    </div>
  </div>
);

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

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  const userRole = (user?.rol || ROLES.USER).toUpperCase();
  if (!roles.includes(userRole)) return <Navigate to="/" replace />;
  return children;
}

function IndexRedirect() {
  const { user } = useAuth();
  const userRole = (user?.rol || ROLES.USER).toUpperCase();
  if (userRole === ROLES.ADMIN) return <Dashboard />;
  return <Navigate to="/equipos" replace />;
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  React.useEffect(() => {
    const handleForbidden = () => {
      window.location.href = "/";
    };
    window.addEventListener("auth:forbidden", handleForbidden);
    return () => window.removeEventListener("auth:forbidden", handleForbidden);
  }, []);

  if (loading) return <PageLoader />;

  return (
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
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
