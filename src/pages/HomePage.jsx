import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase.js';
import { CoverImage, UserAvatar, Countdown } from '../components/ui/index.jsx';
import { ClubTypeIcon, IconCalendar, IconGamepad } from '../components/icons/index.jsx';
import { CONTENT_TO_CLUB_TYPE, DAILY_QUOTES, MONTHS } from '../constants/index.js';
import { CONTENT_ICONS } from '../components/icons/index.jsx';

const quote = DAILY_QUOTES[Math.floor(Date.now() / 86400000) % DAILY_QUOTES.length];

export default function HomePage({
  currentUser, userClubs, libraryItems, showToast,
  setPage, setActiveClubFromHome, setInitialProfileTab,
  onViewProfile, followedUsers,
}) {
  const [inProgressItems, setInProgressItems]   = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [activity, setActivity]                 = useState([]);
  const [loadingActivity, setLoadingActivity]   = useState(false);

  const IN_PROGRESS_STATUSES = new Set(['playing','reading','to_watch','to_listen']);

  // In-progress from own library
  const myInProgress = useMemo(() =>
    libraryItems.filter(i => IN_PROGRESS_STATUSES.has(i.status)).slice(0, 12),
    [libraryItems]
  );

  // Upcoming meetings from joined clubs
  useEffect(() => {
    if (!userClubs.length) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('club_activity')
      .select('*')
      .in('club_id', userClubs.map(c => c.id))
      .gte('meeting_date', today)
      .not('meeting_date', 'is', null)
      .order('meeting_date', { ascending: true })
      .limit(5)
      .then(({ data }) => setUpcomingMeetings(data ?? []));
  }, [userClubs]);

  // Activity feed from followed users + own clubs
  useEffect(() => {
    if (!userClubs.length && !followedUsers.length) return;
    setLoadingActivity(true);
    supabase
      .from('club_activity')
      .select('*')
      .in('club_id', userClubs.map(c => c.id))
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setActivity(data ?? []);
        setLoadingActivity(false);
      });
  }, [userClubs, followedUsers]);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  };

  return (
    <div className="content-inner fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
          Bonjour, {currentUser?.username} 👋
        </h1>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
          {quote}
        </p>
      </div>

      {/* In-progress */}
      {myInProgress.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="cc-label">En cours</div>
            <button className="cc-btn cc-btn-ghost cc-btn-sm" onClick={() => setPage('profile')}>
              Voir tout →
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {myInProgress.map(item => (
              <div key={item.id}
                onClick={() => {
                  const tabMap = { games:'playing', music:'to_listen', cinema:'to_watch', books:'reading' };
                  setInitialProfileTab({ contentType: item.type, subCat: tabMap[item.type] ?? 'collection' });
                  setPage('profile');
                }}
                style={{ flexShrink: 0, width: 90, cursor: 'pointer' }}>
                <div style={{ width: 90, aspectRatio: item.type === 'music' ? '1/1' : '2/3', borderRadius: 8, overflow: 'hidden', background: 'var(--surface2)', border: '2px solid var(--border)', transition: 'border-color 0.18s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <CoverImage item={item} />
                </div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '0.65rem', fontWeight: 700, color: 'var(--text)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ color: 'var(--accent)' }}>{(CONTENT_ICONS[item.type] || CONTENT_ICONS.games)(10)}</span>
                  <ClubTypeIcon type={CONTENT_TO_CLUB_TYPE[item.type]} size={10} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming meetings */}
      {upcomingMeetings.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div className="cc-label" style={{ marginBottom: 14 }}>Prochaines réunions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcomingMeetings.map(ev => (
              <div key={ev.id} className="cc-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                onClick={() => { setActiveClubFromHome(userClubs.find(c => c.id === ev.club_id) ?? null); setPage('clubs'); }}>
                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <IconCalendar size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.content_title || ev.club_name}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', color: 'var(--muted)', marginTop: 2 }}>
                    {ev.club_name} · {ev.meeting_date}{ev.meeting_time ? ` à ${ev.meeting_time}` : ''}
                  </div>
                </div>
                <Countdown meetingDate={ev.meeting_date} meetingTime={ev.meeting_time} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My clubs */}
      {userClubs.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="cc-label">Mes clubs</div>
            <button className="cc-btn cc-btn-ghost cc-btn-sm" onClick={() => setPage('clubs')}>Voir tout →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {userClubs.map(club => (
              <div key={club.id} className="cc-card cc-card-hover" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
                onClick={() => { setActiveClubFromHome(club); setPage('clubs'); }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0 }}><ClubTypeIcon type={club.type} size={20} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.name}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'var(--muted)', marginTop: 2 }}>{club.memberCount} membre{club.memberCount > 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Activity feed */}
      {activity.length > 0 && (
        <section>
          <div className="cc-label" style={{ marginBottom: 14 }}>Activité récente</div>
          <div className="cc-card" style={{ padding: '4px 0' }}>
            {activity.slice(0, 20).map(a => (
              <div key={a.id} className="activity-item" style={{ padding: '12px 16px' }}>
                <UserAvatar username={a.username} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--text)', lineHeight: 1.5 }}>
                    <strong style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => onViewProfile(a.username)}>{a.username}</strong>
                    {' '}{a.action}{a.content_title ? (<> <em style={{ color: 'var(--text)' }}>{a.content_title}</em></>) : ''}
                    {a.score != null && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>· {a.score}/10</span>}
                    {a.meeting_date && <span style={{ marginLeft: 4 }}>· <IconCalendar size={10} style={{ verticalAlign: 'middle' }} /> {a.meeting_date}</span>}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'var(--muted)', marginTop: 3 }}>
                    {a.club_name} · {formatDate(a.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!myInProgress.length && !activity.length && !upcomingMeetings.length && (
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <span className="empty-state-icon">{(CONTENT_ICONS.games)(48)}</span>
          <div className="empty-state-text">
            Bienvenue sur Clubs Club !<br />
            Rejoignez un club ou ajoutez du contenu via la recherche.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="cc-btn cc-btn-primary cc-btn-sm" onClick={() => setPage('search')}>Rechercher</button>
            <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={() => setPage('clubs')}>Clubs</button>
          </div>
        </div>
      )}
    </div>
  );
}
