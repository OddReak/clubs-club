import { useState, useRef, useEffect } from 'react';
import { supabase, callFunction } from '../lib/supabase.js';
import { DARK_THEMES, LIGHT_THEMES } from '../constants/index.js';
import { IconX } from '../components/icons/index.jsx';
import { LoadingDots } from '../components/ui/index.jsx';

// ── Toggle switch ─────────────────────────────────────────────
const TOGGLE_CSS = `.toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.toggle-row-label{font-family:'DM Mono',monospace;font-size:.72rem;font-weight:700;color:var(--text)}.toggle-row-sub{font-family:'DM Mono',monospace;font-size:.58rem;color:var(--muted);margin-top:2px}.toggle-switch{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0;cursor:pointer}.toggle-switch input{opacity:0;width:0;height:0}.toggle-track{position:absolute;inset:0;border-radius:24px;background:var(--surface2);border:1px solid var(--border);transition:background .2s}.toggle-switch input:checked~.toggle-track{background:var(--accent);border-color:var(--accent)}.toggle-thumb{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}.toggle-switch input:checked~.toggle-thumb{transform:translateX(20px)}`;
if (typeof document !== 'undefined' && !document.getElementById('toggle-css')) {
  const s = document.createElement('style'); s.id = 'toggle-css'; s.textContent = TOGGLE_CSS; document.head.appendChild(s);
}

function ThemeSwatch({ t, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:8, border:`2px solid ${active ? t.accent : 'var(--border)'}`, background:'var(--surface2)', cursor:'pointer', transition:'all 0.18s', width:'100%', textAlign:'left' }}>
      <span style={{ width:14, height:14, borderRadius:'50%', background:t.accent, flexShrink:0, boxShadow:'0 0 0 2px rgba(0,0,0,0.15)' }} />
      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.65rem', color: active ? t.accent : 'var(--muted)', fontWeight:700 }}>{t.label}</span>
      {active && <span style={{ marginLeft:'auto', color:'var(--accent)' }}>✓</span>}
    </button>
  );
}

