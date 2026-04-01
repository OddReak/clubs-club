import { supabase } from './supabase.js';

const PREFIX  = 'cc_v1_';
const TTL_MS  = 30 * 24 * 60 * 60 * 1000; // 30 days

// Fields that are user-specific and must never be cached
const STRIP = ['myReview','pros','cons','reaction','liked','addedAt','updatedAt','status','rawData'];

function toMeta(item) {
  const meta = { ...item };
  STRIP.forEach(k => delete meta[k]);
  return meta;
}

function lsKey(id) { return PREFIX + id; }

function lsGet(id) {
  try {
    const raw = localStorage.getItem(lsKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function lsSet(id, data) {
  try { localStorage.setItem(lsKey(id), JSON.stringify(data)); } catch {}
}

export const contentCache = {
  // ── Write (localStorage immediately, Supabase if stale) ──────
  set(item) {
    if (!item?.id) return;
    const meta = { ...toMeta(item), cachedAt: Date.now() };
    lsSet(item.id, meta);

    const existing = lsGet(item.id);
    const age = existing ? Date.now() - (existing.cachedAt ?? 0) : Infinity;
    if (age > TTL_MS) {
      // fire-and-forget — don't block the UI
      supabase.from('content_cache').upsert({
        id: item.id,
        type: item.type,
        title: item.title,
        cover: item.cover ?? null,
        year: item.year ?? null,
        artist: item.artist ?? null,
        author: item.author ?? null,
        developer: item.developer ?? null,
        publisher: item.publisher ?? null,
        genres: item.genres ?? [],
        rating: item.rating ? Number(item.rating) : null,
        synopsis: item.synopsis ?? null,
        media_type: item.mediaType ?? null,
        pages: item.pages ? Number(item.pages) : null,
        cached_at: new Date().toISOString(),
      }).then(() => {}).catch(() => {});
    }
  },

  // ── Read from localStorage (sync) ────────────────────────────
  get(id) { return lsGet(id); },

  // ── Instant local search ──────────────────────────────────────
  searchLocal(query, type) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const hits = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(PREFIX)) continue;
        let item;
        try { item = JSON.parse(localStorage.getItem(key)); } catch { continue; }
        if (!item || item.type !== type || !item.title) continue;
        const hay = [item.title, item.artist, item.author, item.developer]
          .filter(Boolean).join(' ').toLowerCase();
        if (hay.includes(q)) hits.push(item);
      }
    } catch {}
    hits.sort((a, b) => {
      const aS = a.title.toLowerCase().startsWith(q) ? 0 : 1;
      const bS = b.title.toLowerCase().startsWith(q) ? 0 : 1;
      return aS - bS || a.title.localeCompare(b.title);
    });
    return hits.slice(0, 20);
  },

  // ── Seed from library (called after realtime sync) ────────────
  populateFromLibrary(items) {
    items.forEach(item => {
      if (!item?.id) return;
      try {
        if (!localStorage.getItem(lsKey(item.id))) this.set(item);
      } catch {}
    });
  },

  // ── Cross-device: pull from Supabase and warm local ──────────
  async fetchFromSupabase(id) {
    try {
      const { data } = await supabase
        .from('content_cache')
        .select('*')
        .eq('id', id)
        .single();
      if (data) lsSet(id, { ...data, cachedAt: Date.now() });
      return data ?? null;
    } catch { return null; }
  },
};
