import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase.js';

// ── Loading dots ──────────────────────────────────────────────
export const LoadingDots = () => (
  <div className="loading-dots"><span/><span/><span/></div>
);

// ── Toast ─────────────────────────────────────────────────────
export const Toast = ({ toast }) => {
  if (!toast.show) return null;
  const cls = toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-info';
  return (
    <div className={`toast ${cls}`}>
      {toast.type === 'error' ? '⚠' : toast.type === 'success' ? '✓' : 'ℹ'} {toast.message}
    </div>
  );
};

// ── Gradient cover fallback ───────────────────────────────────
function gradientCover(title = '') {
  const h = [...title].reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0);
  const hue = Math.abs(h) % 360;
  return `linear-gradient(135deg, hsl(${hue},40%,20%) 0%, hsl(${(hue+60)%360},50%,30%) 100%)`;
}

// ── CoverImage — universal cover renderer ────────────────────
export const CoverImage = ({ item, style = {} }) => {
  const [broken, setBroken] = useState(false);
  if (!item.cover || broken) {
    const initials = (item.title || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return (
      <div style={{ width:'100%', height:'100%', background: gradientCover(item.title),
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, ...style }}>
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.6rem', color:'rgba(255,255,255,0.55)', letterSpacing:'0.04em' }}>{initials}</span>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.52rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase', textAlign:'center', padding:'0 10px', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>{item.title}</span>
      </div>
    );
  }
  return (
    <img src={item.cover} alt={item.title} loading="lazy"
      onError={() => setBroken(true)}
      style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', ...style }} />
  );
};

// ── Hi-res cover URL for detail hero ─────────────────────────
export function getHiResCover(item) {
  const url = item.cover || '';
  if (item.type === 'games') {
    return url.replace('t_thumb','t_cover_big_2x').replace('t_cover_small','t_cover_big_2x').replace('t_cover_big','t_cover_big_2x');
  }
  if (item.type === 'cinema') {
    return url.replace('/w342/', '/w780/').replace('/w185/', '/w780/');
  }
  return url;
}

// ── CoverCard ─────────────────────────────────────────────────
export const CoverCard = ({ item, onClick, showStatus = true }) => (
  <div className="cover-card fade-in" onClick={onClick}>
    <div className="cover-wrap" style={{ aspectRatio: item.type === 'music' ? '1/1' : '2/3' }}>
      <CoverImage item={item} />
      {showStatus && item.status && (
        <div className="cover-badge">{item.status.slice(0, 8)}</div>
      )}
    </div>
    <div className="cover-title">{item.title}</div>
    <div className="cover-sub">
      {item.type === 'books' ? (item.author || '') :
       item.type === 'music' ? [item.artist, item.year].filter(Boolean).join(' · ') :
       (item.year || item.artist || '')}
    </div>
  </div>
);

// ── UserAvatar — cached avatar fetch ─────────────────────────
const _avatarCache = {};
const _avatarPending = {};

export const UserAvatar = ({ username, size = 28, style = {} }) => {
  const [url, setUrl] = useState(() => _avatarCache[username] || null);

  useEffect(() => {
    if (!username || _avatarCache[username]) { if (_avatarCache[username]) setUrl(_avatarCache[username]); return; }
    if (_avatarPending[username]) { _avatarPending[username].then(u => setUrl(u)); return; }
    _avatarPending[username] = supabase.from('users').select('avatar_url').eq('username', username).single()
      .then(({ data }) => {
        const u = data?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        _avatarCache[username] = u;
        setUrl(u);
        return u;
      });
  }, [username]);

  const src = url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: 'var(--surface2)', flexShrink: 0, ...style }}>
      <img src={src} alt={username} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
    </div>
  );
};

// ── Spoiler text ──────────────────────────────────────────────
export const SpoilerText = ({ text, style = {} }) => {
  const [revealed, setRevealed] = useState(false);
  if (!text) return null;
  return (
    <span onClick={() => setRevealed(r => !r)} style={{ cursor:'pointer', borderRadius:3, padding:'0 4px',
      background: revealed ? 'transparent' : 'var(--muted)', color: revealed ? 'inherit' : 'transparent',
      transition:'all 0.2s', userSelect: revealed ? 'auto' : 'none', ...style }}>
      {text}
    </span>
  );
};

