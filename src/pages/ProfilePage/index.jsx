import React, { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { CoverImage, getHiResCover, ConfirmModal } from '../../components/ui/index.jsx';
import { CONTENT_TYPES, CONTENT_LABELS, PROFILE_TABS, TAB_STATUSES } from '../../constants/index.js';
import { CONTENT_ICONS } from '../../components/icons/index.jsx';
import { IconLogout } from '../../components/icons/index.jsx';
import PersonalReviewSheet from './PersonalReviewSheet.jsx';
import PersonalReviewPanel from './PersonalReviewPanel.jsx';
import PersonalStatsPanel  from './PersonalStatsPanel.jsx';

const PersonalCoverCard = React.memo(({ item, selectedReviewId, isMobile, setSelectedReview, subCat }) => {
  const score = item.myReview?.score;
  const isSelected = selectedReviewId === item.id;
  const activityBadge =
    item.status === 'playing'   ? 'En cours' :
    item.status === 'completed' ? 'Terminé'  :
    item.status === 'reading'   ? 'En cours' :
    item.status === 'read'      ? 'Lu'       : null;

  return (
    <div className="cover-card" style={{ cursor: 'pointer' }}
      onClick={() => isSelected ? setSelectedReview(null) : setSelectedReview(item)}>
      <div className="cover-wrap" style={{ aspectRatio: item.type === 'music' ? '1/1' : '2/3', outline: isSelected && !isMobile ? '2px solid var(--accent)' : 'none', outlineOffset: 2 }}>
        <CoverImage item={item} />
        {score != null && (
          <div className="cover-badge" style={{ background: score >= 8 ? '#4caf50' : score >= 6 ? 'var(--accent)' : score >= 4 ? '#ff9800' : '#f44336', color: '#fff' }}>{score}</div>
        )}
        {activityBadge && subCat === 'collection' && (
          <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', borderRadius: 4, padding: '2px 7px', fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {activityBadge}
          </div>
        )}
        {item.myReview?.isFavorite && (
          <div style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.65rem' }}>⭐</div>
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
});

export default function ProfilePage({
  currentUser, setCurrentUser, libraryItems, setLibraryItems,
  updateStatus, saveReview, removeItem,
  updateAvatar, onSettings, onLogout, showToast, initialProfileTab,
}) {
  const [contentType, setContentType]           = useState(initialProfileTab?.contentType || 'games');
  const [subCat, setSubCat]                     = useState(initialProfileTab?.subCat || 'collection');
  const [collectionFilter, setCollectionFilter] = useState('owned');
  const [selectedReview, setSelectedReview]     = useState(null);
  const [uploadingAvatar, setUploadingAvatar]   = useState(false);
  const [removeTarget, setRemoveTarget]         = useState(null);
  const [visibleCount, setVisibleCount]         = useState(60);
  const [isPending, startTransition]            = useTransition();
  const isMobile = useIsMobile();
  const fileRef  = useRef();
  const gridRef  = useRef();

  const handleSetContentType = useCallback((t) => {
    startTransition(() => { setContentType(t); setVisibleCount(60); });
  }, []);
  const handleSetSubCat = useCallback((key) => {
    startTransition(() => { setSubCat(key); setSelectedReview(null); setVisibleCount(60); });
  }, []);
  const handleSetCollectionFilter = useCallback((f) => {
    startTransition(() => { setCollectionFilter(f); setVisibleCount(60); });
  }, []);

  // Reset tabs on type change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const firstTab = (PROFILE_TABS[contentType] || [])[0]?.key || 'collection';
    setSubCat(firstTab); setSelectedReview(null); setCollectionFilter('owned');
  }, [contentType]);

  // Infinite scroll
  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 600) {
        setVisibleCount(n => n + 40);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const filtered = useMemo(() => {
    const typeItems = libraryItems.filter(i => i.type === contentType);
    if (subCat === 'stats') return [];
    if (subCat === 'collection') {
      if (collectionFilter === 'wishlist') return typeItems.filter(i => i.status === 'wishlist');
      if (contentType === 'games') return typeItems.filter(i => ['owned','playing','completed'].includes(i.status));
      if (contentType === 'books') return typeItems.filter(i => ['owned','reading','read'].includes(i.status));
      return typeItems.filter(i => i.status === 'owned');
    }
    const statuses = TAB_STATUSES[subCat] || [subCat];
    return typeItems.filter(i => statuses.includes(i.status));
  }, [libraryItems, contentType, subCat, collectionFilter]);

  const counts = useMemo(() => {
    const c = {};
    CONTENT_TYPES.forEach(t => { c[t.id] = libraryItems.filter(i => i.type === t.id).length; });
    return c;
  }, [libraryItems]);

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await updateAvatar(file);
      setCurrentUser(prev => ({ ...prev, avatarUrl: url }));
      showToast('Photo mise à jour !', 'success');
    } catch (e) { showToast('Erreur upload: ' + e.message, 'error'); }
    setUploadingAvatar(false);
  };

  const handleRemoveConfirm = async () => {
    const item = removeTarget;
    setRemoveTarget(null);
    try {
      await removeItem(item.id);
      setLibraryItems(prev => prev.filter(i => i.id !== item.id));
      setSelectedReview(null);
      showToast('Retiré de la bibliothèque', 'success');
    } catch (e) { showToast('Erreur', 'error'); }
  };

  const tabs = PROFILE_TABS[contentType] || [];
  const showCollectionToggle = subCat === 'collection' && (contentType === 'games' || contentType === 'books');

  return (
    <div className="content-inner fade-in">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar" onClick={() => fileRef.current?.click()}>
          <img src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`} alt="" />
          <div className="profile-avatar-overlay">{uploadingAvatar ? '…' : 'Modifier'}</div>
        </div>
        <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatarUpload(e.target.files[0])} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{currentUser?.username}</h2>
          <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
            {CONTENT_TYPES.map(t => {
              const n = counts[t.id] || 0;
              const lbl = CONTENT_LABELS[t.id];
              return (
                <div key={t.id}>
                  <span style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)' }}>{n}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: 6 }}>{n <= 1 ? (lbl?.s || t.label) : (lbl?.p || t.label)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="cc-btn cc-btn-secondary cc-btn-sm" onClick={onSettings}>Réglages</button>
            <button className="cc-btn cc-btn-danger cc-btn-sm" onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconLogout size={13} /> Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Content type tabs */}
      <div className="tab-row" style={{ marginBottom: 16 }}>
        {CONTENT_TYPES.map(t => (
          <button key={t.id} onClick={() => handleSetContentType(t.id)} className={`cc-pill-tag ${contentType === t.id ? 'active' : ''}`}>
            <span style={{ opacity: contentType === t.id ? 1 : 0.45 }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Sub-category tabs */}
      <div className="tab-row" style={{ marginBottom: 20 }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => handleSetSubCat(tab.key)} className={`cc-pill-tag ${subCat === tab.key ? 'active' : ''}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Collection toggle */}
      {showCollectionToggle && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
          <div className="inprog-toggle">
            <button className={`inprog-toggle-btn ${collectionFilter === 'owned' ? 'active' : ''}`} onClick={() => handleSetCollectionFilter('owned')}>Possédé</button>
            <button className={`inprog-toggle-btn ${collectionFilter === 'wishlist' ? 'active' : ''}`} onClick={() => handleSetCollectionFilter('wishlist')}>Wishlist</button>
          </div>
        </div>
      )}

      {/* Stats */}
      {subCat === 'stats' ? (
        <PersonalStatsPanel items={libraryItems} contentType={contentType} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', color: 'var(--border)', opacity: 0.5 }}>{(CONTENT_ICONS[contentType] || CONTENT_ICONS.games)(44)}</span>
          <div className="empty-state-text">Aucun contenu dans cette catégorie<br />Utilisez la recherche pour en ajouter</div>
        </div>
      ) : (
        <div className="historique-layout">
          <div className={`historique-grid-wrap${selectedReview && !isMobile ? ' panel-open' : ''}`}>
            <div className="cover-grid" ref={gridRef} style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s' }}>
              {filtered.slice(0, visibleCount).map(item => (
                <PersonalCoverCard key={item.id} item={item} selectedReviewId={selectedReview?.id} isMobile={isMobile} setSelectedReview={setSelectedReview} subCat={subCat} />
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div style={{ textAlign: 'center', padding: '16px 0', fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: 'var(--muted)' }}>
                {filtered.length - visibleCount} de plus…
              </div>
            )}
          </div>
          {selectedReview && !isMobile && (
            <PersonalReviewPanel
              item={selectedReview}
              currentUser={currentUser}
              onClose={() => setSelectedReview(null)}
              onStatusChange={updateStatus}
              onRemove={setRemoveTarget}
              onSaveReview={saveReview}
              showToast={showToast}
            />
          )}
        </div>
      )}

      {/* Mobile sheet */}
      {selectedReview && isMobile && (
        <PersonalReviewSheet
          item={selectedReview}
          currentUser={currentUser}
          onClose={() => setSelectedReview(null)}
          onStatusChange={updateStatus}
          onRemove={setRemoveTarget}
          onSaveReview={saveReview}
          showToast={showToast}
        />
      )}

      {/* Remove confirm */}
      {removeTarget && (
        <ConfirmModal
          title={removeTarget.title}
          message="Votre critique et votre note seront également supprimées. Cette action est irréversible."
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}
