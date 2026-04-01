import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase.js';
import { CoverImage, getHiResCover, UserAvatar, LoadingDots } from '../../components/ui/index.jsx';
import { CONTENT_ICONS } from '../../components/icons/index.jsx';
import { IconSend } from '../../components/icons/index.jsx';

export default function ClubReviewPanel({ contentRow, club, currentUser, onClose, showToast }) {
  const [reviews, setReviews]   = useState([]);
  const [comments, setComments] = useState({});  // reviewId → []
  const [myReview, setMyReview] = useState(null);
  const [editing, setEditing]   = useState(false);
  const [score, setScore]       = useState(null);
  const [hover, setHover]       = useState(null);
  const [text, setText]         = useState('');
  const [commentText, setCommentText] = useState({});
  const [loading, setLoading]   = useState(true);

  const item = {
    id: contentRow.content_id, type: contentRow.type, title: contentRow.title,
    cover: contentRow.cover ?? '', year: contentRow.year ?? '',
    artist: contentRow.artist ?? '', author: contentRow.author ?? '',
  };

  useEffect(() => {
    supabase.from('club_reviews').select('*').eq('club_content_id', contentRow.id)
      .then(({ data }) => {
        const revs = data ?? [];
        setReviews(revs);
        const mine = revs.find(r => r.user_id === currentUser.id);
        if (mine) { setMyReview(mine); setScore(mine.score); setText(mine.text ?? ''); }
        setLoading(false);
      });

    const ch = supabase.channel(`club_reviews:${contentRow.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_reviews', filter: `club_content_id=eq.${contentRow.id}` }, (p) => {
        if (p.eventType === 'INSERT') setReviews(prev => [...prev.filter(r => r.id !== p.new.id), p.new]);
        else if (p.eventType === 'UPDATE') setReviews(prev => prev.map(r => r.id === p.new.id ? p.new : r));
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [contentRow.id, currentUser.id]);

  const saveReview = async () => {
    const payload = { club_id: club.id, club_content_id: contentRow.id, user_id: currentUser.id, username: currentUser.username, score, text, updated_at: new Date().toISOString() };
    if (myReview) {
      await supabase.from('club_reviews').update(payload).eq('id', myReview.id);
    } else {
      const { data } = await supabase.from('club_reviews').insert(payload).select().single();
      setMyReview(data);
      await supabase.from('club_activity').insert({ club_id: club.id, club_name: club.name, username: currentUser.username, action: 'a noté', content_title: contentRow.title, content_type: contentRow.type, score });
    }
    setEditing(false);
    showToast('Critique sauvegardée !', 'success');
  };

  const toggleLike = async (reviewId) => {
    const rev = reviews.find(r => r.id === reviewId);
    if (!rev) return;
    const likes = rev.likes ?? [];
    const newLikes = likes.includes(currentUser.username)
      ? likes.filter(u => u !== currentUser.username)
      : [...likes, currentUser.username];
    await supabase.from('club_reviews').update({ likes: newLikes }).eq('id', reviewId);
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likes: newLikes } : r));
  };

  const scoreColor = n => n >= 8 ? '#4caf50' : n >= 6 ? 'var(--accent)' : n >= 4 ? '#ff9800' : '#f44336';

  if (loading) return <div className="review-panel"><LoadingDots /></div>;

  return (
    <div className="review-panel">
      <div className={`review-panel-hero${item.type === 'music' ? ' music' : ''}`}>
        {item.cover
          ? <img src={getHiResCover(item)} alt={item.title} loading="lazy" />
          : <div className="review-panel-hero-placeholder">{(CONTENT_ICONS[item.type] || CONTENT_ICONS.games)(48)}</div>
        }
        <button className="review-panel-hero-close" onClick={onClose}>✕</button>
      </div>

      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>{contentRow.title}</div>

      {/* My review */}
      <div className="cc-card" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <div className="cc-label" style={{ marginBottom: 10 }}>Ma critique</div>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <span key={n} style={{ cursor: 'pointer', fontSize: '1.1rem', color: n <= (hover ?? score ?? 0) ? '#f5a623' : 'var(--border)' }}
                  onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)}
                  onClick={() => setScore(score === n ? null : n)}>★</span>
              ))}
            </div>
            <textarea className="cc-input" rows={3} placeholder="Votre avis…" value={text} onChange={e => setText(e.target.value)} style={{ resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="cc-btn cc-btn-secondary cc-btn-sm" style={{ flex: 1 }} onClick={() => setEditing(false)}>Annuler</button>
              <button className="cc-btn cc-btn-primary cc-btn-sm" style={{ flex: 1 }} onClick={saveReview}>Sauvegarder</button>
            </div>
          </div>
        ) : myReview ? (
          <div>
            {myReview.score != null && <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.6rem', fontWeight: 800, color: scoreColor(myReview.score), marginBottom: 6 }}>{myReview.score}<span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 4 }}>/10</span></div>}
            {myReview.text && <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 }}>{myReview.text}</p>}
            <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => setEditing(true)}>Modifier</button>
          </div>
        ) : (
          <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => setEditing(true)}>Écrire une critique</button>
        )}
      </div>

      {/* All reviews */}
      {reviews.filter(r => r.user_id !== currentUser.id).map(r => (
        <div key={r.id} className="cc-card" style={{ padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <UserAvatar username={r.username} size={26} />
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', fontWeight: 700, color: 'var(--text)' }}>{r.username}</div>
            {r.score != null && <div style={{ marginLeft: 'auto', fontFamily: "'Syne',sans-serif", fontSize: '1rem', fontWeight: 800, color: scoreColor(r.score) }}>{r.score}</div>}
          </div>
          {r.text && <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.63rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: 8 }}>{r.text}</p>}
          <button onClick={() => toggleLike(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', color: (r.likes ?? []).includes(currentUser.username) ? 'var(--accent)' : 'var(--muted)', padding: 0 }}>
            ♥ {(r.likes ?? []).length}
          </button>
        </div>
      ))}

      {reviews.filter(r => r.user_id !== currentUser.id).length === 0 && !editing && (
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>Aucune autre critique pour l'instant</div>
      )}
    </div>
  );
}