// ── Countdown timer ───────────────────────────────────────────
export const Countdown = ({ meetingDate, meetingTime }) => {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!meetingDate) return;
    const tick = () => {
      const timeStr = meetingTime || '00:00';
      const target  = new Date(`${meetingDate}T${timeStr}:00`);
      const diff    = target - Date.now();
      if (diff <= 0) { setLabel('En cours'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(d > 0 ? `J-${d}` : h > 0 ? `${h}h${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [meetingDate, meetingTime]);
  if (!label) return null;
  return (
    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.62rem', fontWeight:700,
      color:'var(--accent)', background:'color-mix(in srgb, var(--accent) 12%, var(--surface2))',
      border:'1px solid var(--accent)', borderRadius:4, padding:'2px 7px', letterSpacing:'0.08em' }}>
      {label}
    </span>
  );
};

// ── Confirm modal ─────────────────────────────────────────────
export const ConfirmModal = ({ title, message, onConfirm, onCancel, danger = true }) => (
  <div className="cc-modal-bg" onClick={e => e.target === e.currentTarget && onCancel()}>
    <div className="cc-modal fade-in" style={{ maxWidth: 380 }}>
      <div className="cc-modal-header">
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.1rem', fontWeight:800, lineHeight:1.3 }}>{title}</h2>
        {message && <p style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.62rem', marginTop:8, lineHeight:1.7, color:'var(--muted)' }}>{message}</p>}
      </div>
      <div className="cc-modal-body" style={{ display:'flex', gap:8 }}>
        <button className="cc-btn cc-btn-secondary" style={{ flex:1 }} onClick={onCancel}>Annuler</button>
        <button className={`cc-btn ${danger ? 'cc-btn-danger' : 'cc-btn-primary'}`} style={{ flex:1 }} onClick={onConfirm}>Confirmer</button>
      </div>
    </div>
  </div>
);

// ── External links ────────────────────────────────────────────
const EXT_BTN = (href, label, bg, border, color) =>
  href ? <a href={href} target="_blank" rel="noreferrer"
    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8,
      background:bg, border:`1px solid ${border}`, color, fontFamily:"'DM Mono',monospace",
      fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.06em', textDecoration:'none',
      transition:'opacity 0.18s', flexShrink:0 }}
    onMouseOver={e=>e.currentTarget.style.opacity='0.8'}
    onMouseOut={e=>e.currentTarget.style.opacity='1'}>{label}</a> : null;

export const ExternalLinks = ({ item }) => {
  const links = [];
  const t = item.type;
  if (t === 'games') {
    if (item.id?.startsWith('steam_') || item.steam_appid) {
      const appid = item.steam_appid || item.id.replace('steam_','');
      links.push(EXT_BTN(`https://store.steampowered.com/app/${appid}`,'Steam','#1b2838','#1b2838','#c6d4df'));
    }
    if (item.id?.startsWith('igdb_')) links.push(EXT_BTN(`https://www.igdb.com/search?q=${encodeURIComponent(item.title)}`,'IGDB','transparent','var(--border)','var(--muted)'));
  }
  if (t === 'cinema') {
    const tmdbId = item.id?.replace('tmdb_','');
    if (tmdbId) links.push(EXT_BTN(`https://www.themoviedb.org/${item.mediaType==='tv'?'tv':'movie'}/${tmdbId}`,'TMDB','#032541','#032541','#01b4e4'));
  }
  if (t === 'music') links.push(EXT_BTN(`https://music.apple.com/search?term=${encodeURIComponent(item.title+' '+item.artist)}`,'Apple Music','transparent','var(--border)','var(--muted)'));
  if (t === 'books') links.push(EXT_BTN(`https://hardcover.app/search?query=${encodeURIComponent(item.title)}`,'Hardcover','transparent','var(--border)','var(--muted)'));
  if (!links.length) return null;
  return <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>{links}</div>;
};
