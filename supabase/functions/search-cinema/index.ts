import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const TMDB_KEY = Deno.env.get('TMDB_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const q   = url.searchParams.get('q') ?? '';
  if (!q) return new Response(JSON.stringify({ results: [] }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  try {
    const res  = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=fr-FR&page=1`);
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ results: [] }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
