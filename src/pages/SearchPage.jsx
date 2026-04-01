import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiSearch } from '../lib/api.js';
import { contentCache } from '../lib/contentCache.js';
import { CoverImage, LoadingDots, getHiResCover, ExternalLinks } from '../components/ui/index.jsx';
import { CONTENT_TYPES } from '../constants/index.js';
import { CONTENT_ICONS } from '../components/icons/index.jsx';
import { IconSearch, IconX } from '../components/icons/index.jsx';
import { supabase } from '../lib/supabase.js';
import DetailSheet from './DetailSheet.jsx';

export default function SearchPage({ currentUser, userClubs, libraryItems, addToLibrary, showToast }) {
  const [searchType, setSearchType]       = useState('games');
  const [query, setQuery]                 = useState('');
  const [results, setResults]             = useState([]);
  const [cachedResults, setCachedResults] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [selectedItem, setSelectedItem]   = useState(null);
  const [showSingles, setShowSingles]     = useState(false);
  const [showNonSteam, setShowNonSteam]   = useState(false);
  const debounceRef = useRef(null);

  const libSet = useMemo(() => new Set(libraryItems.map(l => l.id)), [libraryItems]);
  const effectiveType = searchType === 'games' && showNonSteam ? 'games_igdb' : searchType;

  useEffect(() => {
    if (query.length < 2) { setResults([]); setCachedResults([]); return; }
    const baseType = effectiveType === 'games_igdb' ? 'games' : effectiveType;
    setCachedResults(contentCache.searchLocal(query, baseType));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const r = await apiSearch(effectiveType, query);
      setResults(r);
      setCachedResults([]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, effectiveType]);

  useEffect(() => {
    setResults([]); setCachedResults([]); setQuery(''); setShowSingles(false); setShowNonSteam(false);
  }, [searchType]);

  const handleAddToLibrary = useCallback(async (item, status) => {
    if (!currentUser) return;
    try {
      await addToLibrary(item, status);
      contentCache.set(item);
      showToast(`"${item.title}" ajouté !`, 'success');
    } catch (e) {
      if (e.code === '23505') showToast('Déjà dans votre bibliothèque', 'info');
      else showToast('Erreur: ' + e.message, 'error');
    }
  }, [currentUser, addToLibrary, showToast]);

  const handleAddToClub = useCallback(async (item, clubId) => {
    try {
      const { data: dup } = await supabase.from('club_content')
        .select('id').eq('club_id', clubId).eq('content_id', item.id).single();
      if (dup) { showToast('Déjà proposé à ce club', 'info'); return; }
      const { id: _id, ...meta } = item;
      await supabase.from('club_content').insert({
        club_id: clubId, content_id: item.id, type: item.type, title: item.title,
        cover: item.cover ?? null, year: item.year ?? null, artist: item.artist ?? null,
        author: item.author ?? null, developer: item.developer ?? null,
        genres: item.genres ?? [], rating: item.rating ? Number(item.rating) : null,
        synopsis: item.synopsis ?? null, media_type: item.mediaType ?? null,
        status: 'proposed', proposed_by: currentUser.username,
      });
      const club = userClubs.find(c => c.id === clubId);
      await supabase.from('club_activity').insert({
        club_id: clubId, club_name: club?.name ?? '', username: currentUser.username,
        action: 'a proposé', content_title: item.title, content_type: item.type,
      });
      contentCache.set(item);
      showToast(`"${item.title}" proposé au club !`, 'success');
    } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
  }, [currentUser, userClubs, showToast]);

  const isSingle = (item) => {
    const name = (item.title || '').toLowerCase();
    const type = (item.rawData?.collectionType || '').toLowerCase();
    return name.includes('- single') || name.endsWith('single') || type === 'single';
  };

  const displayResults = results.length > 0 ? results : cachedResults;
  const isFromCache    = results.length === 0 && cachedResults.length > 0;

  const displayed = searchType === 'music'
    ? displayResults.filter(i => showSingles ? isSingle(i) : !isSingle(i))
    : displayResults;

  return (
    <div className="content-inner fade-in">
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>
        Recherche
      </h1>

      {/* Type tabs */}
      <div className="tab-row" style={{ marginBottom: 16 }}>
        {CONTENT_TYPES.map(t => (
          <button key={t.id} onClick={() => setSearchType(t.id)}
            className={`cc-pill-tag ${searchType === t.id ? 'active' : ''}`}>
            <span style={{ opacity: searchType === t.id ? 1 : 0.45 }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}>
          <IconSearch size={14} />
        </span>
        <input
          className="cc-input"
          style={{ paddingLeft: 36, paddingRight: query ? 36 : 14 }}
          placeholder={`Rechercher ${searchType === 'games' ? 'un jeu' : searchType === 'music' ? 'un album' : searchType === 'cinema' ? 'un film' : 'un livre'}…`}
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
            <IconX size={14} />
          </button>
        )}
      </div>

      {/* Steam/IGDB toggle */}
      {searchType === 'games' && query.length >= 2 && (
        <div style={{ marginBottom: 16 }}>
          <div className="inprog-toggle">
            <button className={`inprog-toggle-btn ${!showNonSteam ? 'active' : ''}`} onClick={() => setShowNonSteam(false)}>Steam</button>
            <button className={`inprog-toggle-btn ${showNonSteam ? 'active' : ''}`}  onClick={() => setShowNonSteam(true)}>Autres plateformes</button>
          </div>
        </div>
      )}

      {/* Singles toggle */}
      {searchType === 'music' && displayResults.length > 0 && !loading && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <div className="inprog-toggle">
            <button className={`inprog-toggle-btn ${!showSingles ? 'active' : ''}`} onClick={() => setShowSingles(false)}>Albums · EPs</button>
            <button className={`inprog-toggle-btn ${showSingles ? 'active' : ''}`}  onClick={() => setShowSingles(true)}>Singles</button>
          </div>
        </div>
      )}

      {loading && cachedResults.length === 0 && <LoadingDots />}

      {/* Cache label */}
      {isFromCache && (
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
          Ma bibliothèque — résultats instantanés
        </div>
      )}

      {/* Results grid */}
      {displayed.length > 0 && (
        <div className="search-cover-grid">
          {displayed.map(item => {
            const sub = item.artist || item.author || item.developer || item.year || '';
            const inLib = libSet.has(item.id);
            return (
              <div key={item.id}
                className={`search-cover-card${item.type === 'music' ? ' music' : ''}`}
                onClick={() => setSelectedItem(item)}>
                <CoverImage item={item} />
                {inLib && (
                  <div style={{ position: 'absolute', top: 7, left: 7, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', borderRadius: 5, padding: '2px 7px', fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#fff', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: 'var(--accent)' }}>✓</span> Bibliothèque
                  </div>
                )}
                {item.type === 'cinema' && (
                  <div style={{ position: 'absolute', top: 7, right: 7, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', borderRadius: 5, padding: '2px 7px', fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#fff', letterSpacing: '0.08em' }}>
                    {item.mediaType === 'tv' ? 'Série TV' : 'Film'}
                  </div>
                )}
                <div className="search-cover-card-overlay">
                  <div className="search-cover-card-title">{item.title}</div>
                  {sub && <div className="search-cover-card-sub">{sub}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && cachedResults.length === 0 && query.length >= 2 && results.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon"><IconSearch size={44} /></span>
          <div className="empty-state-text">Aucun résultat pour "{query}"</div>
          {searchType === 'games' && !showNonSteam && (
            <button className="cc-btn cc-btn-secondary cc-btn-sm" style={{ marginTop: 12 }}
              onClick={() => setShowNonSteam(true)}>
              Chercher hors Steam
            </button>
          )}
        </div>
      )}

      {/* Detail sheet */}
      {selectedItem && (
        <DetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToLibrary={handleAddToLibrary}
          onAddToClub={handleAddToClub}
          currentUser={currentUser}
          userClubs={userClubs}
          myLibraryItem={libraryItems.find(l => l.id === selectedItem?.id) ?? null}
        />
      )}
    </div>
  );
}
