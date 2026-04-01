import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { contentCache } from '../lib/contentCache.js';

// Map Supabase snake_case row → camelCase item shape used throughout the UI
function rowToItem(row) {
  return {
    id:          row.content_id,
    type:        row.type,
    title:       row.title,
    cover:       row.cover ?? '',
    year:        row.year ?? '',
    status:      row.status,
    artist:      row.artist ?? '',
    author:      row.author ?? '',
    developer:   row.developer ?? '',
    publisher:   row.publisher ?? '',
    genres:      row.genres ?? [],
    rating:      row.rating ?? '',
    synopsis:    row.synopsis ?? '',
    mediaType:   row.media_type ?? '',
    pages:       row.pages ?? '',
    myReview:    row.my_review ?? null,
    addedAt:     row.added_at,
    updatedAt:   row.updated_at,
  };
}

function itemToRow(item, userId) {
  return {
    content_id:  item.id,
    user_id:     userId,
    type:        item.type,
    title:       item.title,
    cover:       item.cover ?? null,
    year:        item.year ?? null,
    status:      item.status,
    artist:      item.artist ?? null,
    author:      item.author ?? null,
    developer:   item.developer ?? null,
    publisher:   item.publisher ?? null,
    genres:      item.genres ?? [],
    rating:      item.rating ? Number(item.rating) : null,
    synopsis:    item.synopsis ?? null,
    media_type:  item.mediaType ?? null,
    pages:       item.pages ? Number(item.pages) : null,
    my_review:   item.myReview ?? null,
  };
}

export function useLibrary(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initial load + realtime subscription
  useEffect(() => {
    if (!userId) { setItems([]); return; }
    setLoading(true);

    // Initial fetch
    supabase.from('library_items').select('*').eq('user_id', userId)
      .then(({ data }) => {
        const mapped = (data ?? []).map(rowToItem);
        setItems(mapped);
        contentCache.populateFromLibrary(mapped);
        setLoading(false);
      });

    // Realtime
    const channel = supabase
      .channel(`library:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'library_items',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const item = rowToItem(payload.new);
          setItems(prev => [...prev.filter(i => i.id !== item.id), item]);
          contentCache.set(item);
        } else if (payload.eventType === 'UPDATE') {
          const item = rowToItem(payload.new);
          setItems(prev => prev.map(i => i.id === item.id ? item : i));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== payload.old.content_id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const addItem = useCallback(async (item, status) => {
    if (!userId) return;
    const row = { ...itemToRow({ ...item, status }, userId) };
    const { error } = await supabase.from('library_items').insert(row);
    if (error) throw error;
    contentCache.set(item);
  }, [userId]);

  const updateStatus = useCallback(async (itemId, newStatus) => {
    if (!userId) return;
    const { error } = await supabase.from('library_items')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('content_id', itemId).eq('user_id', userId);
    if (error) throw error;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
  }, [userId]);

  const saveReview = useCallback(async (itemId, review) => {
    if (!userId) return;
    const { error } = await supabase.from('library_items')
      .update({ my_review: review, updated_at: new Date().toISOString() })
      .eq('content_id', itemId).eq('user_id', userId);
    if (error) throw error;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, myReview: review } : i));
  }, [userId]);

  const removeItem = useCallback(async (itemId) => {
    if (!userId) return;
    const { error } = await supabase.from('library_items')
      .delete().eq('content_id', itemId).eq('user_id', userId);
    if (error) throw error;
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, [userId]);

  return { items, setItems, loading, addItem, updateStatus, saveReview, removeItem };
}
