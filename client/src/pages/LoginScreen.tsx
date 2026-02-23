import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Mail, Lock, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MercotraceIcon } from '@/components/MercotraceLogo';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
const loginBg = '/login-bg.webp';

// Pre-compute particle positions to avoid re-render jitter
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: `${10 + (i * 8.3) % 85}%`,
  top: `${5 + (i * 13.7) % 85}%`,
  delay: (i * 0.4) % 2,
}));

const LoginScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { login, isLoading, error, clearError } = useAuth();

  const [touched, setTouched] = useState({ email: false, password: false });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailError = touched.email && !emailRegex.test(email) ? (email ? 'Enter a valid email address' : 'Email is required') : '';
  const passwordError = touched.password && !password ? 'Password is required' : touched.password && password.length < 6 ? 'Password must be at least 6 characters' : '';
  const isValid = emailRegex.test(email) && password.length >= 6;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) return;
    try {
      await login(email, password);
      navigate('/home', { replace: true });
    } catch {
      // error is set in context
    }
  };

  return (
    <div className="h-[100dvh] relative overflow-hidden flex flex-col" role="presentation">
      {/* Background image — WebP, preloaded, high priority */}
      <img
        src={loginBg}
        alt=""
        role="presentation"
        className="absolute inset-0 w-full h-full object-cover z-0"
        fetchPriority="high"
        decoding="async"
        width={1920}
        height={1080}
      />
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-800/60 to-violet-900/70 z-[1]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(91,140,255,0.25)_0%,transparent_50%)] z-[1]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(123,97,255,0.3)_0%,transparent_40%)] z-[1]" />

      {/* Particles — reduced count, deterministic positions */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]" aria-hidden="true">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute w-1.5 h-1.5 bg-white/25 rounded-full"
            style={{ left: p.left, top: p.top }}
            animate={{ y: [-15, 15], opacity: [0.15, 0.5, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, delay: p.delay }}
          />
        ))}
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left side — Branding (desktop only) */}
        <div className="hidden lg:flex lg:w-[55%] items-end p-12">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <MercotraceIcon size={32} color="white" className="drop-shadow-lg" />
              </div>
              <span className="text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">Mercotrace</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight drop-shadow-lg mb-3">
              Smart Commodity<br />Trading Platform
            </h1>
            <p className="text-white/70 text-lg max-w-md">
              Digitize your mandi operations — arrivals, auctions, billing & settlements in one place.
            </p>
          </motion.div>
        </div>

        {/* Right side — Login form */}
        <main className="flex-1 flex flex-col min-h-0">
          {/* Theme Toggle */}
          <div className="flex justify-end px-5 pt-[max(1rem,env(safe-area-inset-top))]">
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 border border-white/20"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {/* Logo */}
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }} className="relative mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20">
                <MercotraceIcon size={44} color="white" className="drop-shadow-lg" />
              </div>
              <motion.div className="absolute inset-0 rounded-2xl border-2 border-white/30" animate={{ scale: [1, 1.2], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} aria-hidden="true" />
            </motion.div>

            {/* Mobile-only heading (h1 for SEO on mobile since desktop h1 is hidden) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center mb-6">
              <h1 className="lg:hidden text-2xl sm:text-3xl font-bold text-white mb-1 drop-shadow-lg">Welcome Back</h1>
              <h2 className="hidden lg:block text-2xl sm:text-3xl font-bold text-white mb-1 drop-shadow-lg">Welcome Back</h2>
              <p className="text-white/70 text-sm sm:text-base">Sign in to continue to Mercotrace</p>
            </motion.div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} role="alert" className="w-full max-w-sm mb-4 p-3 rounded-xl bg-red-500/20 border border-red-400/30 backdrop-blur-sm">
                <p className="text-sm text-white text-center">{error}</p>
              </motion.div>
            )}

            <motion.form
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-sm space-y-4"
              onSubmit={handleLogin}
              aria-label="Sign in form"
            >
              <div>
                <label htmlFor="login-email" className="sr-only">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-800/50" aria-hidden="true" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Email address"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    onBlur={() => setTouched(p => ({ ...p, email: true }))}
                    className="pl-12 h-12 sm:h-14 text-base sm:text-lg rounded-xl bg-white/90 border-0 text-blue-900 placeholder:text-blue-400"
                    required
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'email-error' : undefined}
                  />
                </div>
                {emailError && <p id="email-error" className="text-xs text-red-200 mt-1 ml-1" role="alert">{emailError}</p>}
              </div>
              <div>
                <label htmlFor="login-password" className="sr-only">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-800/50" aria-hidden="true" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    onBlur={() => setTouched(p => ({ ...p, password: true }))}
                    className="pl-12 pr-14 h-12 sm:h-14 text-base sm:text-lg rounded-xl bg-white/90 border-0 text-blue-900 placeholder:text-blue-400"
                    required
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-blue-800/50 rounded-lg"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordError && <p id="password-error" className="text-xs text-red-200 mt-1 ml-1" role="alert">{passwordError}</p>}
              </div>
              <div className="flex justify-end">
                <button type="button" className="text-sm text-white font-medium underline min-h-[44px] flex items-center">Forgot password?</button>
              </div>
              <Button type="submit" disabled={isLoading || !isValid} className="w-full h-12 sm:h-14 rounded-xl text-base sm:text-lg font-semibold bg-white text-blue-600 hover:bg-white/90 shadow-xl disabled:opacity-70">
                {isLoading ? (
                  <motion.div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} aria-label="Loading" />
                ) : (
                  <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </motion.form>
          </div>

          <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shrink-0">
            <p className="text-sm text-white/70">
              Don't have an account?{' '}
              <button onClick={() => navigate('/register')} className="text-white font-semibold underline min-h-[44px]">Sign Up</button>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginScreen;