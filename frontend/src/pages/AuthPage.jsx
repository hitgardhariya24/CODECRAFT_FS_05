import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', identifier: '' });
  const [avatar, setAvatar] = useState(null);
  const { login, register, forgotPassword } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (mode === 'login') {
        await login({ identifier: form.identifier, password: form.password });
        navigate('/');
        return;
      }
      if (mode === 'forgot') {
        await forgotPassword(form.email);
        return;
      }

      const payload = new FormData();
      payload.append('name', form.name);
      payload.append('username', form.username);
      payload.append('email', form.email);
      payload.append('password', form.password);
      if (avatar) payload.append('avatar', avatar);
      await register(payload);
      navigate('/');
    } catch (error) {
      // The toast stays readable and the form stays on the auth page.
      console.error(error);
    }
  };

  return (
    <div className="auth-page">
      <motion.section className="auth-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="auth-brand-hero">
          <div className="brand-mark brand-mark-large brand-mark-hero">X</div>
          <div className="auth-hero-copy">
            
            <h1>Xverse</h1>
            <p className="auth-lead">✨ Connect, share & explore your world with Xverse.</p>
          </div>
        </div>
      </motion.section>

      <motion.section className="auth-panel auth-card glass-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.05 }}>
        <div className="auth-card-header">
          <div className="eyebrow">Welcome back</div>
          <h2>{mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Log in with email'}</h2>
          <p>
            {mode === 'register'
              ? 'Join the platform and start building your network.'
              : mode === 'forgot'
                ? 'We’ll send password reset instructions to your email.'
                : 'Use your email and password to continue to your home feed and messages.'}
          </p>
        </div>

        <div className="mode-switcher" role="tablist" aria-label="Authentication mode">
          {['login', 'register', 'forgot'].map((item) => (
            <button key={item} className={mode === item ? 'switch-pill active' : 'switch-pill'} onClick={() => setMode(item)} type="button">
              {item === 'login' ? 'Log in' : item === 'register' ? 'Register' : 'Forgot password'}
            </button>
          ))}
        </div>

        <div className="social-login-row">
          <button type="button" className="social-login-btn social-login-btn-google" onClick={() => toast('Social sign-in is not connected yet')}>Continue with Google</button>
          <button type="button" className="social-login-btn social-login-btn-apple" onClick={() => toast('Social sign-in is not connected yet')}>Continue with Apple</button>
        </div>

        <div className="divider-row"><span>or continue with email</span></div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' ? <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" /> : null}
          {mode === 'register' ? <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Username" /> : null}
          {mode !== 'login' ? <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email address" /> : null}
          {mode === 'login' ? <input value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} placeholder="Email address" /> : null}
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Password" />
          {mode === 'register' ? <input type="file" accept="image/*" onChange={(event) => setAvatar(event.target.files?.[0] || null)} /> : null}
          <button className="primary-btn auth-submit" type="submit">
            {mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : 'Send reset email'}
          </button>
        </form>

        <div className="auth-footer">
          <span>By continuing, you agree to our community standards and privacy policy.</span>
          <Link to="/reset-password/demo-token" className="muted-link">Password reset demo</Link>
        </div>
      </motion.section>
    </div>
  );
}