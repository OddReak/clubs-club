import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useLibrary } from './hooks/useLibrary.js';
import { useClubs } from './hooks/useClubs.js';
import { useToast } from './hooks/useIsMobile.js';
import { Sidebar, BottomNav } from './components/layout/Sidebar.jsx';
import { Toast } from './components/ui/index.jsx';
import { CcLogoSvg } from './components/ui/CcLogo.jsx';
import AuthPage    from './pages/AuthPage.jsx';
import HomePage    from './pages/HomePage.jsx';
import SearchPage  from './pages/SearchPage.jsx';
import ClubsPage   from './pages/ClubsPage/index.jsx';
import ProfilePage from './pages/ProfilePage/index.jsx';
import UserProfilePage from './pages/UserProfilePage/index.jsx';
import SettingsModal   from './pages/SettingsModal.jsx';
import { supabase }    from './lib/supabase.js';

export default function App() {
  const { authState, currentUser, setCurrentUser, theme, saveTheme, login, register, logout, updateAvatar } = useAuth();
  const { items: libraryItems, setItems: setLibraryItems, addItem, updateStatus, saveReview, removeItem } = useLibrary(currentUser?.id);
  const { clubs: userClubs, setClubs: setUserClubs, createClub, joinClub } = useClubs(currentUser?.id, currentUser?.username);
  const { toast, showToast } = useToast();

  const [page, setPage]               = useState('home');
  const [viewingProfile, setViewingProfile]   = useState(null);
  const [previousPage, setPreviousPage]       = useState('home');
  const [showSettings, setShowSettings]       = useState(false);
  const [initialClub, setInitialClub]         = useState(null);
  const [initialClubTab, setInitialClubTab]   = useState(null);
  const [initialProfileTab, setInitialProfileTab] = useState(null);
  const [followedUsers, setFollowedUsers]     = useState([]);

  // Load followed users when currentUser is set
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase.from('users').select('following').eq('id', currentUser.id).single()
      .then(({ data }) => setFollowedUsers(data?.following ?? []));
  }, [currentUser?.id]);

  const navSetPage = useCallback((p) => {
    if (p === 'clubs') { setInitialClub(null); setInitialClubTab(null); }
    if (p !== 'profile') setInitialProfileTab(null);
    setViewingProfile(null);
    setPage(p);
  }, []);

  const openUserProfile = useCallback((username) => {
    if (username === currentUser?.username) { navSetPage('profile'); return; }
    setPreviousPage(page);
    setViewingProfile(username);
    setPage('user-profile');
  }, [currentUser?.username, page, navSetPage]);

  const goToClub = useCallback((club) => {
    setInitialClub(club);
    setInitialClubTab(null);
    setViewingProfile(null);
    setInitialProfileTab(null);
    setPage('clubs');
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setPage('home');
  }, [logout]);

  const navPage = page === 'user-profile' ? 'profile' : page;

  // ── Loading screen ──
  if (authState === 'loading') return (
    <div className="auth-loading-screen">
      <div className="auth-loading-icon"><CcLogoSvg size={64} /></div>
      <div className="auth-loading-label">Chargement…</div>
      <div className="auth-loading-bar"><div className="auth-loading-bar-fill" /></div>
    </div>
  );

  // ── Auth screens ──
  if (authState !== 'app') return (
    <>
      <AuthPage login={login} register={register} showToast={showToast} />
      <Toast toast={toast} />
    </>
  );

  // ── Main app ──
  return (
    <div className="app-shell">
      <Sidebar
        page={navPage}
        setPage={navSetPage}
        currentUser={currentUser}
        onSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
        clubs={userClubs}
        onGoToClub={goToClub}
      />

      <main className="main-content">
        {page === 'home' && (
          <HomePage
            currentUser={currentUser}
            userClubs={userClubs}
            libraryItems={libraryItems}
            showToast={showToast}
            setPage={setPage}
            setActiveClubFromHome={(club, tab) => { setInitialClub(club); setInitialClubTab(tab ?? null); }}
            setInitialProfileTab={setInitialProfileTab}
            onViewProfile={openUserProfile}
            followedUsers={followedUsers}
          />
        )}
        {page === 'search' && (
          <SearchPage
            currentUser={currentUser}
            userClubs={userClubs}
            libraryItems={libraryItems}
            addToLibrary={addItem}
            showToast={showToast}
          />
        )}
        {page === 'clubs' && (
          <ClubsPage
            currentUser={currentUser}
            userClubs={userClubs}
            setUserClubs={setUserClubs}
            libraryItems={libraryItems}
            showToast={showToast}
            initialClub={initialClub}
            initialTab={initialClubTab}
            followedUsers={followedUsers}
            onViewProfile={openUserProfile}
            createClub={createClub}
            joinClub={joinClub}
          />
        )}
        {page === 'profile' && (
          <ProfilePage
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            libraryItems={libraryItems}
            setLibraryItems={setLibraryItems}
            updateStatus={updateStatus}
            saveReview={saveReview}
            removeItem={removeItem}
            updateAvatar={updateAvatar}
            onSettings={() => setShowSettings(true)}
            onLogout={handleLogout}
            showToast={showToast}
            initialProfileTab={initialProfileTab}
          />
        )}
        {page === 'user-profile' && viewingProfile && (
          <UserProfilePage
            username={viewingProfile}
            currentUser={currentUser}
            onBack={() => navSetPage(previousPage)}
            libraryItems={libraryItems}
            setLibraryItems={setLibraryItems}
            addToLibrary={addItem}
            userClubs={userClubs}
            showToast={showToast}
            followedUsers={followedUsers}
            setFollowedUsers={setFollowedUsers}
          />
        )}
      </main>

      <BottomNav page={navPage} setPage={navSetPage} />

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          currentUser={currentUser}
          theme={theme}
          saveTheme={saveTheme}
          libraryItems={libraryItems}
          setLibraryItems={setLibraryItems}
          showToast={showToast}
          updateAvatar={updateAvatar}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
