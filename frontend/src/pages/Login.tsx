import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import logoImage from '../assets/LogoIMPERIO.webp';
import { useToast } from '../context/ToastContext';
import SideRays from '../components/effects/SideRays';
import { User, Lock, MailCheck, KeyRound, Check, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const ViewTransition = {
  initial: { opacity: 0, y: 24, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -24, filter: 'blur(8px)' },
  transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
};
const Shake = { animate: { x: [-12, 12, -8, 8, -4, 4, 0] }, transition: { duration: 0.5 } };

export default function Login() {
  const { showToast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState('login');
  const [successMsg, setSuccessMsg] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [shake, setShake] = useState(false);
  const triggerError = (msg: string) => { showToast(msg, 'error'); setShake(true); setTimeout(() => setShake(false), 500); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !password) return;
    setLoading(true);
    try {
      const data = await login({ usuario, password });
      if (data.success) navigate('/');
      else triggerError('Credenciales incorrectas o usuario no encontrado.');
    } catch { triggerError('No se pudo conectar con el servidor.'); }
    finally { setLoading(false); }
  };
  const handleRecoverEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const data: any = await apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      if (data.success) { setViewState('recover_code'); setSuccessMsg('Te hemos enviado un código de seguridad.'); setResendCooldown(30); }
    } catch (err: any) { triggerError(err.message || 'Error al enviar el código'); }
    finally { setLoading(false); }
  };
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !newPassword) return;
    if (newPassword !== confirmPassword) { triggerError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    try {
      const data: any = await apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code: codigo, newPassword }) });
      if (data.success) { setSuccessMsg(''); setViewState('success'); showToast('Contraseña actualizada con éxito', 'success'); }
    } catch (err: any) { setCodigo(''); triggerError(err.message || 'Error al restablecer la contraseña'); }
    finally { setLoading(false); }
  };
  const handleResendCode = useCallback(async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    try { await apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }); setCodigo(''); setResendCooldown(30); showToast('Te hemos enviado un nuevo código.', 'success'); }
    catch (err: any) { triggerError(err.message || 'Error al reenviar el código'); }
    finally { setLoading(false); }
  }, [email, resendCooldown, loading]);
  const maskEmail = (e: string) => { const [u, d] = e.split('@'); if (!d) return e; return `${u[0]}***${u[u.length - 1]}@${d}`; };
  useEffect(() => { if (resendCooldown <= 0) return; const t = setInterval(() => setResendCooldown(p => p <= 1 ? 0 : p - 1), 1000); return () => clearInterval(t); }, [resendCooldown]);
  useEffect(() => { if (viewState !== 'success') return; const t = setTimeout(() => { setViewState('login'); setSuccessMsg(''); }, 3000); return () => clearTimeout(t); }, [viewState]);
  const pwStrength = (() => {
    if (!newPassword) return { level: 0, label: '', color: '' };
    let s = 0; if (newPassword.length >= 6) s++; if (newPassword.length >= 10) s++; if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) s++; if (/[0-9]/.test(newPassword)) s++; if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    if (s <= 2) return { level: 1, label: 'Débil', color: '#ef4444' }; if (s <= 3) return { level: 2, label: 'Media', color: '#eab308' }; if (s <= 4) return { level: 3, label: 'Fuerte', color: '#22c55e' }; return { level: 4, label: 'Muy fuerte', color: '#22c55e' };
  })();

  const Input = ({ icon: Icon, right, ...props }: any) => (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      <input {...props} className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg ${Icon ? 'pl-10' : 'pl-3'} ${right ? 'pr-10' : 'pr-3'} py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-700 focus:bg-zinc-800 transition-colors ${props.className || ''}`} />
      {right}
    </div>
  );

  return (
    <div className="min-h-screen bg-black relative overflow-y-auto overflow-x-hidden flex flex-col items-center" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
      <SideRays speed={2.5} rayColor1="#06B6D4" rayColor2="#ffffff" intensity={2} spread={2} origin="top-left" tilt={0} saturation={1.5} blend={0.75} falloff={1.6} opacity={1} />
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[420px] px-4 sm:px-6 py-6 min-h-screen">
        <motion.div initial={{ opacity: 0, scale: 0.7, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', damping: 14, stiffness: 120 }} className="mb-3">
          <img src={logoImage} alt="IMPERIO" className="h-[80px] sm:h-[100px] object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]" onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
        </motion.div>
        <div className="mb-6 text-center">
          <h1 className="font-black tracking-tight text-[1.6rem] sm:text-[2rem] text-slate-100" style={{ textShadow: '0 0 30px rgba(6,182,212,0.4), 0 0 60px rgba(6,182,212,0.15)' }}>Control de Equipos</h1>
        </div>

        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 sm:px-8 py-6 sm:py-7 flex flex-col">
            {viewState === 'login' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Bienvenido</h2>
                <p className="text-sm text-zinc-500 mt-1">Ingresa tus credenciales para acceder</p>
              </motion.div>
            )}
            {viewState !== 'login' && viewState !== 'success' && (
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2].map(step => {
                  const isActive = (viewState === 'recover_email' && step === 1) || (viewState === 'recover_code' && step === 2);
                  const isCompleted = viewState === 'recover_code' && step === 1;
                  return (
                    <React.Fragment key={step}>
                      <div className={`w-9 h-9 rounded-full grid place-items-center text-xs font-black border-2 transition-all ${isActive ? 'bg-white border-white text-zinc-900 scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : isCompleted ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-500 opacity-60'}`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : step}
                      </div>
                      {step === 1 && <div className={`w-12 h-1 rounded-full transition-all ${isCompleted ? 'bg-emerald-500/50' : 'bg-zinc-800'}`} />}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            <AnimatePresence mode="wait">
              {viewState === 'login' && (
                <motion.form key="login" initial={ViewTransition.initial} animate={shake ? { ...Shake.animate, opacity: 1 } : ViewTransition.animate} exit={ViewTransition.exit} transition={shake ? Shake.transition : ViewTransition.transition} onSubmit={handleLogin} className="flex flex-col gap-4">
                  <Input icon={User} placeholder="Usuario" value={usuario} onChange={(e: any) => setUsuario(e.target.value)} autoComplete="username" />
                  <Input icon={Lock} placeholder="Contraseña" type={showPassword ? 'text' : 'password'} value={password} onChange={(e: any) => setPassword(e.target.value)} autoComplete="current-password"
                    right={<button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} />
                  <div className="flex justify-end -mt-1">
                    <button type="button" onClick={() => { setSuccessMsg(''); setViewState('recover_email'); }} className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors">¿Olvidaste tu contraseña?</button>
                  </div>
                  <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold text-sm py-2.5 rounded-xl transition-colors shadow-md mt-1">
                    {loading ? <span className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" /> : 'Iniciar Sesión'}
                  </button>
                </motion.form>
              )}
              {viewState === 'recover_email' && (
                <motion.form key="recover_email" initial={{ opacity: 0, x: 50, filter: 'blur(5px)' }} animate={shake ? { ...Shake.animate, opacity: 1, filter: 'blur(0px)' } : { x: 0, opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -50, filter: 'blur(5px)' }} transition={shake ? Shake.transition : ViewTransition.transition} onSubmit={handleRecoverEmail} className="flex flex-col gap-4">
                  <Input icon={MailCheck} placeholder="Correo electrónico" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} autoComplete="email" />
                  <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold text-sm py-2.5 rounded-xl transition-colors shadow-md">
                    {loading ? <span className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" /> : 'Recibir código'}
                  </button>
                  <div className="flex justify-center pt-2">
                    <button type="button" onClick={() => { setSuccessMsg(''); setViewState('login'); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"><ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio</button>
                  </div>
                </motion.form>
              )}
              {viewState === 'recover_code' && (
                <motion.form key="recover_code" initial={{ opacity: 0, x: 50, filter: 'blur(5px)' }} animate={shake ? { ...Shake.animate, opacity: 1, filter: 'blur(0px)' } : { x: 0, opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -50, filter: 'blur(5px)' }} transition={shake ? Shake.transition : ViewTransition.transition} onSubmit={handleResetPassword} className="flex flex-col gap-4">
                  <p className="text-xs text-center text-zinc-500">Código enviado a <span className="text-white font-semibold">{maskEmail(email)}</span></p>
                  <div className="flex justify-between gap-1.5">
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <input key={i} ref={el => { inputRefs.current[i] = el; }} value={codigo[i] || ''} maxLength={1} inputMode="numeric"
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, ''); if (!v) { const a = codigo.split(''); a[i] = ''; setCodigo(a.join('')); return; }
                          const a = codigo.split(''); a[i] = v.slice(-1); setCodigo(a.join('').slice(0, 6)); if (v && i < 5) inputRefs.current[i + 1]?.focus();
                        }}
                        onKeyDown={e => { if (e.key === 'Backspace' && !codigo[i] && i > 0) inputRefs.current[i - 1]?.focus(); }}
                        onPaste={e => { e.preventDefault(); const d = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6); if (d) { setCodigo(d); inputRefs.current[Math.min(d.length, 5)]?.focus(); } }}
                        className={`w-10 sm:w-12 h-12 rounded-xl bg-zinc-900 border text-center text-lg font-black text-white outline-none transition-colors ${codigo[i] ? 'border-white bg-zinc-800' : 'border-zinc-800 focus:border-zinc-700 focus:bg-zinc-800'}`} />
                    ))}
                  </div>
                  <Input icon={KeyRound} placeholder="Nueva contraseña" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)}
                    right={<button type="button" onClick={() => setShowNewPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full text-zinc-500 hover:text-white hover:bg-white/5">{showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} />
                  {newPassword && (
                    <div className="flex flex-col gap-1.5 -mt-1">
                      <div className="flex gap-1">{[1, 2, 3, 4].map(n => <div key={n} className="h-1 flex-1 rounded-full transition-colors" style={{ background: n <= pwStrength.level ? pwStrength.color : 'rgba(63,63,70,0.6)' }} />)}</div>
                      <span className="text-[11px] font-bold" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                    </div>
                  )}
                  <Input icon={KeyRound} placeholder="Confirmar contraseña" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)}
                    right={<button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full text-zinc-500 hover:text-white hover:bg-white/5">{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} />
                  {confirmPassword && confirmPassword !== newPassword && <p className="text-xs text-red-400 -mt-2">Las contraseñas no coinciden</p>}
                  <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold text-sm py-2.5 rounded-xl transition-colors shadow-md">
                    {loading ? <span className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" /> : 'Establecer nueva contraseña'}
                  </button>
                  <div className="flex justify-between items-center pt-1">
                    <button type="button" onClick={() => { setSuccessMsg(''); setViewState('login'); }} className="text-xs font-semibold text-zinc-400 hover:text-white">Cancelar</button>
                    <button type="button" onClick={handleResendCode} disabled={resendCooldown > 0} className={`text-xs font-semibold ${resendCooldown > 0 ? 'text-zinc-600' : 'text-white hover:text-zinc-300'} disabled:pointer-events-none`}>{resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : 'Reenviar código'}</button>
                  </div>
                </motion.form>
              )}
              {viewState === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} className="flex flex-col items-center text-center gap-6 py-2">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 grid place-items-center"><Check className="w-10 h-10 text-emerald-400" /></div>
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400 leading-relaxed px-2">{successMsg || 'Tu cuenta ya está asegurada con tu nueva clave. Ya puedes iniciar sesión nuevamente.'}</p>
                    <p className="text-xs text-zinc-600 mt-2">Redirigiendo al inicio en 3s...</p>
                  </div>
                  <button onClick={() => { setViewState('login'); setSuccessMsg(''); }} className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm py-2.5 rounded-xl transition-colors">Volver al Inicio</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
