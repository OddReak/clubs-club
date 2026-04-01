import { useState, useEffect, useRef } from 'react';
import { CoverImage, getHiResCover, ExternalLinks, LoadingDots } from '../components/ui/index.jsx';
import { CONTENT_TO_CLUB_TYPE, LIBRARY_CATS } from '../constants/index.js';
import { CONTENT_ICONS } from '../components/icons/index.jsx';
import { IconStar, IconCalendar, IconMic } from '../components/icons/index.jsx';
import { apiSearch, fetchItunesTracks, fetchBookSynopsis } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';

function useScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const prevBody = document.body.style.overflow;
    const prevHtml = html.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prevBody;
      document.body.style.overscrollBehavior = '';
      html.style.overflow = prevHtml;
      html.style.overscrollBehavior = '';
    };
  }, []);
}

export default function DetailSheet({
  item, onClose,
  onAddToLibrary, onAddToClub,
  currentUser, userClubs = [],
  viewOnly = false, clubActions = null, myLibraryItem = null,
}) {
  const [closing, setClosing]             = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [synopsis, setSynopsis]           = useState(item.synopsis || '');
  const [tracks, setTracks]               = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [director, setDirector]           = useState(item.director || '');
  const [actors, setActors]               = useState([]);
  const [runtime, setRuntime]             = useState(null);
  const [tvSeasons, setTvSeasons]         = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);

  useScrollLock();

  const dismiss = () => { setClosing(true); setTimeout(onClose, 230); };
  const isMusic = item.type === 'music';

  // Lazy-load extra data
  useEffect(() => {
    if (item.type === 'music' && item.rawData?.collectionId) {
      setLoadingTracks(true);
      fetchItunesTracks(item.rawData.collectionId).then(t => { setTracks(t); setLoadingTracks(false); });
    }
    if (item.type === 'books' && !synopsis) {
      fetchBookSynopsis(item.title, item.author).then(s => { if (s) setSynopsis(s); });
    }
    if (item.type === 'cinema' && item.externalId) {
      const isTV = item.mediaType === 'tv';
      const TMDB_KEY_PLACEHOLDER = ''; // called via Edge Function in production
      // Fetch enriched cinema data via TMDB
      const fetchCinema = async () => {
        try {
          const { data } = await supabase.functions.invoke(
            isTV ? `search-cinema?details=tv&id=${item.externalId}` : `search-cinema?details=movie&id=${item.externalId}`
          );
          if (data?.credits) {
            const dir = (data.credits.crew || []).find((c) => c.job === 'Director');
            if (dir) setDirector(dir.name);
            setActors((data.credits.cast || []).slice(0, 5).map(a => a.name));
          }
          if (data?.runtime) setRuntime(data.runtime);
          if (isTV && data?.seasons) {
            const filtered = (data.seasons || []).filter(s => s.season_number > 0);
            setTvSeasons(filtered);
            if (filtered.length) setSelectedSeason(filtered[0].season_number);
          }
          if (!synopsis && data?.overview) setSynopsis(data.overview);
        } catch {}
      };
      fetchCinema();
    }
  }, [item.id]);

  const statusOptions = (LIBRARY_CATS[item.type] || []).filter(c => c.key !== 'all');
  const matchingClubs = userClubs.filter(c => c.type === CONTENT_TO_CLUB_TYPE[item.type]);

  const formatMs = (ms) => {
    if (!ms) return '';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Group tracks into discs
  const discMap = {};
  tracks.forEach(t => {
    const disc = t.discNumber ?? 1;
    if (!discMap[disc]) discMap[disc] = [];
    discMap[disc].push(t);
  });
  const discKeys = Object.keys(discMap).sort((a, b) => Number(a) - Number(b));

  return (
    <>
      <div className="search-detail-backdrop" onClick={dismiss} />
      <div className={`search-detail-sheet${closing ? ' closing' : ''}`}>
        <div className="search-detail-scroll">

          {/* Hero */}
          <div className={`search-detail-hero${isMusic ? ' music' : ''}`}>
            {item.cover
              ? <img src={getHiResCover(item)} alt={item.title} loading="lazy" />
              : <div className="search-detail-hero-placeholder">{(CONTENT_ICONS[item.type] || CONTENT_ICONS.games)(64)}</div>
            }
            <div className="search-detail-hero-gradient" />
            <button className="search-detail-hero-close" onClick={dismiss}>✕</button>
          </div>

          <div className="search-detail-body">
            {/* Title block */}
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, marginBottom: 6 }}>{item.title}</h2>
              {isMusic && item.artist && (
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <IconMic size={12} />{item.artist}
                </div>
              )}
              {item.type === 'books' && item.author && (
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', color: 'var(--muted)' }}>{item.author}</div>
              )}
            </div>

            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {item.rating && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><IconStar size={12} />{item.rating}/10</span>}
              {item.year   && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><IconCalendar size={12} />{item.year}</span>}
              {item.type === 'cinema' && director && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--muted)' }}>Réal. {director}</span>}
              {runtime && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--muted)' }}>{Math.floor(runtime/60)}h{runtime%60>0?` ${runtime%60}m`:''}</span>}
              {item.pages  && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--muted)' }}>{item.pages} pages</span>}
            </div>

            {/* Genres */}
            {item.genres?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {item.genres.slice(0, 5).map(g => (
                  <span key={g} style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px' }}>{g}</span>
                ))}
              </div>
            )}

            {/* Actors */}
            {actors.length > 0 && (
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                Avec : {actors.join(', ')}
              </div>
            )}

            {/* Synopsis */}
            {synopsis && (
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
                {synopsis}
              </p>
            )}

            {/* External links */}
            <ExternalLinks item={item} />

            {/* Track list */}
            {isMusic && (
              <div style={{ marginBottom: 20 }}>
                {loadingTracks && <LoadingDots />}
                {discKeys.map(disc => (
                  <div key={disc} style={{ marginBottom: 12 }}>
                    {discKeys.length > 1 && (
                      <div className="cc-label" style={{ marginBottom: 8 }}>Disque {disc}</div>
                    )}
                    {discMap[disc].map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', color: 'var(--muted)', minWidth: 18, textAlign: 'right' }}>{t.trackNumber}</span>
                        <span style={{ flex: 1, fontFamily: "'DM Mono',monospace", fontSize: '0.68rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.trackName}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', color: 'var(--muted)', flexShrink: 0 }}>{formatMs(t.trackTimeMillis)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Already in library */}
            {myLibraryItem && (
              <div style={{ padding: '12px 14px', background: 'color-mix(in srgb, var(--accent) 10%, var(--surface2))', border: '1px solid var(--accent)', borderRadius: 10, marginBottom: 16, fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: 'var(--accent)' }}>
                ✓ Dans votre bibliothèque · {myLibraryItem.status}
              </div>
            )}

            {/* Club actions overlay (from ClubsPage) */}
            {clubActions && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button className="cc-btn cc-btn-primary cc-btn-sm" style={{ flex: 1 }}
                  onClick={() => { onClose(); clubActions.onPrimary(item); }}>
                  {clubActions.primaryLabel}
                </button>
                {clubActions.secondaryLabel && (
                  <button className="cc-btn cc-btn-danger cc-btn-sm" style={{ flex: 1 }}
                    onClick={() => { onClose(); clubActions.onSecondary(item); }}>
                    {clubActions.secondaryLabel}
                  </button>
                )}
              </div>
            )}

            {/* Add to library */}
            {!viewOnly && !myLibraryItem && onAddToLibrary && (
              <div style={{ marginBottom: 20 }}>
                <div className="cc-label" style={{ marginBottom: 8 }}>Ajouter à ma bibliothèque</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="cc-select" style={{ flex: 1 }} value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                    <option value="">Choisir un statut…</option>
                    {statusOptions.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <button className="cc-btn cc-btn-primary" disabled={!selectedStatus}
                    onClick={async () => { await onAddToLibrary(item, selectedStatus); setSelectedStatus(''); }}>
                    Ajouter
                  </button>
                </div>
              </div>
            )}

            {/* Add to club */}
            {!viewOnly && onAddToClub && matchingClubs.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="cc-label" style={{ marginBottom: 8 }}>Proposer à un club</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="cc-select" style={{ flex: 1 }} value={selectedClubId} onChange={e => setSelectedClubId(e.target.value)}>
                    <option value="">Choisir un club…</option>
                    {matchingClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button className="cc-btn cc-btn-secondary" disabled={!selectedClubId}
                    onClick={async () => { await onAddToClub(item, selectedClubId); setSelectedClubId(''); }}>
                    Proposer
                  </button>
                </div>
              </div>
            )}

            {matchingClubs.length === 0 && !viewOnly && onAddToClub && (
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: 'var(--muted)', padding: '10px 0' }}>
                Aucun club de type <span style={{ color: 'var(--accent)' }}>{CONTENT_TO_CLUB_TYPE[item.type]}</span> trouvé.
              </div>
            )}

            <button className="cc-btn cc-btn-secondary" style={{ width: '100%' }} onClick={dismiss}>Fermer</button>
          </div>
        </div>
      </div>
    </>
  );
}
