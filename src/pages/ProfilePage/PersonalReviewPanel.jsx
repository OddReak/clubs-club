import { useState } from 'react';
import { CoverImage, getHiResCover, SpoilerText } from '../../components/ui/index.jsx';
import { LIBRARY_CATS, REVIEWABLE_STATUSES } from '../../constants/index.js';
import { CONTENT_ICONS } from '../../components/icons/index.jsx';
import { IconStar, IconHeart } from '../../components/icons/index.jsx';

function ReviewForm({ item, onSave, onClose }) {
  const existing = item.myReview || {};
  const [score, setScore]         = useState(existing.score ?? null);
  const [hover, setHover]         = useState(null);
  const [text, setText]           = useState(existing.text ?? '');
  const [pros, setPros]           = useState(existing.pros ?? '');
  const [cons, setCons]           = useState(existing.cons ?? '');
  const [isFavorite, setFav]      = useState(existing.isFavorite ?? false);
  const [saving, setSaving]       = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(item.id, { score, text, pros, cons, isFavorite, updatedAt: new Date().toISOString() });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Score stars */}
      <div>
        <div className="cc-label" style={{ marginBottom: 8 }}>Note /10</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <span key={n} style={{ cursor: 'pointer', fontSize: '1.2rem', color: n <= (hover ?? score ?? 0) ? '#f5a623' : 'var(--border)', transition: 'color 0.1s' }}
              onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)}
              onClick={() => setScore(score === n ? null : n)}>★</span>
          ))}
        </div>
      </div>
      <div>
        <div className="cc-label" style={{ marginBottom: 6 }}>Critique</div>
        <textarea className="cc-input" rows={3} placeholder="Votre avis…" value={text} onChange={e => setText(e.target.value)} style={{ resize: 'vertical', minHeight: 72 }} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="cc-label" style={{ marginBottom: 6 }}>Points positifs</div>
          <textarea className="cc-input" rows={2} placeholder="• …" value={pros} onChange={e => setPros(e.target.value)} style={{ resize: 'none', height: 60 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="cc-label" style={{ marginBottom: 6 }}>Points négatifs</div>
          <textarea className="cc-input" rows={2} placeholder="• …" value={cons} onChange={e => setCons(e.target.value)} style={{ resize: 'none', height: 60 }} />
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <span style={{ color: isFavorite ? '#f5a623' : 'var(--muted)', fontSize: '1.2rem' }}>⭐</span>
        <input type="checkbox" checked={isFavorite} onChange={e => setFav(e.target.checked)} style={{ display: 'none' }} />
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--text)' }}>Coup de cœur</span>
      </label>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="cc-btn cc-btn-secondary" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
        <button className="cc-btn cc-btn-primary" style={{ flex: 1 }} disabled={saving} onClick={handleSave}>{saving ? '…' : 'Sauvegarder'}</button>
      </div>
    </div>
  );
}

function ReviewBody({ item, onStatusChange, onRemove, onEdit, onClose }) {
  const statusOpts = (LIBRARY_CATS[item.type] || []).filter(c => c.key !== 'all');
  const r = item.myReview;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status */}
      <div>
        <div className="cc-label" style={{ marginBottom: 8 }}>Statut</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {statusOpts.map(s => (
            <button key={s.key} onClick={() => onStatusChange(item.id, s.key)}
              className={`cc-pill-tag ${item.status === s.key ? 'active' : ''}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Review */}
      {r ? (
        <div>
          {r.score != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: '2rem', fontWeight: 800, color: r.score >= 8 ? '#4caf50' : r.score >= 6 ? 'var(--accent)' : r.score >= 4 ? '#ff9800' : '#f44336' }}>{r.score}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: 'var(--muted)' }}>/10</span>
              {r.isFavorite && <span style={{ marginLeft: 4 }}>⭐</span>}
            </div>
          )}
          {r.text && <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.8, marginBottom: 10 }}><SpoilerText text={r.text} /></p>}
          <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={onEdit}>Modifier la critique</button>
        </div>
      ) : REVIEWABLE_STATUSES.has(item.status) ? (
        <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={onEdit}>Écrire une critique</button>
      ) : null}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="cc-btn cc-btn-danger cc-btn-sm" style={{ flex: 1 }} onClick={() => onRemove(item)}>Retirer</button>
        <button className="cc-btn cc-btn-secondary cc-btn-sm" style={{ flex: 1 }} onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}

export function PersonalReviewPanel({ item, currentUser, onClose, onStatusChange, onRemove, onSaveReview }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="review-panel">
      <div className={`review-panel-hero${item.type === 'music' ? ' music' : ''}`}>
        {item.cover
          ? <img src={getHiResCover(item)} alt={item.title} loading="lazy" />
          : <div className="review-panel-hero-placeholder">{(CONTENT_ICONS[item.type] || CONTENT_ICONS.games)(48)}</div>
        }
        <button className="review-panel-hero-close" onClick={onClose}>✕</button>
      </div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{item.title}</div>
      {item.type === 'music' && item.artist && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', color: 'var(--accent)', marginBottom: 12 }}>{item.artist}</div>}
      {editing
        ? <ReviewForm item={item} onSave={onSaveReview} onClose={() => setEditing(false)} />
        : <ReviewBody item={item} onStatusChange={onStatusChange} onRemove={onRemove} onEdit={() => setEditing(true)} onClose={onClose} />
      }
    </div>
  );
}

export default PersonalReviewPanel;
