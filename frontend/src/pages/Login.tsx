import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import logoImage from '../assets/LogoIMPERIO.webp';
import { useToast } from '../context/ToastContext';
import SideRays from '../components/effects/SideRays';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import { User, Lock, MailCheck, KeyRound, Check, ArrowLeft } from 'lucide-react';

const ViewTransition = {
  initial: { opacity: 0, y: 24, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -24, filter: 'blur(8px)' },
  transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
};

const ShakeAnimation = {
  animate: { x: [-12, 12, -8, 8, -4, 4, 0] },
  transition: { duration: 0.5 },
};

const Login = () => {
  const { showToast } = useToast();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [_error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState('login');
  const [successMsg, setSuccessMsg] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const { login } = useAuth();

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [shake, setShake] = useState(false);
  const triggerError = (msg: string) => {
    showToast(msg, 'error');
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !password) return;

    setLoading(true);
    setError('');

    try {
      const data = await login({ usuario, password });

      if (data.success) {
        navigate('/');
      } else {
        triggerError('Credenciales incorrectas o usuario no encontrado.');
      }
    } catch {
      triggerError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (data.success) {
        setViewState('recover_code');
        setSuccessMsg('Te hemos enviado un código de seguridad.');
        setResendCooldown(30);
        setError('');
      }
    } catch (err: any) {
      triggerError(err.message || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !newPassword) return;
    if (newPassword !== confirmPassword) {
      triggerError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code: codigo, newPassword }),
      });
      if (data.success) {
        setSuccessMsg('');
        setViewState('success');
        showToast('Contraseña actualizada con éxito', 'success');
      }
    } catch (err: any) {
      setCodigo('');
      triggerError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = useCallback(async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setCodigo('');
      setResendCooldown(30);
      showToast('Te hemos enviado un nuevo código.', 'success');
    } catch (err: any) {
      triggerError(err.message || 'Error al reenviar el código');
    } finally {
      setLoading(false);
    }
  }, [email, resendCooldown, loading, showToast, triggerError]);

  const maskEmail = (e: string): string => {
    const [user, domain] = e.split('@');
    if (!domain) return e;
    const maskedUser = user.length > 2 ? user[0] + '***' + user[user.length - 1] : user[0] + '***';
    return `${maskedUser}@${domain}`;
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (viewState !== 'success') return;
    const timer = setTimeout(() => {
      setViewState('login');
      setSuccessMsg('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [viewState]);

  const getPasswordStrength = (pw: string): { level: number; label: string; color: string } => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 2) return { level: 1, label: 'Débil', color: '#f43f5e' };
    if (score <= 3) return { level: 2, label: 'Media', color: '#f59e0b' };
    if (score <= 4) return { level: 3, label: 'Fuerte', color: '#10b981' };
    return { level: 4, label: 'Muy fuerte', color: '#34d399' };
  };

  const pwStrength = getPasswordStrength(newPassword);

  const titleText = 'Control de Equipos';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: "'Outfit', sans-serif",
        bgcolor: '#000000',
        position: 'relative',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* FULL-SCREEN SideRays BACKGROUND */}
      <SideRays
        speed={2.5}
        rayColor1="#06B6D4"
        rayColor2="#ffffff"
        intensity={2}
        spread={2}
        origin="top-left"
        tilt={0}
        saturation={1.5}
        blend={0.75}
        falloff={1.6}
        opacity={1}
      />

      {/* CENTERED CONTENT */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'safe center',
          width: '100%',
          maxWidth: { xs: '100%', sm: 420 },
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          minHeight: '100vh',
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 120 }}
          style={{ marginBottom: 12 }}
        >
          <Box
            component="img"
            src={logoImage}
            alt="Logo Control de Equipos"
            sx={{
              height: { xs: 80, sm: 100 },
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 20px rgba(6,182,212,0.3))',
            }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </motion.div>

        {/* Animated Title */}
        <Box sx={{ mb: { xs: 2, sm: 3 }, textAlign: 'center' }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 900,
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.6rem', sm: '2rem' },
            }}
          >
            {titleText.split('').map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  delay: 0.3 + i * 0.04,
                  duration: 0.5,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  display: 'inline-block',
                  color: '#f1f5f9',
                  textShadow: '0 0 30px rgba(6,182,212,0.4), 0 0 60px rgba(6,182,212,0.15)',
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </Typography>
        </Box>

        {/* Form Card */}
        <Card
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              px: { xs: 2.5, sm: 4 },
              py: { xs: 2.5, sm: 3.5 },
            }}
          >
            {/* Bienvenido header */}
            {viewState === 'login' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center', mb: 0.5 }}>
                  Bienvenido
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: { xs: 2, sm: 3 } }}>
                  Ingresa tus credenciales para acceder
                </Typography>
              </motion.div>
            )}

            {/* Stepper */}
            {viewState !== 'login' && viewState !== 'success' && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: { xs: 2, sm: 4 }, mt: 1 }}>
                {[1, 2].map((step) => {
                  const isActive =
                    (viewState === 'recover_email' && step === 1) ||
                    (viewState === 'recover_code' && step === 2);
                  const isCompleted = viewState === 'recover_code' && step === 1;

                  return (
                    <React.Fragment key={step}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: '2px solid',
                          ...(isActive
                            ? {
                                bgcolor: '#4f46e5',
                                borderColor: '#6366f1',
                                color: '#ffffff',
                                boxShadow: '0 0 20px rgba(79,70,229,0.5)',
                                transform: 'scale(1.1)',
                              }
                            : isCompleted
                            ? {
                                bgcolor: '#10b981',
                                borderColor: '#34d399',
                                color: '#ffffff',
                              }
                            : {
                                bgcolor: 'rgba(255,255,255,0.05)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                color: '#64748b',
                                opacity: 0.5,
                              }),
                        }}
                      >
                        {isCompleted ? (
                          <Check size={18} />
                        ) : (
                          step
                        )}
                      </Box>
                      {step === 1 && (
                        <Box
                          sx={{
                            width: 48,
                            height: 4,
                            borderRadius: 2,
                            mx: 1,
                            transition: 'all 0.7s ease',
                            bgcolor: isCompleted ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.05)',
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <AnimatePresence mode="wait">
                {/* ===== LOGIN VIEW ===== */}
                {viewState === 'login' && (
                  <motion.form
                    key="login-form"
                    initial={ViewTransition.initial}
                    animate={
                      shake
                        ? { ...ShakeAnimation.animate, opacity: 1 }
                        : ViewTransition.animate
                    }
                    exit={ViewTransition.exit}
                    transition={shake ? ShakeAnimation.transition : ViewTransition.transition}
                    onSubmit={handleLogin}
                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                  >
                    <TextField
                      fullWidth
                      label="Usuario"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      autoComplete="username"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <User size={20} style={{ color: '#94a3b8' }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Contraseña"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock size={20} style={{ color: '#94a3b8' }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    {/* Remember me + forgot password */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: -0.5 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            size="small"
                          />
                        }
                        label="Recordarme"
                      />
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => {
                          setError('');
                          setSuccessMsg('');
                          setViewState('recover_email');
                        }}
                        sx={{ fontSize: '0.813rem' }}
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </Box>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={loading}
                      sx={{ mt: 1 }}
                    >
                      <AnimatePresence mode="wait">
                        {loading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                          >
                            <CircularProgress size={22} sx={{ color: 'white' }} />
                          </motion.div>
                        ) : (
                          <motion.span
                            key="text"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                          >
                            Iniciar Sesión
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  </motion.form>
                )}

                {/* ===== RECOVER EMAIL VIEW ===== */}
                {viewState === 'recover_email' && (
                  <motion.form
                    key="recover-email-form"
                    initial={{ opacity: 0, x: 50, filter: 'blur(5px)' }}
                    animate={
                      shake
                        ? { ...ShakeAnimation.animate, opacity: 1, filter: 'blur(0px)' }
                        : { x: 0, opacity: 1, filter: 'blur(0px)' }
                    }
                    exit={{ opacity: 0, x: -50, filter: 'blur(5px)' }}
                    transition={shake ? ShakeAnimation.transition : ViewTransition.transition}
                    onSubmit={handleRecoverEmail}
                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                  >
                    <TextField
                      fullWidth
                      label="Correo electrónico"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <MailCheck size={20} style={{ color: '#94a3b8' }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={loading}
                    >
                      <AnimatePresence mode="wait">
                        {loading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <CircularProgress size={22} sx={{ color: 'white' }} />
                          </motion.div>
                        ) : (
                          <motion.span
                            key="text"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            Recibir código
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>

                    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => {
                          setError('');
                          setSuccessMsg('');
                          setViewState('login');
                        }}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.813rem' }}
                      >
                        <ArrowLeft size={14} />
                        Volver al Inicio de Sesión
                      </Link>
                    </Box>
                  </motion.form>
                )}

                {/* ===== RECOVER CODE + NEW PASSWORD VIEW ===== */}
                {viewState === 'recover_code' && (
                  <motion.form
                    key="recover-code-form"
                    initial={{ opacity: 0, x: 50, filter: 'blur(5px)' }}
                    animate={
                      shake
                        ? { ...ShakeAnimation.animate, opacity: 1, filter: 'blur(0px)' }
                        : { x: 0, opacity: 1, filter: 'blur(0px)' }
                    }
                    exit={{ opacity: 0, x: -50, filter: 'blur(5px)' }}
                    transition={shake ? ShakeAnimation.transition : ViewTransition.transition}
                    onSubmit={handleResetPassword}
                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: -1, fontSize: '0.813rem' }}>
                      Código enviado a <Box component="span" sx={{ color: '#818cf8', fontWeight: 600 }}>{maskEmail(email)}</Box>
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      {/* Code inputs */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: { xs: 0.5, sm: 1 }, px: { xs: 0.2, sm: 0.5 } }}>
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <TextField
                            key={index}
                            inputRef={(el: HTMLInputElement | null) => {
                              inputRefs.current[index] = el;
                            }}
                            slotProps={{
                              input: {
                                inputProps: {
                                  maxLength: 1,
                                  inputMode: 'numeric',
                                  style: {
                                    textAlign: 'center',
                                    fontSize: '1.25rem',
                                    fontWeight: 900,
                                    padding: '14px 0',
                                  },
                                },
                              },
                            }}
                            sx={{
                              width: { xs: 40, sm: 48 },
                              '& .MuiOutlinedInput-root': {
                                borderRadius: { xs: '12px', sm: '16px' },
                                bgcolor: codigo[index]
                                  ? 'rgba(79,70,229,0.1)'
                                  : 'rgba(255,255,255,0.05)',
                                '& fieldset': {
                                  borderColor: codigo[index]
                                    ? 'rgba(99,102,241,0.5)'
                                    : 'rgba(255,255,255,0.1)',
                                },
                                '&:hover fieldset': {
                                  borderColor: 'rgba(129,140,248,0.5)',
                                },
                                '&.Mui-focused': {
                                  boxShadow: '0 0 0 2px rgba(99,102,241,0.2)',
                                  '& fieldset': {
                                    borderColor: '#818cf8',
                                  },
                                },
                              },
                            }}
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
                          />
                        ))}
                      </Box>

                      {/* New password */}
                      <TextField
                        fullWidth
                        label="Nueva contraseña"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <KeyRound size={20} style={{ color: '#94a3b8' }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />

                      {/* Password strength bar */}
                      {newPassword && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                        >
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {[1, 2, 3, 4].map((i) => (
                              <Box
                                key={i}
                                sx={{
                                  height: 5,
                                  flex: 1,
                                  borderRadius: 3,
                                  transition: 'all 0.5s ease',
                                  bgcolor: i <= pwStrength.level ? pwStrength.color : 'rgba(255,255,255,0.05)',
                                }}
                              />
                            ))}
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              color: pwStrength.level <= 1
                                ? '#fb7185'
                                : pwStrength.level <= 2
                                ? '#fbbf24'
                                : '#34d399',
                            }}
                          >
                            {pwStrength.label}
                          </Typography>
                        </motion.div>
                      )}

                      {/* Confirm password */}
                      <TextField
                        fullWidth
                        label="Confirmar contraseña"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={confirmPassword.length > 0 && confirmPassword !== newPassword}
                        helperText={
                          confirmPassword.length > 0 && confirmPassword !== newPassword
                            ? 'Las contraseñas no coinciden'
                            : ''
                        }
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <KeyRound size={20} style={{ color: '#94a3b8' }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Box>

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={loading}
                    >
                      <AnimatePresence mode="wait">
                        {loading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <CircularProgress size={22} sx={{ color: 'white' }} />
                          </motion.div>
                        ) : (
                          <motion.span
                            key="text"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            Establecer nueva contraseña
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5, pt: 1 }}>
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => {
                          setError('');
                          setSuccessMsg('');
                          setViewState('login');
                        }}
                        sx={{ fontSize: '0.813rem' }}
                      >
                        Cancelar
                      </Link>
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={handleResendCode}
                        sx={{
                          fontSize: '0.813rem',
                          color: resendCooldown > 0 ? '#64748b' : '#818cf8',
                          pointerEvents: resendCooldown > 0 ? 'none' : 'auto',
                        }}
                      >
                        {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : 'Reenviar código'}
                      </Link>
                    </Box>
                  </motion.form>
                )}

                {/* ===== SUCCESS VIEW ===== */}
                {viewState === 'success' && (
                  <motion.div
                    key="success-view"
                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 24 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.2, 1] }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        style={{
                          position: 'relative',
                          zIndex: 10,
                        }}
                      >
                        <Box
                          sx={{
                            width: 96,
                            height: 96,
                            borderRadius: '50%',
                            bgcolor: 'rgba(16,185,129,0.2)',
                            border: '1px solid rgba(16,185,129,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={48} style={{ color: '#34d399' }} />
                        </Box>
                      </motion.div>
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(16,185,129,0.1)',
                          borderRadius: '50%',
                          filter: 'blur(20px)',
                        }}
                      />
                    </Box>

                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, px: 2, lineHeight: 1.6 }}>
                        {successMsg || 'Tu cuenta ya está asegurada con tu nueva clave. Ya puedes iniciar sesión nuevamente.'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                        Redirigiendo al inicio en 3s...
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={() => {
                        setViewState('login');
                        setSuccessMsg('');
                      }}
                      sx={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 10px 30px rgba(16,185,129,0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                          boxShadow: '0 12px 35px rgba(16,185,129,0.4)',
                        },
                      }}
                    >
                      Volver al Inicio
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Login;
