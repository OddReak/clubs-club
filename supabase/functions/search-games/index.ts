// supabase/functions/search-games/index.ts
// Replaces Firebase Functions: searchGamesSteam + searchGames
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const IGDB_CLIENT_ID     = Deno.env.get('IGDB_CLIENT_ID')!;
const IGDB_CLIENT_SECRET = Deno.env.get('IGDB_CLIENT_SECRET')!;
const STEAM_API_KEY      = Deno.env.get('STEAM_API_KEY')!;

// Cache IGDB token in memory across invocations (Deno isolate lifetime)
let igdbToken: string | null = null;
let igdbTokenExpiry = 0;

async function getIgdbToken(): Promise<string> {
  if (igdbToken && Date.now() < igdbTokenExpiry) return igdbToken;
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${IGDB_CLIENT_ID}&client_secret=${IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  const data = await res.json();
  igdbToken = data.access_token;
  igdbTokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return igdbToken!;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url    = new URL(req.url);
  const name   = url.searchParams.get('name') ?? '';
  const source = url.searchParams.get('source') ?? 'steam';

  if (!name) return new Response(JSON.stringify([]), { headers: { ...CORS, 'Content-Type': 'application/json' } });

  try {
    if (source === 'steam') {
      // Steam store search
      const res  = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&cc=fr&l=fr`);
      const data = await res.json();
      const items = (data.items || []).slice(0, 30).map((g: any) => ({
        id:         'steam_' + g.id,
        steam_appid: g.id,
        type:       'games',
        title:      g.name,
        cover:      g.tiny_image?.replace('capsule_sm_120', 'library_600x900') || '',
        year:       '',
        genres:     [],
        rating:     '',
        developer:  '',
        publisher:  '',
        synopsis:   '',
      }));
      return new Response(JSON.stringify(items), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // IGDB
    const token = await getIgdbToken();
    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: { 'Client-ID': IGDB_CLIENT_ID, 'Authorization': `Bearer ${token}`, 'Content-Type': 'text/plain' },
      body: `search "${name}"; fields name,cover.url,first_release_date,genres.name,rating,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,summary; limit 30;`,
    });
    const games = await res.json();
    const items = (Array.isArray(games) ? games : []).map((g: any) => {
      let cover = g.cover?.url || '';
      if (cover.startsWith('//')) cover = 'https:' + cover;
      cover = cover.replace('t_thumb', 't_cover_big');
      return {
        id:         'igdb_' + g.id,
        externalId:  g.id,
        type:       'games',
        title:      g.name,
        cover,
        year:       g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear().toString() : '',
        genres:     (g.genres || []).map((gn: any) => typeof gn === 'object' ? gn.name : gn).filter(Boolean).slice(0, 4),
        rating:     g.rating ? (g.rating / 10).toFixed(1) : '',
        developer:  (g.involved_companies || []).filter((ic: any) => ic.developer).map((ic: any) => ic.company?.name).filter(Boolean).slice(0, 2).join(', '),
        publisher:  (g.involved_companies || []).filter((ic: any) => ic.publisher).map((ic: any) => ic.company?.name).filter(Boolean).slice(0, 1).join(', '),
        synopsis:   g.summary || '',
      };
    });
    return new Response(JSON.stringify(items), { headers: { ...CORS, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('search-games error:', e);
    return new Response(JSON.stringify([]), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
