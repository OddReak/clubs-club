import { useState } from 'react';
import { CcLogoSvg } from '../components/ui/CcLogo.jsx';
import { DAILY_QUOTES } from '../constants/index.js';

const quote = DAILY_QUOTES[Math.floor(Date.now() / 86400000) % DAILY_QUOTES.length];

export default function AuthPage({ login, register, showToast }) {
  const [mode, setMode]         = useState('welcome'); // welcome | login | register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    try {
      const email = `${username.toLowerCase().trim()}@clubsclub.app`;
      await login(email, password);
    } catch (err) {
      showToast(err.message === 'Invalid login credentials'
        ? 'Pseudo ou mot de passe incorrect' : err.message, 'error');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    if (username.trim().length < 3) { showToast('Pseudo trop court (min 3 caractères)', 'error'); return; }
    if (password.length < 6) { showToast('Mot de passe trop court (min 6 caractères)', 'error'); return; }
    setLoading(true);
    try {
      await register(username.trim(), password);
      showToast('Compte créé !', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    setLoading(false);
  };

  const switchMode = (m) => { setMode(m); setUsername(''); setPassword(''); };

  // ── Welcome screen ──
  if (mode === 'welcome') return (
    <div className="auth-bg">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <CcLogoSvg size={72} />
        </div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', marginBottom: 6 }}>
          Clubs Club
        </h1>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 32 }}>
          Suivi collaboratif
        </p>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.8, marginBottom: 32, fontStyle: 'italic' }}>
          {quote}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="cc-btn cc-btn-primary" style={{ width: '100%' }} onClick={() => switchMode('login')}>
            Se connecter
          </button>
          <button className="cc-btn cc-btn-secondary" style={{ width: '100%' }} onClick={() => switchMode('register')}>
            Créer un compte
          </button>
        </div>
      </div>
    </div>
  );

  const isLogin = mode === 'login';

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <CcLogoSvg size={48} />
        </div>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', marginBottom: 24, textAlign: 'center' }}>
          {isLogin ? 'Connexion' : 'Créer un compte'}
        </h2>

        <form onSubmit={isLogin ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="cc-label" style={{ marginBottom: 6 }}>Pseudo</div>
            <input
              className="cc-input"
              type="text"
              placeholder="ton_pseudo"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
            />
          </div>
          <div>
            <div className="cc-label" style={{ marginBottom: 6 }}>Mot de passe</div>
            <input
              className="cc-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          <button className="cc-btn cc-btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? '…' : isLogin ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: 'var(--muted)' }}>
            {isLogin ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
          </span>
          <button
            type="button"
            onClick={() => switchMode(isLogin ? 'register' : 'login')}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', padding: 0 }}
          >
            {isLogin ? "S'inscrire" : 'Se connecter'}
          </button>
        </div>

        <button
          onClick={() => switchMode('welcome')}
          style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: '0.58rem' }}
        >
          ← Retour
        </button>
      </div>
    </div>
  );
}
