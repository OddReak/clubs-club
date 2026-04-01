import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// Convenience: Edge Function base URL
export const fnUrl = (name) =>
  `${supabaseUrl}/functions/v1/${name}`;

// Authenticated fetch to Edge Functions
export async function callFunction(name, params = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${fnUrl(name)}${query ? '?' + query : ''}`, {
    headers: {
      Authorization: `Bearer ${session?.access_token ?? supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Function ${name} failed: ${res.status}`);
  return res.json();
}
