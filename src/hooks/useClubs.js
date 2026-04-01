import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

export function useClubs(userId, username) {
  const [clubs, setClubs] = useState([]);

  useEffect(() => {
    if (!userId || !username) { setClubs([]); return; }

    supabase
      .from('club_members')
      .select(`
        role,
        clubs (
          id, name, type,
          club_members ( count )
        )
      `)
      .eq('user_id', userId)
      .then(({ data }) => {
        const mapped = (data ?? []).map(m => ({
          id:          m.clubs.id,
          name:        m.clubs.name,
          type:        m.clubs.type,
          memberCount: m.clubs.club_members?.[0]?.count ?? 1,
          role:        m.role,
          userUsername: username,
        }));
        setClubs(mapped);
      });
  }, [userId, username]);

  const createClub = useCallback(async (name, type) => {
    if (!userId || !username) return;
    const { data: club, error } = await supabase
      .from('clubs').insert({ name, type }).select().single();
    if (error) throw error;
    await supabase.from('club_members').insert({
      club_id: club.id, user_id: userId, username, role: 'admin',
    });
    const newClub = { id: club.id, name, type, memberCount: 1, role: 'admin', userUsername: username };
    setClubs(prev => [...prev, newClub]);
    return newClub;
  }, [userId, username]);

  const joinClub = useCallback(async (inviteCode) => {
    if (!userId || !username) return;
    const { data: club } = await supabase
      .from('clubs').select('*').eq('invite_code', inviteCode.trim()).single();
    if (!club) throw new Error('Code invalide');
    const { data: existing } = await supabase
      .from('club_members').select('club_id')
      .eq('club_id', club.id).eq('user_id', userId).single();
    if (existing) throw new Error('Vous êtes déjà membre de ce club');
    await supabase.from('club_members').insert({
      club_id: club.id, user_id: userId, username, role: 'member',
    });
    const { count } = await supabase
      .from('club_members').select('*', { count: 'exact', head: true })
      .eq('club_id', club.id);
    const newClub = { id: club.id, name: club.name, type: club.type,
      memberCount: count ?? 1, role: 'member', userUsername: username };
    setClubs(prev => [...prev, newClub]);
    return newClub;
  }, [userId, username]);

  return { clubs, setClubs, createClub, joinClub };
}
