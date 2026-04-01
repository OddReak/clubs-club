import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { CoverImage, UserAvatar, LoadingDots } from '../../components/ui/index.jsx';
import { CONTENT_TYPES, PROFILE_TABS, TAB_STATUSES } from '../../constants/index.js';
import { CONTENT_ICONS } from '../../components/icons/index.jsx';
import DetailSheet from '../DetailSheet.jsx';

export default function UserProfilePage({
  username, currentUser, onBack,
  libraryItems, setLibraryItems, addToLibrary,
  userClubs, showToast, followedUsers, setFollowedUsers,
}) {
  const [profile, setProfile]         = useState(null);
  const [library, setLibrary]         = useState([]);
  const [contentType, setContentType] = useState('games');
  const [subCat, setSubCat]           = useState('collection');
  const [loading, setLoading]         = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const isMobile = useIsMobile();

  const isFollowing = followedUsers.includes(username);

  useEffect(() => {
    setLoading(true);
    setContentType('games'); setSubCat('collection');
    Promise.all([
      supabase.from('users').select('id, username, avatar_url').eq('username', username).single(),
      supabase.from('library_items').select('*').eq('user_id',
        // we need the user_id from username — join via users table
        supabase.from('users').select('id').eq('username', username).single().then(({ data }) => data?.id)
      ),
    ]).then(async ([{ data: prof }]) => {
      setProfile(prof);
      if (prof?.id) {
        const { data: libData } = await supabase.from('library_items').select('*').eq('user_id', prof.id);
        setLibrary((libData ?? []).map(row => ({
          id: row.content_id, type: row.type, title: row.title, cover: row.cover ?? '',
          year: row.year ?? '', status: row.status, artist: row.artist ?? '', author: row.author ?? '',
          developer: row.developer ?? '', genres: row.genres ?? [], rating: row.rating ?? '',
          synopsis: row.synopsis ?? '', mediaType: row.media_type ?? '', pages: row.pages ?? '',
          myReview: row.my_review ?? null,
        })));
      }
      setLoading(false);
    });
  }, [username]);

  const toggleFollow = useCallback(async () => {
    const newList = isFollowing
      ? followedUsers.filter(u => u !== username)
      : [...followedUsers, username];
    await supabase.from('users').update({ following: newList }).eq('id', currentUser.id);
    setFollowedUsers(newList);
  }, [isFollowing, followedUsers, username, currentUser.id, setFollowedUsers]);

  const handleAddToLibrary = useCallback(async (item, status) => {
    try {
      await addToLibrary(item, status);
      showToast(`"${item.title}" ajouté !`, 'success');
      setSelectedItem(null);
    } catch (e) {
      if (e.code === '23505') showToast('Déjà dans votre bibliothèque', 'info');
      else showToast('Erreur: ' + e.message, 'error');
    }
  }, [addToLibrary, showToast]);

  const getFiltered = () => {
    const typeItems = library.filter(i => i.type === contentType);
    if (subCat === 'collection') return typeItems.filter(i => ['owned','playing','completed','reading','read','listened'].includes(i.status));
    const statuses = TAB_STATUSES[subCat] || [subCat];
    return typeItems.filter(i => statuses.includes(i.status));
  };

  const tabs = PROFILE_TABS[contentType] || [];
  const filtered = getFiltered();
  const myLibSet = new Set(libraryItems.map(l => l.id));

  if (loading) return <div className="content-inner fade-in"><LoadingDots /></div>;
  if (!profile) return <div className="content-inner fade-in"><p style={{ color: 'var(--muted)' }}>Profil introuvable</p></div>;

  return (
    <div className="content-inner fade-in">
      {/* Back */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', marginBottom: 20, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Retour
      </button>

      {/* Profile header */}
      <div className="profile-header" style={{ marginBottom: 28 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid var(--accent)', overflow: 'hidden', flexShrink: 0 }}>
          <img src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{username}</h2>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            {CONTENT_TYPES.map(t => {
              const n = library.filter(i => i.type === t.id).length;
              return (
                <div key={t.id}>
                  <span style={{ fontFamily: "'Syne',sans-serif", fontSize: '1rem', fontWeight: 800, color: 'var(--accent)' }}>{n}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'var(--muted)', marginLeft: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.label}</span>
                </div>
              );
            })}
          </div>
          {currentUser?.username !== username && (
            <button className={`follow-btn ${isFollowing ? 'following' : ''}`} style={{ marginTop: 12 }} onClick={toggleFollow}>
              {isFollowing ? 'Abonné·e' : 'Suivre'}
            </button>
          )}
        </div>
      </div>

      {/* Content type tabs */}
      <div className="tab-row" style={{ marginBottom: 16 }}>
        {CONTENT_TYPES.map(t => (
          <button key={t.id} onClick={() => { setContentType(t.id); setSubCat((PROFILE_TABS[t.id] || [])[0]?.key || 'collection'); }}
            className={`cc-pill-tag ${contentType === t.id ? 'active' : ''}`}>
            <span style={{ opacity: contentType === t.id ? 1 : 0.45 }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Sub-category tabs */}
      <div className="tab-row" style={{ marginBottom: 20 }}>
        {tabs.filter(t => t.key !== 'stats').map(tab => (
          <button key={tab.key} onClick={() => setSubCat(tab.key)} className={`cc-pill-tag ${subCat === tab.key ? 'active' : ''}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" style={{ opacity: 0.4 }}>{(CONTENT_ICONS[contentType] || CONTENT_ICONS.games)(44)}</span>
          <div className="empty-state-text">Aucun contenu dans cette catégorie</div>
        </div>
      ) : (
        <div className="cover-grid">
          {filtered.map(item => {
            const inMyLib = myLibSet.has(item.id);
            return (
              <div key={item.id} className="cover-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedItem(item)}>
                <div className="cover-wrap" style={{ aspectRatio: item.type === 'music' ? '1/1' : '2/3', position: 'relative' }}>
                  <CoverImage item={item} />
                  {inMyLib && <div style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 6px', fontFamily: "'DM Mono',monospace", fontSize: '0.48rem', color: 'var(--accent)' }}>✓</div>}
                  {item.myReview?.score != null && (
                    <div className="cover-badge" style={{ background: item.myReview.score >= 8 ? '#4caf50' : item.myReview.score >= 6 ? 'var(--accent)' : item.myReview.score >= 4 ? '#ff9800' : '#f44336', color: '#fff' }}>{item.myReview.score}</div>
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
          })}
        </div>
      )}

      {/* Detail sheet */}
      {selectedItem && (
        <DetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToLibrary={handleAddToLibrary}
          currentUser={currentUser}
          userClubs={userClubs}
          myLibraryItem={libraryItems.find(l => l.id === selectedItem?.id) ?? null}
        />
      )}
    </div>
  );
}
