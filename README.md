# Clubs Club — Vite + React + Supabase

## Stack
- **Frontend**: Vite + React 18
- **Database**: Supabase (Postgres)
- **Auth**: Supabase Auth (email/password)
- **Realtime**: Supabase Realtime (Postgres CDC)
- **Storage**: Supabase Storage (avatars)
- **API**: Supabase Edge Functions (Deno) → TMDB, IGDB, Steam, iTunes, Hardcover

---

## Setup

### 1. Clone & install
```bash
git clone …
cd clubs-club
npm install
cp .env.example .env
```

### 2. Create Supabase project
1. Go to [supabase.com](https://supabase.com) → New project
2. Copy **Project URL** and **anon key** into `.env`

### 3. Run the migration
In Supabase dashboard → SQL Editor, paste and run:
```
supabase/migrations/001_initial_schema.sql
```

### 4. Set Edge Function secrets
```bash
supabase secrets set TMDB_API_KEY=your_key
supabase secrets set IGDB_CLIENT_ID=your_id
supabase secrets set IGDB_CLIENT_SECRET=your_secret
supabase secrets set HARDCOVER_API_KEY=your_key
# Steam API key (optional — Steam search works without it for basic use)
supabase secrets set STEAM_API_KEY=your_key
```

### 5. Deploy Edge Functions
```bash
supabase functions deploy search-games
supabase functions deploy search-cinema
supabase functions deploy search-music
supabase functions deploy search-books
```

### 6. Storage bucket
In Supabase dashboard → Storage → New bucket:
- Name: `avatars`
- Public: ✅

Add policy: **Allow authenticated uploads**
```sql
CREATE POLICY "avatar_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatar_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

### 7. Run locally
```bash
npm run dev
```

---

## Project structure
```
src/
├── lib/
│   ├── supabase.js       Supabase client + callFunction()
│   ├── contentCache.js   localStorage + Supabase write-through cache
│   └── api.js            External search (calls Edge Functions)
├── hooks/
│   ├── useAuth.js        Auth + theme sync
│   ├── useLibrary.js     Library items + Realtime
│   ├── useClubs.js       Clubs membership
│   └── useIsMobile.js    Breakpoint + useToast
├── constants/index.js    All shared constants
├── components/
│   ├── icons/            SVG icons
│   ├── ui/               Shared UI primitives
│   └── layout/           Sidebar + BottomNav
├── pages/
│   ├── AuthPage.jsx
│   ├── HomePage.jsx
│   ├── SearchPage.jsx
│   ├── ClubsPage/
│   ├── ProfilePage/
│   ├── UserProfilePage/
│   └── SettingsModal.jsx
├── styles/index.css
└── App.jsx
supabase/
├── migrations/001_initial_schema.sql
└── functions/
    ├── search-games/
    ├── search-cinema/
    ├── search-music/
    └── search-books/
```

---

## Key differences from Firebase version
| Firebase | Supabase |
|---|---|
| Firestore documents | Postgres tables with proper relations |
| `db.collection().onSnapshot()` | `supabase.channel().on('postgres_changes')` |
| Firebase Auth | Supabase Auth |
| Firebase Storage | Supabase Storage |
| Cloud Functions (Node.js) | Edge Functions (Deno) |
| No RLS | Row Level Security on every table |
| Client-side JOINs | SQL JOINs in queries |
