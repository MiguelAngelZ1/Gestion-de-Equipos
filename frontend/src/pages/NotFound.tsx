import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[#2e5bff]/10 blur-[80px]" />
        <div className="absolute -bottom-32 -right-32 w-[520px] h-[520px] rounded-full bg-cyan-500/5 blur-[80px]" />
      </div>
      <div className="relative z-10 w-full max-w-[560px] flex flex-col items-center text-center">
        <div className="flex items-baseline gap-2">
          <span className="text-[72px] sm:text-[84px] font-black tracking-[-0.05em] leading-none text-white">404</span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#2e5bff] mb-5" />
        </div>
        <h1 className="text-[22px] sm:text-[24px] font-extrabold tracking-tight text-white mt-2">Página no encontrada</h1>
        <p className="text-[14px] leading-[1.6] text-white/45 mt-3 sm:whitespace-nowrap">La ruta que buscás no existe o fue movida. Verificá la URL o volvé al inicio para continuar.</p>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full mt-8">
          <button onClick={() => navigate(isAuthenticated ? '/' : '/login')} className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-[13.5px] py-3 rounded-xl transition-colors">
            <span className="material-symbols-outlined text-[18px]">home</span>
            {isAuthenticated ? 'Ir al inicio' : 'Ir al login'}
          </button>
          <button onClick={() => navigate(-1)} className="flex-1 inline-flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-white font-semibold text-[13.5px] py-3 rounded-xl transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  );
}
