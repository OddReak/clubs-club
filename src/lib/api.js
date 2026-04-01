import { callFunction } from './supabase.js';

// TMDB genre map (kept client-side to avoid a round-trip)
const TMDB_GENRES = {
  28:'Action',12:'Aventure',16:'Animation',35:'Comédie',80:'Crime',
  99:'Documentaire',18:'Drame',10751:'Famille',14:'Fantastique',
  36:'Histoire',27:'Horreur',10402:'Musique',9648:'Mystère',
  10749:'Romance',878:'Science-fiction',10770:'Téléfilm',
  53:'Thriller',10752:'Guerre',37:'Western',
  10759:'Action & Adventure',10762:'Kids',10763:'News',
  10764:'Reality',10765:'Sci-Fi & Fantasy',10766:'Soap',
  10767:'Talk',10768:'War & Politics',
};

export async function apiSearch(type, query) {
  if (!query || query.length < 2) return [];

  try {
    if (type === 'games' || type === 'games_igdb') {
      const fnName = type === 'games' ? 'search-games' : 'search-games';
      const params = { name: query, ...(type === 'games_igdb' ? { source: 'igdb' } : {}) };
      const data = await callFunction(fnName, params);
      return Array.isArray(data) ? data : [];
    }

    if (type === 'music') {
      const data = await callFunction('search-music', { q: query });
      return Array.isArray(data) ? data : [];
    }

    if (type === 'cinema') {
      const data = await callFunction('search-cinema', { q: query });
      return (data?.results || [])
        .filter(x => x.media_type === 'movie' || x.media_type === 'tv')
        .slice(0, 30)
        .map(x => ({
          id:        'tmdb_' + x.id,
          externalId: x.id,
          type:      'cinema',
          title:     x.title || x.name || '',
          cover:     x.poster_path ? `https://image.tmdb.org/t/p/w342${x.poster_path}` : '',
          year:      (x.release_date || x.first_air_date || '').slice(0, 4),
          mediaType: x.media_type,
          rating:    x.vote_average ? x.vote_average.toFixed(1) : '',
          director:  '',
          genres:    (x.genre_ids || []).slice(0, 3).map(id => TMDB_GENRES[id]).filter(Boolean),
          synopsis:  x.overview || '',
        }));
    }

    if (type === 'books') {
      const data = await callFunction('search-books', { title: query });
      const raw = data?.data?.books || [];
      return raw.map(b => ({
        id:         'book_hc_' + b.id,
        externalId:  b.id,
        type:       'books',
        title:       b.title || '',
        cover:       b.image?.url || '',
        year:        b.release_year ? String(b.release_year) : '',
        author:      (b.contributions || []).map(c => c.author?.name).filter(Boolean).slice(0, 2).join(', '),
        genres:      b.genres || [],
        pages:       b.pages || '',
        synopsis:    b.description || '',
      }));
    }

  } catch (e) {
    console.error('apiSearch error:', e);
    return [];
  }
  return [];
}

export async function fetchItunesTracks(collectionId) {
  try {
    const data = await callFunction('search-music', { tracks: collectionId });
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function fetchBookSynopsis(title, author, hardcoverSynopsis = '') {
  if (hardcoverSynopsis) return hardcoverSynopsis;
  try {
    let q = `intitle:${encodeURIComponent(title)}`;
    if (author) q += `+inauthor:${encodeURIComponent(author)}`;
    const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5`);
    const data = await res.json();
    const vol  = (data.items || []).find(v => v.volumeInfo?.description);
    if (vol?.volumeInfo?.description) return vol.volumeInfo.description;
  } catch {}
  return '';
}
