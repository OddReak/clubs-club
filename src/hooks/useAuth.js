import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { DEFAULT_THEME } from '../constants/index.js';

export function useAuth() {
  const [authState, setAuthState]   = useState('loading'); // 'loading'|'welcome'|'app'
  const [currentUser, setCurrentUser] = useState(null);   // { id, username, avatarUrl }
  const [theme, setThemeState]        = useState(DEFAULT_THEME);

  // Apply theme to <body>
  const applyTheme = useCallback((themeId) => {
    document.body.className = themeId;
    const meta = document.getElementById('theme-color-meta');
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim();
    if (meta && accent) meta.content = accent;
  }, []);

  const resolveTheme = useCallback((t) => {
    if (!t) return DEFAULT_THEME.dark;
    if (t.syncWithSystem) {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return dark ? t.dark : t.light;
    }
    return t.mode === 'dark' ? t.dark : t.light;
  }, []);

  // Save theme to Supabase (fire-and-forget)
  const saveTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    applyTheme(resolveTheme(newTheme));
    if (currentUser?.id) {
      supabase.from('users').update({ theme: newTheme }).eq('id', currentUser.id).then(() => {});
    }
  }, [currentUser?.id, applyTheme, resolveTheme]);

  // Bootstrap after Supabase session is confirmed
  const loadProfile = useCallback(async (userId) => {
  let profile = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, avatar_url, theme')
      .eq('id', userId)
      .single();
    
    console.log('loadProfile attempt', attempt, { data, error, userId });
    
    if (data) { profile = data; break; }
    if (attempt === 0) await new Promise(r => setTimeout(r, 800));
  }

  if (!profile) return null;
  const user = { id: profile.id, username: profile.username, avatarUrl: profile.avatar_url ?? '' };
  setCurrentUser(user);
  const t = { ...DEFAULT_THEME, ...(profile.theme ?? {}) };
  setThemeState(t);
  applyTheme(resolveTheme(t));
  return user;
}, [applyTheme, resolveTheme]);

  useEffect(() => {
    applyTheme('dark-forest'); // default while loading

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setAuthState('loading');
        try {
          const user = await loadProfile(session.user.id);
          setAuthState(user ? 'app' : 'welcome');
        } catch (e) {
          console.error('loadProfile error:', e);
          setAuthState('welcome');
      }
      } else {
        setCurrentUser(null);
        setThemeState(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME.dark);
        setAuthState('welcome');
      }
    });
    return () => subscription.unsubscribe();
  }, [loadProfile, applyTheme]);

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const register = useCallback(async (username, password) => {
    const email = `${username.toLowerCase()}@clubsclub.app`;

    const { data: existing } = await supabase
      .from('users').select('id').eq('username', username).single();
    if (existing) throw new Error('Ce pseudo est déjà pris');

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Insert profile immediately, before onAuthStateChange can fire loadProfile
    await supabase.from('users').insert({
      id: data.user.id,
      username,
      theme: DEFAULT_THEME,
    });
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateAvatar = useCallback(async (file) => {
    if (!currentUser?.id || !file) return;
    const ext  = file.name.split('.').pop();
    const path = `avatars/${currentUser.id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) throw upErr;
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
    setCurrentUser(prev => ({ ...prev, avatarUrl: publicUrl }));
    return publicUrl;
  }, [currentUser?.id]);

  return {
    authState, currentUser, setCurrentUser,
    theme, saveTheme,
    login, register, logout, updateAvatar,
  };
}