export default function SettingsModal({ onClose, currentUser, theme, saveTheme, libraryItems = [], setLibraryItems, showToast, updateAvatar }) {
  const [localTheme, setLocalTheme] = useState(theme);
  const [importSource, setImportSource] = useState('letterboxd');
  const [steamId, setSteamId]           = useState('');
  const [steamImportType, setSteamImportType] = useState('wishlist');
  const [importing, setImporting]       = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [importPct, setImportPct]       = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [notifPrefs, setNotifPrefs]     = useState({ comments:true, likes:true, followers:true, meetingCreated:true, meetingReminder:true });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef    = useRef();
  const csvRef     = useRef();

  useEffect(() => { setLocalTheme(theme); }, [theme]);

  useEffect(() => {
    if (!currentUser?.id) return;
    supabase.from('users').select('notif_prefs').eq('id', currentUser.id).single()
      .then(({ data }) => { if (data?.notif_prefs) setNotifPrefs(p => ({ ...p, ...data.notif_prefs })); });
  }, [currentUser?.id]);

  const update = (patch) => {
    const next = { ...localTheme, ...patch };
    setLocalTheme(next);
    saveTheme(next);
  };

  const saveNotifPrefs = async (prefs) => {
    setNotifPrefs(prefs);
    await supabase.from('users').update({ notif_prefs: prefs }).eq('id', currentUser.id).catch(() => {});
  };

  const handleAvatarChange = async (file) => {
    if (!file || !updateAvatar) return;
    setUploadingAvatar(true);
    try { await updateAvatar(file); showToast('Photo mise à jour !', 'success'); }
    catch (e) { showToast('Erreur: ' + e.message, 'error'); }
    setUploadingAvatar(false);
  };

  // ── CSV line parser ───────────────────────────────────────────
  const parseLine = (line) => {
    const cols = []; let cur = ''; let inQ = false;
    for (const c of line) {
      if (c === '"') inQ = !inQ;
      else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    cols.push(cur.trim()); return cols;
  };

  // ── Letterboxd CSV import ─────────────────────────────────────
  const handleLetterboxdImport = async (file) => {
    if (!file || !currentUser) return;
    setImporting(true); setImportResult(null); setImportProgress('Lecture…'); setImportPct(0);
    try {
      const text   = await file.text();
      const lines  = text.split('\n').filter(Boolean);
      const header = parseLine(lines[0]).map(h => h.replace(/"/g, '').toLowerCase());
      const nameIdx = header.indexOf('name'), yearIdx = header.indexOf('year'),
            ratingIdx = header.indexOf('rating'), watchedIdx = header.indexOf('watched date');
      const isWatchlist = ratingIdx < 0 && watchedIdx < 0;
      const rows = lines.slice(1).map(l => parseLine(l)).filter(r => r[nameIdx]);
      setImportProgress(`${rows.length} films — recherche TMDB…`);
      const existingIds = new Set(libraryItems.map(i => i.id));
      let added = 0, skipped = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const title = (row[nameIdx] || '').replace(/"/g, '').trim();
        const year  = (row[yearIdx]  || '').replace(/"/g, '').trim();
        const rawRating = parseFloat((row[ratingIdx] || '').replace(/"/g, ''));
        const rating = isNaN(rawRating) ? null : rawRating;
        const status = isWatchlist ? 'to_watch' : (watchedIdx >= 0 && row[watchedIdx]) ? 'watched' : ratingIdx >= 0 ? 'watched' : 'to_watch';
        if (!title) { skipped++; continue; }
        setImportProgress(`${i + 1}/${rows.length} — ${title}`); setImportPct(Math.round(((i+1)/rows.length)*100));
        try {
          const data = await callFunction('search-cinema', { q: title });
          const match = (data.results||[]).find(x => {
            const y = (x.release_date||x.first_air_date||'').slice(0,4);
            return (!year||y===year) && (x.media_type==='movie'||x.media_type==='tv');
          }) || (data.results||[])[0];
          if (!match) { skipped++; continue; }
          const itemId = 'tmdb_' + match.id;
          if (existingIds.has(itemId)) { skipped++; continue; }
          existingIds.add(itemId);
          await supabase.from('library_items').insert({
            user_id: currentUser.id, content_id: itemId, type:'cinema',
            title: match.title||match.name||title,
            cover: match.poster_path ? `https://image.tmdb.org/t/p/w342${match.poster_path}` : null,
            year: (match.release_date||match.first_air_date||'').slice(0,4),
            synopsis: match.overview||null, media_type: match.media_type||'movie', status,
            my_review: rating ? { score: Math.round(rating*2), text:'', isFavorite:false } : null,
          });
          added++;
        } catch { skipped++; }
      }
      setImportResult({ added, skipped, total: rows.length });
      setImportProgress(''); setImportPct(0);
      showToast(added > 0 ? `${added} films importés !` : 'Tous déjà présents', added > 0 ? 'success' : 'info');
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); setImportProgress(''); }
    setImporting(false);
  };

  const NOTIF = [
    { key:'comments',       label:'Commentaires',     sub:"Quand quelqu'un commente ta critique" },
    { key:'likes',          label:'Likes',            sub:"Quand quelqu'un like ta critique" },
    { key:'followers',      label:'Nouveaux abonnés', sub:"Quand quelqu'un commence à te suivre" },
    { key:'meetingCreated', label:'Réunion planifiée',sub:'Quand une date de réunion est fixée' },
    { key:'meetingReminder',label:'Rappel de réunion',sub:"La veille d'une réunion à 9h" },
  ];

  return (
    <div className="cc-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal fade-in" style={{ maxWidth:500 }}>
        <div className="cc-modal-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:16 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.1rem', fontWeight:800 }}>Réglages</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)' }}><IconX size={18}/></button>
        </div>
        <div className="cc-modal-body" style={{ display:'flex', flexDirection:'column', gap:24 }}>

          {/* Mode toggle */}
          <div>
            <div className="cc-label" style={{ marginBottom:10 }}>Mode</div>
            <div className="inprog-toggle">
              <button className={`inprog-toggle-btn ${localTheme.mode==='dark'&&!localTheme.syncWithSystem?'active':''}`} onClick={() => update({ mode:'dark', syncWithSystem:false })}>Sombre</button>
              <button className={`inprog-toggle-btn ${localTheme.mode==='light'&&!localTheme.syncWithSystem?'active':''}`} onClick={() => update({ mode:'light', syncWithSystem:false })}>Clair</button>
              <button className={`inprog-toggle-btn ${localTheme.syncWithSystem?'active':''}`} onClick={() => update({ syncWithSystem:true, mode: window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light' })}>Système</button>
            </div>
          </div>

          {/* Dark themes */}
          <div>
            <div className="cc-label" style={{ marginBottom:10 }}>Thème sombre</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {DARK_THEMES.map(t => <ThemeSwatch key={t.id} t={t} active={localTheme.dark===t.id} onClick={() => update({ dark:t.id, mode:'dark', syncWithSystem:false })} />)}
            </div>
          </div>

          {/* Light themes */}
          <div>
            <div className="cc-label" style={{ marginBottom:10 }}>Thème clair</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {LIGHT_THEMES.map(t => <ThemeSwatch key={t.id} t={t} active={localTheme.light===t.id} onClick={() => update({ light:t.id, mode:'light', syncWithSystem:false })} />)}
            </div>
          </div>

          {/* Avatar */}
          {updateAvatar && (
            <div style={{ paddingTop:8, borderTop:'1px solid var(--border)' }}>
              <div className="cc-label" style={{ marginBottom:10 }}>Photo de profil</div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleAvatarChange(e.target.files[0])} />
              <button className="cc-btn cc-btn-secondary cc-btn-sm" disabled={uploadingAvatar} onClick={() => fileRef.current?.click()}>
                {uploadingAvatar ? '…' : 'Changer la photo'}
              </button>
            </div>
          )}

          {/* Import */}
          <div style={{ paddingTop:8, borderTop:'1px solid var(--border)' }}>
            <div className="cc-label" style={{ marginBottom:10 }}>Import</div>
            <div className="inprog-toggle" style={{ marginBottom:14 }}>
              <button className={`inprog-toggle-btn ${importSource==='letterboxd'?'active':''}`} onClick={() => setImportSource('letterboxd')}>Letterboxd</button>
              <button className={`inprog-toggle-btn ${importSource==='steam'?'active':''}`} onClick={() => setImportSource('steam')}>Steam</button>
            </div>
            {importSource === 'letterboxd' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <p style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.6rem', color:'var(--muted)', lineHeight:1.7 }}>Exporte depuis Letterboxd (Profil → Importer/Exporter) puis importe le CSV ici.</p>
                <input ref={csvRef} type="file" accept=".csv" style={{ display:'none' }} onChange={e => handleLetterboxdImport(e.target.files[0])} />
                <button className="cc-btn cc-btn-secondary cc-btn-sm" disabled={importing} onClick={() => csvRef.current?.click()}>{importing ? '…' : 'Choisir un fichier CSV'}</button>
              </div>
            )}
            {importSource === 'steam' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div><div className="cc-label" style={{ marginBottom:6 }}>Steam ID ou URL de profil</div><input className="cc-input" value={steamId} onChange={e => setSteamId(e.target.value)} placeholder="76561198…" /></div>
                <div className="inprog-toggle">
                  <button className={`inprog-toggle-btn ${steamImportType==='wishlist'?'active':''}`} onClick={() => setSteamImportType('wishlist')}>Wishlist</button>
                  <button className={`inprog-toggle-btn ${steamImportType==='library'?'active':''}`} onClick={() => setSteamImportType('library')}>Bibliothèque</button>
                </div>
                <button className="cc-btn cc-btn-primary cc-btn-sm" disabled={importing||!steamId.trim()}>Importer</button>
              </div>
            )}
            {importing && <div style={{ marginTop:10, fontFamily:"'DM Mono',monospace", fontSize:'0.6rem', color:'var(--accent)' }}>{importProgress}</div>}
            {importResult && (
              <div style={{ marginTop:10, padding:'10px 12px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', fontFamily:"'DM Mono',monospace", fontSize:'0.62rem', color:'var(--muted)' }}>
                <strong style={{ color:'var(--accent)' }}>{importResult.added}</strong> ajouté{importResult.added!==1?'s':''} · <strong>{importResult.skipped}</strong> ignoré{importResult.skipped!==1?'s':''} · {importResult.total} total
              </div>
            )}
          </div>

          {/* Notifications */}
          <div style={{ paddingTop:8, borderTop:'1px solid var(--border)' }}>
            <div className="cc-label" style={{ marginBottom:10 }}>Notifications</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {NOTIF.map(({ key, label, sub }) => (
                <div key={key} className="toggle-row" style={{ padding:'8px 12px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
                  <div><div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.65rem', color:'var(--text)', fontWeight:600 }}>{label}</div><div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.55rem', color:'var(--muted)', marginTop:1 }}>{sub}</div></div>
                  <label className="toggle-switch" style={{ transform:'scale(0.85)', transformOrigin:'right center' }}>
                    <input type="checkbox" checked={notifPrefs[key]!==false} onChange={e => saveNotifPrefs({ ...notifPrefs, [key]:e.target.checked })} />
                    <div className="toggle-track"/><div className="toggle-thumb"/>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Account info */}
          <div style={{ paddingTop:8, borderTop:'1px solid var(--border)' }}>
            <div className="cc-label" style={{ marginBottom:6 }}>Compte</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.65rem', color:'var(--muted)' }}>
              Connecté en tant que <strong style={{ color:'var(--text)' }}>{currentUser?.username}</strong>
            </div>
          </div>

          <button className="cc-btn cc-btn-secondary" style={{ width:'100%' }} onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
