import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { ClubTypeIcon, IconPlus, IconUnlock, IconX, IconUsers, IconCalendar } from '../../components/icons/index.jsx';
import { CoverImage, LoadingDots, UserAvatar, Countdown, ConfirmModal } from '../../components/ui/index.jsx';
import { CLUB_TYPES, CLUB_TO_CONTENT } from '../../constants/index.js';
import { CONTENT_ICONS } from '../../components/icons/index.jsx';
import DetailSheet from '../DetailSheet.jsx';
import ClubReviewPanel from './ClubReviewPanel.jsx';
import ClubReviewSheet from './ClubReviewSheet.jsx';

// ── Create/Join modals ────────────────────────────────────────
function CreateModal({ onClose, onCreate }) {
  const [name, setName]   = useState('');
  const [type, setType]   = useState(CLUB_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try { await onCreate(name.trim(), type); onClose(); }
    catch (e) { alert(e.message); }
    setLoading(false);
  };
  return (
    <div className="cc-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal fade-in" style={{ maxWidth: 400 }}>
        <div className="cc-modal-header"><h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.1rem', fontWeight: 800 }}>Créer un club</h2></div>
        <div className="cc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><div className="cc-label" style={{ marginBottom: 6 }}>Nom du club</div><input className="cc-input" placeholder="Mon super club" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><div className="cc-label" style={{ marginBottom: 6 }}>Type</div>
            <select className="cc-select" value={type} onChange={e => setType(e.target.value)}>
              {CLUB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="cc-btn cc-btn-secondary" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
            <button className="cc-btn cc-btn-primary" style={{ flex: 1 }} disabled={loading || !name.trim()} onClick={handle}>{loading ? '…' : 'Créer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function JoinModal({ onClose, onJoin }) {
  const [code, setCode]   = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try { await onJoin(code.trim()); onClose(); }
    catch (e) { alert(e.message); }
    setLoading(false);
  };
  return (
    <div className="cc-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal fade-in" style={{ maxWidth: 360 }}>
        <div className="cc-modal-header"><h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.1rem', fontWeight: 800 }}>Rejoindre un club</h2></div>
        <div className="cc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><div className="cc-label" style={{ marginBottom: 6 }}>Code d'invitation</div>
            <input className="cc-input" placeholder="ABC123" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="cc-btn cc-btn-secondary" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
            <button className="cc-btn cc-btn-primary" style={{ flex: 1 }} disabled={loading || !code.trim()} onClick={handle}>{loading ? '…' : 'Rejoindre'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Club content grid ─────────────────────────────────────────
function ClubContentGrid({ club, currentUser, onViewProfile, showToast }) {
  const [content, setContent]           = useState([]);
  const [tab, setTab]                   = useState('proposed');
  const [loading, setLoading]           = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setLoading(true);
    supabase.from('club_content').select('*').eq('club_id', club.id).order('proposed_at', { ascending: false })
      .then(({ data }) => { setContent(data ?? []); setLoading(false); });

    const ch = supabase.channel(`club_content:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_content', filter: `club_id=eq.${club.id}` }, (p) => {
        if (p.eventType === 'INSERT') setContent(prev => [p.new, ...prev]);
        else if (p.eventType === 'UPDATE') setContent(prev => prev.map(c => c.id === p.new.id ? p.new : c));
        else if (p.eventType === 'DELETE') setContent(prev => prev.filter(c => c.id !== p.old.id));
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [club.id]);

  const toItem = (row) => ({
    id: row.content_id, type: row.type, title: row.title, cover: row.cover ?? '',
    year: row.year ?? '', artist: row.artist ?? '', author: row.author ?? '',
    developer: row.developer ?? '', genres: row.genres ?? [], rating: row.rating ?? '',
    synopsis: row.synopsis ?? '', mediaType: row.media_type ?? '',
    _clubContentId: row.id, _clubId: row.club_id,
  });

  const promote = async (row) => {
    await supabase.from('club_content').update({ status: 'active' }).eq('id', row.id);
    await supabase.from('club_activity').insert({ club_id: club.id, club_name: club.name, username: currentUser.username, action: 'a lancé', content_title: row.title, content_type: row.type });
    showToast('Lancé !', 'success');
  };

  const markDone = async (row) => {
    await supabase.from('club_content').update({ status: 'completed' }).eq('id', row.id);
    showToast('Marqué terminé', 'success');
  };

  const tabs = [{ key: 'proposed', label: 'Proposé' }, { key: 'active', label: 'En cours' }, { key: 'completed', label: 'Terminé' }];
  const shown = content.filter(c => c.status === tab);

  if (loading) return <LoadingDots />;

  return (
    <div>
      <div className="tab-row" style={{ marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`cc-pill-tag ${tab === t.key ? 'active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">{(CONTENT_ICONS[CLUB_TO_CONTENT[club.type]] || CONTENT_ICONS.games)(44)}</span>
          <div className="empty-state-text">Aucun contenu {tab === 'proposed' ? 'proposé' : tab === 'active' ? 'en cours' : 'terminé'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map(row => {
            const item = toItem(row);
            const avgRating = Object.values(row.ratings || {}).length
              ? (Object.values(row.ratings).reduce((a, b) => a + b, 0) / Object.values(row.ratings).length).toFixed(1)
              : null;
            const isAdmin = club.role === 'admin';
            return (
              <div key={row.id} className="cc-card" style={{ display: 'flex', gap: 14, padding: '14px 16px', cursor: 'pointer', alignItems: 'center' }}
                onClick={() => setSelectedReview(row)}>
                <div style={{ width: 52, aspectRatio: row.type === 'music' ? '1/1' : '2/3', borderRadius: 6, overflow: 'hidden', background: 'var(--surface2)', flexShrink: 0 }}>
                  <CoverImage item={item} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', color: 'var(--muted)', marginTop: 3 }}>
                    {row.artist || row.author || row.developer || row.year || ''}
                    {avgRating && <span style={{ color: 'var(--accent)', marginLeft: 8 }}>★ {avgRating}</span>}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: 'var(--muted)', marginTop: 2 }}>
                    Proposé par {row.proposed_by}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {tab === 'proposed' && isAdmin && (
                    <button className="cc-btn cc-btn-primary cc-btn-sm" onClick={() => promote(row)}>Lancer</button>
                  )}
                  {tab === 'active' && isAdmin && (
                    <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => markDone(row)}>Terminé</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedReview && (isMobile ? (
        <ClubReviewSheet
          contentRow={selectedReview}
          club={club}
          currentUser={currentUser}
          onClose={() => setSelectedReview(null)}
          showToast={showToast}
        />
      ) : (
        <ClubReviewPanel
          contentRow={selectedReview}
          club={club}
          currentUser={currentUser}
          onClose={() => setSelectedReview(null)}
          showToast={showToast}
        />
      ))}
    </div>
  );
}

// ── Main ClubsPage ────────────────────────────────────────────
export default function ClubsPage({
  currentUser, userClubs, setUserClubs, showToast,
  initialClub, initialTab, followedUsers, onViewProfile,
  createClub, joinClub,
}) {
  const [activeClub, setActiveClub] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin]     = useState(false);
  const [members, setMembers]       = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [showMeetingEdit, setShowMeetingEdit] = useState(false);
  const [activity, setActivity]     = useState([]);

  const enterClub = useCallback(async (club) => {
    setActiveClub(club);
    // Load members
    const { data: mData } = await supabase.from('club_members').select('username, role').eq('club_id', club.id);
    setMembers(mData ?? []);
    // Load meeting
    const { data: cData } = await supabase.from('clubs').select('meeting_date, meeting_time').eq('id', club.id).single();
    setMeetingDate(cData?.meeting_date ?? '');
    setMeetingTime(cData?.meeting_time ?? '');
    // Load activity
    supabase.from('club_activity').select('*').eq('club_id', club.id).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setActivity(data ?? []));
    // Presence
    await supabase.rpc('upsert_presence', { p_club_id: club.id, p_user_id: currentUser.id, p_username: currentUser.username, p_online: true });
  }, [currentUser]);

  useEffect(() => {
    if (initialClub) enterClub(initialClub);
  }, [initialClub?.id]);

  // Realtime presence
  useEffect(() => {
    if (!activeClub) return;
    const ch = supabase.channel(`presence:${activeClub.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence', filter: `club_id=eq.${activeClub.id}` }, (p) => {
        if (p.new?.online) setOnlineUsers(prev => new Set([...prev, p.new.username]));
        else setOnlineUsers(prev => { const s = new Set(prev); s.delete(p.old?.username); return s; });
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [activeClub?.id]);

  const saveMeeting = async () => {
    await supabase.from('clubs').update({ meeting_date: meetingDate || null, meeting_time: meetingTime || null }).eq('id', activeClub.id);
    if (meetingDate) {
      await supabase.from('club_activity').insert({ club_id: activeClub.id, club_name: activeClub.name, username: currentUser.username, action: 'a planifié une réunion', meeting_date: meetingDate, meeting_time: meetingTime || null });
    }
    setShowMeetingEdit(false);
    showToast('Réunion mise à jour !', 'success');
  };

  const handleCreate = async (name, type) => {
    const club = await createClub(name, type);
    await enterClub(club);
  };

  // ── Club list view ──
  if (!activeClub) return (
    <div className="content-inner fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>Clubs</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="cc-btn cc-btn-primary cc-btn-sm" onClick={() => setShowCreate(true)}><IconPlus size={13} /> Créer</button>
          <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => setShowJoin(true)}><IconUnlock size={13} /> Rejoindre</button>
        </div>
      </div>
      {userClubs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', opacity: 0.6 }}><IconUsers size={44} /></span>
          <div className="empty-state-text">Vous n'avez pas encore de club<br />Créez ou rejoignez un club pour commencer</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {userClubs.map(club => (
            <div key={club.id} className="club-card" onClick={() => enterClub(club)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <span style={{ flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--accent)' }}>
                  <ClubTypeIcon type={club.type} size={20} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>{club.name}</div>
                  <span className="cc-badge">{club.type}</span>
                </div>
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: 'var(--muted)' }}>
                {club.memberCount} membre{club.memberCount > 1 ? 's' : ''} · {club.role}
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {showJoin   && <JoinModal  onClose={() => setShowJoin(false)}   onJoin={joinClub} />}
    </div>
  );

  // ── Active club view ──
  return (
    <div className="content-inner fade-in">
      {/* Club header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={() => setActiveClub(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem' }}>←</button>
        <span style={{ color: 'var(--accent)' }}><ClubTypeIcon type={activeClub.type} size={28} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{activeClub.name}</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <span className="cc-badge">{activeClub.type}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'var(--muted)' }}>
              {members.length} membre{members.length > 1 ? 's' : ''}
            </span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'var(--accent)' }}>
              {onlineUsers.size > 0 && `● ${onlineUsers.size} en ligne`}
            </span>
          </div>
        </div>
      </div>

      {/* Meeting section */}
      <div className="cc-card" style={{ padding: '14px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        <IconCalendar size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {meetingDate ? (
            <>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--text)', fontWeight: 700 }}>
                Prochaine réunion · {meetingDate}{meetingTime ? ` à ${meetingTime}` : ''}
              </div>
              <Countdown meetingDate={meetingDate} meetingTime={meetingTime} />
            </>
          ) : (
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', color: 'var(--muted)' }}>Aucune réunion planifiée</div>
          )}
        </div>
        <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => setShowMeetingEdit(v => !v)}>
          {showMeetingEdit ? 'Annuler' : 'Modifier'}
        </button>
      </div>
      {showMeetingEdit && (
        <div className="cc-card" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div className="cc-label" style={{ marginBottom: 6 }}>Date</div>
            <input type="date" className="cc-input" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <div className="cc-label" style={{ marginBottom: 6 }}>Heure</div>
            <input type="time" className="cc-input" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} />
          </div>
          <button className="cc-btn cc-btn-primary" onClick={saveMeeting}>Sauvegarder</button>
        </div>
      )}

      {/* Content */}
      <ClubContentGrid club={activeClub} currentUser={currentUser} onViewProfile={onViewProfile} showToast={showToast} />
    </div>
  );
}
