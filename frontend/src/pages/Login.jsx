import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, User, MailCheck, Eye, EyeOff, KeyRound, Check, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { setAuthToken, apiRequest } from '../services/api';
import logoImage from '../assets/LogoIMPERIO.webp';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const { showToast } = useToast();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState('login'); // 'login', 'recover_email', 'recover_code', 'success'
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Refs para los cuadros de código
  const inputRefs = useRef([]);

  // Shake animation trigger
  const [shake, setShake] = useState(false);
  const triggerError = (msg) => {
    showToast(msg, "error");
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usuario || !password) return;
    
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ usuario, password }) 
      });

      if (data.success) {
        setAuthToken(data.token);
        if (data.user) {
          localStorage.setItem("equipos_user_data", JSON.stringify(data.user));
        }
        navigate('/');
      } else {
        triggerError("Credenciales incorrectas o usuario no encontrado.");
      }
    } catch (err) {
      triggerError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverEmail = async (e) => {
    e.preventDefault();
    if(!email) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      if (data.success) {
        setViewState('recover_code');
        setSuccessMsg('Te hemos enviado un código de seguridad.'); // Texto más directo
        setError('');
      }
    } catch (err) {
      triggerError(err.message || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if(!codigo || !newPassword) return;
    setLoading(true);
    try {
      const data = await apiRequest('/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code: codigo, newPassword })
      });
      if (data.success) {
        setSuccessMsg(''); // Limpiar mensaje de "código enviado"
        setViewState('success');
        showToast("Contraseña actualizada con éxito", "success");
      }
    } catch (err) {
      triggerError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative font-sans bg-[#0b1120]">
      {/* Fondo Premium Oscuro con degradados vibrantes */}
      
      <motion.div 
        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-indigo-900/40 to-blue-900/20 blur-[120px] -z-10 pointer-events-none"
      />
      
      <motion.div 
        animate={{ rotate: -360, y: [0, 50, 0] }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tr from-violet-900/30 to-fuchsia-900/10 blur-[130px] -z-10 pointer-events-none"
      />

      <motion.div 
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="bg-[#1e293b]/50 backdrop-blur-3xl border border-white/10 max-w-[420px] w-full rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden relative z-10"
      >
        <div className="p-10 pb-6 text-center">
          {/* Logo Oscuro en placa blanca */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15, delay: 0.1 }}
            className="flex justify-center mb-6"
          >
            <div className="flex items-center justify-center">
              <img src={logoImage} alt="Logo" className="h-20 object-contain drop-shadow-sm" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[28px] leading-tight font-black tracking-tight text-white"
          >
            {viewState === 'login' && 'Bienvenido'}
            {viewState === 'recover_email' && 'Recuperar Acceso'}
            {viewState === 'recover_code' && 'Ingresa el Código'}
            {viewState === 'success' && '¡Todo Listo! 🎉'}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-slate-300 mt-2 text-sm font-medium"
          >
            {viewState === 'login' && 'Ingresa tus credenciales para continuar'}
            {viewState === 'recover_email' && 'Te enviaremos un código de seguridad'}
            {viewState === 'recover_code' && 'Revisa tu bandeja de entrada y spam'}
            {viewState === 'success' && 'Tu contraseña ha sido actualizada'}
          </motion.p>
        </div>
        
        <div className="px-10 pb-10">
          {/* Stepper (Progress Indicator) */}
          {viewState !== 'login' && viewState !== 'success' && (
            <div className="flex items-center justify-center gap-2 mb-8 mt-2">
              {[1, 2].map((step) => {
                const isActive = (viewState === 'recover_email' && step === 1) || 
                                 (viewState === 'recover_code' && step === 2);
                const isCompleted = (viewState === 'recover_code' && step === 1);
                
                return (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 border-2 ${
                      isActive 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] scale-110' 
                        : isCompleted 
                        ? 'bg-emerald-500 border-emerald-400 text-white' 
                        : 'bg-white/5 border-white/10 text-slate-500 opacity-50'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : step}
                    </div>
                    {step === 1 && (
                      <div className={`w-12 h-1 rounded-full mx-2 transition-all duration-700 ${
                        isCompleted ? 'bg-emerald-500/50' : 'bg-white/5'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <AnimatePresence mode="wait">
            {viewState === 'login' && (
              <motion.form 
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={shake ? { x: [-10, 10, -10, 10, 0], opacity: 1 } : { x: 0, opacity: 1 }}
                exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                transition={shake ? { duration: 0.4 } : { type: "spring", stiffness: 300, damping: 25 }}
                onSubmit={handleLogin} 
                className="space-y-4"
              >
                <div className="space-y-4">
                  <div className="relative group">
                    <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors" />
                    <input
                      type="text"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      className={`w-full pl-12 pr-5 py-4 rounded-2xl bg-white/5 border outline-none focus:ring-4 transition-all text-white font-semibold placeholder:text-slate-400 shadow-inner ${
                        error && !usuario ? 'border-rose-400 focus:ring-rose-500/10 focus:border-rose-400 focus:bg-white/10' : 'border-white/10 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white/10'
                      }`}
                      placeholder="Usuario"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full pl-12 pr-12 py-4 rounded-2xl bg-white/5 border outline-none focus:ring-4 transition-all text-white font-semibold placeholder:text-slate-400 shadow-inner [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden ${
                        error && !password ? 'border-rose-400 focus:ring-rose-500/10 focus:border-rose-400 focus:bg-white/10' : 'border-white/10 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white/10'
                      }`}
                      placeholder="Contraseña"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-1 pb-3">
                  <button 
                    type="button" 
                    onClick={() => { setError(''); setSuccessMsg(''); setViewState('recover_email'); }}
                    className="text-[13px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-4 font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-70 disabled:hover:y-0 cursor-pointer"
                >
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div key="loading" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </motion.div>
                    ) : (
                      <motion.span key="text" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                        Iniciar Sesión
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.form>
            )}

            {viewState === 'recover_email' && (
              <motion.form 
                key="recover-email-form"
                initial={{ opacity: 0, x: 50, filter: 'blur(5px)' }}
                animate={shake ? { x: [-10, 10, -10, 10, 0], opacity: 1, filter: 'blur(0px)' } : { x: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -50, filter: 'blur(5px)' }}
                transition={shake ? { duration: 0.4 } : { type: "spring", stiffness: 300, damping: 25 }}
                onSubmit={handleRecoverEmail} 
                className="space-y-5"
              >
                <div className="relative group">
                  <MailCheck className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/5 border border-white/10 outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white/10 transition-all text-white font-semibold placeholder:text-slate-400 shadow-inner"
                    placeholder="Correo electrónico"
                  />
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-4 font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-70 cursor-pointer"
                >
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </motion.div>
                    ) : (
                      <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        Recibir código
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                <div className="flex justify-center pt-2">
                  <button 
                    type="button" 
                    onClick={() => { setError(''); setSuccessMsg(''); setViewState('login'); }}
                    className="text-[13px] font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio de Sesión
                  </button>
                </div>
              </motion.form>
            )}

            {viewState === 'recover_code' && (
              <motion.form 
                key="recover-code-form"
                initial={{ opacity: 0, x: 50, filter: 'blur(5px)' }}
                animate={shake ? { x: [-10, 10, -10, 10, 0], opacity: 1, filter: 'blur(0px)' } : { x: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -50, filter: 'blur(5px)' }}
                transition={shake ? { duration: 0.4 } : { type: "spring", stiffness: 300, damping: 25 }}
                onSubmit={handleResetPassword} 
                className="space-y-6"
              >
                <div className="space-y-8">
                  <div className="flex justify-between gap-2 px-1">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        id={`code-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={codigo[index] || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          if (!val) {
                             const newCode = codigo.split('');
                             newCode[index] = '';
                             setCodigo(newCode.join(''));
                             return;
                          }
                          const newCode = codigo.split('');
                          newCode[index] = val.slice(-1);
                          const updatedCode = newCode.join('').slice(0, 6);
                          setCodigo(updatedCode);
                          
                          if (val && index < 5) {
                            inputRefs.current[index + 1]?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !codigo[index] && index > 0) {
                            inputRefs.current[index - 1]?.focus();
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                          if (pasteData) {
                            setCodigo(pasteData);
                            const nextIndex = Math.min(pasteData.length, 5);
                            inputRefs.current[nextIndex]?.focus();
                          }
                        }}
                        className={`w-12 h-14 text-center text-xl font-black bg-white/5 border rounded-2xl text-white outline-none focus:ring-4 transition-all shadow-inner ${
                          codigo[index] ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/10 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <div className="relative group">
                    <KeyRound className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white/10 transition-all text-white font-semibold placeholder:text-slate-400 shadow-inner"
                      placeholder="Nueva contraseña segura"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-4 font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-70 cursor-pointer"
                >
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </motion.div>
                    ) : (
                      <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        Establecer nueva contraseña
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                <div className="flex justify-between items-center px-1 pt-2">
                  <button 
                    type="button" 
                    onClick={() => { setError(''); setSuccessMsg(''); setViewState('login'); }}
                    className="text-[13px] font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setCodigo(''); setSuccessMsg('Te hemos enviado un nuevo código.'); }}
                    className="text-[13px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Reenviar código
                  </button>
                </div>
              </motion.form>
            )}

            {viewState === 'success' && (
              <motion.div
                key="success-view"
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                className="text-center space-y-8"
              >
                <div className="flex justify-center relative">
                   <motion.div
                     initial={{ scale: 0 }}
                     animate={{ scale: [0, 1.2, 1] }}
                     transition={{ duration: 0.5, delay: 0.2 }}
                     className="w-24 h-24 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center relative z-10"
                   >
                     <Check className="w-12 h-12 text-emerald-400" />
                   </motion.div>
                   <motion.div 
                     animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                     transition={{ duration: 2, repeat: Infinity }}
                     className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl"
                   />
                </div>
                
                <div className="space-y-2">
                   <p className="text-slate-400 text-sm font-medium px-4 leading-relaxed">
                      {successMsg || 'Tu cuenta ya está asegurada con tu nueva clave. Ya puedes iniciar sesión nuevamente.'}
                   </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setViewState('login'); setSuccessMsg(''); }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-4 font-bold transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] cursor-pointer"
                >
                  Volver al Inicio
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
