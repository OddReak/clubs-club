import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url    = new URL(req.url);
  const q      = url.searchParams.get('q');
  const tracks = url.searchParams.get('tracks');

  try {
    if (tracks) {
      // Fetch album tracks
      const res  = await fetch(`https://itunes.apple.com/lookup?id=${tracks}&entity=song&limit=50`);
      const data = await res.json();
      const songs = (data.results || []).filter((r: any) => r.wrapperType === 'track').map((t: any) => ({
        trackNumber: t.trackNumber,
        trackName:   t.trackName,
        trackTimeMillis: t.trackTimeMillis,
      }));
      return new Response(JSON.stringify(songs), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (!q) return new Response(JSON.stringify([]), { headers: { ...CORS, 'Content-Type': 'application/json' } });

    const res  = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=40&country=fr`);
    const data = await res.json();
    const items = (data.results || []).map((a: any) => ({
      id:           'itunes_' + a.collectionId,
      externalId:    a.collectionId,
      type:         'music',
      title:         a.collectionName,
      artist:        a.artistName,
      cover:        (a.artworkUrl100 || '').replace('100x100', '600x600'),
      year:         (a.releaseDate || '').slice(0, 4),
      genres:       a.primaryGenreName ? [a.primaryGenreName] : [],
      rating:       '',
      synopsis:     '',
      rawData:      { collectionType: a.collectionType, collectionId: a.collectionId },
    }));
    return new Response(JSON.stringify(items), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify([]), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
