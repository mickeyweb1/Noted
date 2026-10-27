import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, AudioLines, Eye, EyeOff, LockKeyhole, Mail, LoaderCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './authLayout';
import { ThemeToggle } from '../components/themeToggle';
import UnsplashCredit from '../components/UnsplashCredit';
import api from '../utils/api';
import { useUserContext } from '../context/userContext';
import { Button, Card, Input, Label } from '../components/ui/primitives';
import { toast } from '../components/ui/toastApi';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function getRememberedEmail() {
  try { return localStorage.getItem('rememberedLoginEmail') || ''; }
  catch { return ''; }
}

export default function LoginPage() {
  const { login } = useUserContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState(getRememberedEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(Boolean(getRememberedEmail()));
  const submissionLock = useRef(false);

  useEffect(() => {
    document.title = 'Login - Noted';
  }, []);

  useEffect(() => {
    setError('');
    setValidationErrors({ email: '', password: '' });
  }, [email, password]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loading || submissionLock.current) return;

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();
    const nextValidationErrors = {
      email: !normalizedEmail ? 'Enter your email address.' : !isValidEmail(normalizedEmail) ? 'Enter a valid email address.' : '',
      password: !trimmedPassword ? 'Enter your password.' : '',
    };
    setValidationErrors(nextValidationErrors);
    setError('');
    if (nextValidationErrors.email || nextValidationErrors.password) return;

    submissionLock.current = true;
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: normalizedEmail, password: trimmedPassword });
      const token = res.data?.token;
      const user = res.data?.user;
      if (!token || !user?.role) throw new Error('The server returned an incomplete login response.');

      if (rememberMe) localStorage.setItem('rememberedLoginEmail', normalizedEmail);
      else localStorage.removeItem('rememberedLoginEmail');

      // The shared context persists both legacy app keys and the requested token/user keys,
      // then updates Axios before the protected dashboard route mounts.
      login(user, token);
      toast.success('Welcome back!');
      if (user.role === 'school_admin' || user.role === 'super_admin' || user.role === 'teacher') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('[Auth] Login failed:', err.response?.data?.message || err.message);
      const message = err.response?.data?.message || 'Login failed. Check your network.';
      setError(message.toLowerCase().includes('invalid')
        ? 'Invalid email or password. Please try again.'
        : message);
    } finally {
      submissionLock.current = false;
      setLoading(false);
    }
  };

  const emailInvalid = Boolean(validationErrors.email);
  const passwordInvalid = Boolean(validationErrors.password);

  return (
    <AuthLayout>
      <div className="flex flex-1 flex-col p-5 sm:p-6 md:p-12">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden" aria-label="Noted home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground"><AudioLines className="h-5 w-5" aria-hidden="true" /></span>
            <span className="font-display text-xl font-bold text-foreground">Noted</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-4">
        <Card className="login-fade-in w-full overflow-hidden rounded-3xl border-border/80 p-0 shadow-soft">
          <div className="relative h-32 overflow-hidden bg-muted sm:h-36">
            <img
              src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=80"
              alt=""
              loading="lazy"
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/35 to-slate-950/10" aria-hidden="true" />
            <div className="absolute inset-0 flex items-center justify-between gap-3 px-5 sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">Noted</p>
                <p className="mt-1 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">study.butlouder</p>
              </div>
              <span className="hidden rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/90 min-[400px]:inline-flex">Your study space</span>
            </div>
            <UnsplashCredit className="absolute bottom-2 right-3 z-10 text-[10px] text-white/80 hover:text-white" />
          </div>

          <div className="p-6 sm:p-9">
          <div className="mb-8 text-center">
            <Link to="/" className="mx-auto mb-6 inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label="Noted home">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground"><AudioLines className="h-5 w-5" aria-hidden="true" /></span>
              <span className="font-display text-xl font-bold text-foreground">Noted</span>
            </Link>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">Login to continue studying</p>
          </div>

          <form onSubmit={handleLogin} noValidate className="space-y-5">
            {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{error}</p></div>}

            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="login-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@university.edu.ng" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus disabled={loading} aria-invalid={emailInvalid} aria-describedby={emailInvalid ? 'login-email-error' : undefined} className={`pl-10 ${emailInvalid ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
              </div>
              {emailInvalid && <p id="login-email-error" className="text-xs font-medium text-destructive">{validationErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="login-password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" disabled={loading} aria-invalid={passwordInvalid} aria-describedby={passwordInvalid ? 'login-password-error' : undefined} className={`pl-10 pr-12 ${passwordInvalid ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} disabled={loading} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {passwordInvalid && <p id="login-password-error" className="text-xs font-medium text-destructive">{validationErrors.password}</p>}
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2 text-muted-foreground">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-input accent-brand focus-visible:ring-2 focus-visible:ring-ring" />
                Remember me
              </label>
              <Link to="/forgot-password" className="font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Forgot password?</Link>
            </div>

            <Button type="submit" disabled={loading} className="group h-12 w-full bg-zinc-950 text-sm text-white shadow-sm hover:scale-[1.01] hover:bg-zinc-800 active:scale-[0.99] dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800">
              {loading ? <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Signing in…</> : <>Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></>}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">or continue with</span><span className="h-px flex-1 bg-border" /></div>

          <Button type="button" onClick={() => toast.info('Google sign-in is not set up yet.')} className="h-11 w-full border border-border bg-background text-sm text-foreground hover:bg-accent">
            <span className="font-display text-lg font-bold text-[#4285F4]" aria-hidden="true">G</span> Continue with Google
          </Button>

          <p className="mt-7 text-center text-sm text-muted-foreground">Don’t have an account? <Link to="/register" className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Sign up</Link></p>
          </div>
        </Card>
        </div>
      </div>
    </AuthLayout>
  );
}
