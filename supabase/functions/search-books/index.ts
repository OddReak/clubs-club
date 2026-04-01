import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const HARDCOVER_KEY = Deno.env.get('HARDCOVER_API_KEY')!;

const QUERY = `
query SearchBooks($query: String!) {
  books(where: { title: { _ilike: $query } }, limit: 30, order_by: { users_count: desc }) {
    id title release_year pages description
    image { url }
    genres
    contributions { author { name } role }
  }
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url   = new URL(req.url);
  const title = url.searchParams.get('title') ?? '';
  if (!title) return new Response(JSON.stringify({ data: { books: [] } }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  try {
    const res = await fetch('https://api.hardcover.app/v1/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${HARDCOVER_KEY}` },
      body: JSON.stringify({ query: QUERY, variables: { query: `%${title}%` } }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ data: { books: [] } }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
