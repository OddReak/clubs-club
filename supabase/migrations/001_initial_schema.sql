-- ═══════════════════════════════════════════════════════════════
-- CLUBS CLUB — Initial Schema
-- Run once in Supabase SQL editor or via `supabase db push`
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ───────────────────────────────────────────────────────────────
-- USERS
-- Supabase Auth handles passwords; we store the public profile here.
-- ───────────────────────────────────────────────────────────────
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  avatar_url  text,
  theme       jsonb default '{"dark":"dark-forest","light":"light-mint","mode":"dark","syncWithSystem":false}'::jsonb,
  following   text[] default '{}',        -- array of usernames this user follows
  push_token  text,
  notif_prefs jsonb default '{"comments":true,"likes":true,"followers":true,"meetingCreated":true,"meetingReminder":true}'::jsonb,
  push_enabled boolean default false,
  created_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────
-- LIBRARY ITEMS
-- One row per (user, content). No separate "content" table needed —
-- the content data is denormalized here AND in content_cache.
-- ───────────────────────────────────────────────────────────────
create table public.library_items (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.users(id) on delete cascade,
  content_id  text not null,              -- e.g. "tmdb_123", "igdb_456", "book_hc_789"
  type        text not null,              -- games | music | cinema | books
  title       text not null,
  cover       text,
  year        text,
  status      text not null,             -- playing | completed | wishlist | etc.
  -- Content-type-specific metadata (denormalized for instant reads)
  artist      text,
  author      text,
  developer   text,
  publisher   text,
  genres      text[] default '{}',
  rating      numeric(4,1),
  synopsis    text,
  media_type  text,                       -- movie | tv (cinema only)
  pages       int,
  -- User-specific data
  my_review   jsonb,                      -- { score, text, isFavorite, pros, cons, … }
  review_likes jsonb default '{}'::jsonb, -- { username: true }
  season_reviews jsonb default '{}'::jsonb,
  added_at    timestamptz default now(),
  updated_at  timestamptz default now(),

  unique (user_id, content_id)
);

create index library_items_user_id_idx  on public.library_items(user_id);
create index library_items_type_idx     on public.library_items(type);
create index library_items_content_id_idx on public.library_items(content_id);

-- ───────────────────────────────────────────────────────────────
-- CONTENT CACHE
-- Shared cross-user metadata. Written on first add, refreshed
-- every 30 days. Makes search instant for known content.
-- ───────────────────────────────────────────────────────────────
create table public.content_cache (
  id          text primary key,           -- same as content_id above
  type        text not null,
  title       text not null,
  cover       text,
  year        text,
  artist      text,
  author      text,
  developer   text,
  publisher   text,
  genres      text[] default '{}',
  rating      numeric(4,1),
  synopsis    text,
  media_type  text,
  pages       int,
  cached_at   timestamptz default now()
);

create index content_cache_type_idx  on public.content_cache(type);
create index content_cache_title_idx on public.content_cache using gin(to_tsvector('simple', title));

-- ───────────────────────────────────────────────────────────────
-- CLUBS
-- ───────────────────────────────────────────────────────────────
create table public.clubs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null,             -- 'Jeux vidéo' | 'Musique' | 'Cinéma' | 'Lecture'
  invite_code  text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_by   uuid references public.users(id),
  meeting_date text,                      -- ISO date string
  meeting_time text,
  created_at   timestamptz default now()
);

create index clubs_invite_code_idx on public.clubs(invite_code);

-- ───────────────────────────────────────────────────────────────
-- CLUB MEMBERS
-- ───────────────────────────────────────────────────────────────
create table public.club_members (
  id       bigint generated always as identity primary key,
  club_id  uuid not null references public.clubs(id) on delete cascade,
  user_id  uuid not null references public.users(id) on delete cascade,
  username text not null,
  role     text not null default 'member', -- admin | member
  joined_at timestamptz default now(),

  unique (club_id, user_id)
);

create index club_members_club_id_idx on public.club_members(club_id);
create index club_members_user_id_idx on public.club_members(user_id);

-- ───────────────────────────────────────────────────────────────
-- CLUB CONTENT
-- Items proposed / active in a club. contentId links to content_cache.
-- ───────────────────────────────────────────────────────────────
create table public.club_content (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs(id) on delete cascade,
  content_id   text not null,
  type         text not null,
  title        text not null,
  cover        text,
  year         text,
  artist       text,
  author       text,
  developer    text,
  genres       text[] default '{}',
  rating       numeric(4,1),
  synopsis     text,
  media_type   text,
  status       text not null default 'proposed', -- proposed | active | completed
  proposed_by  text not null,
  ratings      jsonb default '{}'::jsonb,        -- { username: score }
  likes        text[] default '{}',              -- [username, …]
  proposed_at  timestamptz default now(),
  updated_at   timestamptz default now()
);

create index club_content_club_id_idx   on public.club_content(club_id);
create index club_content_status_idx    on public.club_content(status);

-- ───────────────────────────────────────────────────────────────
-- CLUB REVIEWS
-- Per-member reviews on club content (separate from personal library).
-- Replaces the nested Firestore subcollection.
-- ───────────────────────────────────────────────────────────────
create table public.club_reviews (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references public.clubs(id) on delete cascade,
  club_content_id uuid not null references public.club_content(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  username        text not null,
  score           numeric(4,1),
  text            text,
  pros            text,
  cons            text,
  reaction        text,
  is_favorite     boolean default false,
  likes           text[] default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  unique (club_content_id, user_id)
);

create index club_reviews_club_content_id_idx on public.club_reviews(club_content_id);
create index club_reviews_user_id_idx         on public.club_reviews(user_id);

-- ───────────────────────────────────────────────────────────────
-- CLUB REVIEW COMMENTS
-- ───────────────────────────────────────────────────────────────
create table public.club_review_comments (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.club_reviews(id) on delete cascade,
  club_id    uuid not null references public.clubs(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  username   text not null,
  text       text not null,
  created_at timestamptz default now()
);

create index club_review_comments_review_id_idx on public.club_review_comments(review_id);

-- ───────────────────────────────────────────────────────────────
-- CLUB ACTIVITY
-- Denormalized feed — faster than joining 5 tables for the home feed.
-- ───────────────────────────────────────────────────────────────
create table public.club_activity (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references public.clubs(id) on delete cascade,
  club_name     text not null,
  username      text not null,
  action        text not null,             -- 'a proposé' | 'a noté' | 'a commenté' | etc.
  content_title text,
  content_type  text,
  score         numeric(4,1),
  meeting_date  text,
  meeting_time  text,
  actor_type    text default 'club',
  created_at    timestamptz default now()
);

create index club_activity_club_id_idx  on public.club_activity(club_id);
create index club_activity_created_idx  on public.club_activity(created_at desc);

-- ───────────────────────────────────────────────────────────────
-- PRESENCE  (online/offline per club)
-- ───────────────────────────────────────────────────────────────
create table public.presence (
  club_id   uuid not null references public.clubs(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  username  text not null,
  online    boolean default false,
  last_seen timestamptz default now(),

  primary key (club_id, user_id)
);

-- ───────────────────────────────────────────────────────────────
-- PERSONAL REVIEW COMMENTS  (comments on personal library reviews)
-- ───────────────────────────────────────────────────────────────
create table public.personal_review_comments (
  id           uuid primary key default gen_random_uuid(),
  library_item_id bigint not null references public.library_items(id) on delete cascade,
  commenter_id uuid not null references public.users(id) on delete cascade,
  username     text not null,
  text         text not null,
  created_at   timestamptz default now()
);

create index prc_library_item_idx on public.personal_review_comments(library_item_id);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

alter table public.users                   enable row level security;
alter table public.library_items           enable row level security;
alter table public.content_cache           enable row level security;
alter table public.clubs                   enable row level security;
alter table public.club_members            enable row level security;
alter table public.club_content            enable row level security;
alter table public.club_reviews            enable row level security;
alter table public.club_review_comments    enable row level security;
alter table public.club_activity           enable row level security;
alter table public.presence                enable row level security;
alter table public.personal_review_comments enable row level security;

-- users: anyone can read profiles, only owner can write
create policy "users_read_all"   on public.users for select using (true);
create policy "users_write_own"  on public.users for update using (auth.uid() = id);

-- library_items: owner full access, others can read for profile views
create policy "lib_read_any"    on public.library_items for select using (true);
create policy "lib_insert_own"  on public.library_items for insert with check (auth.uid() = user_id);
create policy "lib_update_own"  on public.library_items for update using (auth.uid() = user_id);
create policy "lib_delete_own"  on public.library_items for delete using (auth.uid() = user_id);

-- content_cache: anyone logged in can read/write
create policy "cache_read"   on public.content_cache for select using (auth.role() = 'authenticated');
create policy "cache_write"  on public.content_cache for all   using (auth.role() = 'authenticated');

-- clubs: members can read, anyone can create
create policy "clubs_read"   on public.clubs for select using (true);
create policy "clubs_insert" on public.clubs for insert with check (auth.role() = 'authenticated');
create policy "clubs_update_admin" on public.clubs for update using (
  exists (
    select 1 from public.club_members
    where club_id = clubs.id and user_id = auth.uid() and role = 'admin'
  )
);

-- club_members: members can read, authenticated can insert (join), admin can delete
create policy "members_read"   on public.club_members for select using (true);
create policy "members_insert" on public.club_members for insert with check (auth.role() = 'authenticated');
create policy "members_delete" on public.club_members for delete using (
  auth.uid() = user_id or
  exists (select 1 from public.club_members m2
    where m2.club_id = club_members.club_id and m2.user_id = auth.uid() and m2.role = 'admin')
);

-- club_content: club members can read/write
create policy "club_content_read"  on public.club_content for select using (
  exists (select 1 from public.club_members where club_id = club_content.club_id and user_id = auth.uid())
);
create policy "club_content_write" on public.club_content for all using (
  exists (select 1 from public.club_members where club_id = club_content.club_id and user_id = auth.uid())
);

-- club_reviews: club members can read/write
create policy "club_reviews_read"  on public.club_reviews for select using (
  exists (select 1 from public.club_members where club_id = club_reviews.club_id and user_id = auth.uid())
);
create policy "club_reviews_write" on public.club_reviews for all using (
  exists (select 1 from public.club_members where club_id = club_reviews.club_id and user_id = auth.uid())
);

-- club_review_comments
create policy "comments_read"  on public.club_review_comments for select using (
  exists (select 1 from public.club_members where club_id = club_review_comments.club_id and user_id = auth.uid())
);
create policy "comments_write" on public.club_review_comments for all using (
  exists (select 1 from public.club_members where club_id = club_review_comments.club_id and user_id = auth.uid())
);

-- club_activity
create policy "activity_read"  on public.club_activity for select using (
  exists (select 1 from public.club_members where club_id = club_activity.club_id and user_id = auth.uid())
);
create policy "activity_insert" on public.club_activity for insert with check (
  exists (select 1 from public.club_members where club_id = club_activity.club_id and user_id = auth.uid())
);

-- presence
create policy "presence_read"  on public.presence for select using (true);
create policy "presence_write" on public.presence for all using (auth.role() = 'authenticated');

-- personal review comments
create policy "prc_read"   on public.personal_review_comments for select using (true);
create policy "prc_insert" on public.personal_review_comments for insert with check (auth.uid() = commenter_id);
create policy "prc_delete" on public.personal_review_comments for delete using (auth.uid() = commenter_id);

-- ═══════════════════════════════════════════════════════════════
-- REALTIME PUBLICATION
-- Opt tables into Supabase Realtime
-- ═══════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.library_items;
alter publication supabase_realtime add table public.club_content;
alter publication supabase_realtime add table public.club_reviews;
alter publication supabase_realtime add table public.club_review_comments;
alter publication supabase_realtime add table public.club_activity;
alter publication supabase_realtime add table public.presence;
alter publication supabase_realtime add table public.personal_review_comments;

-- ═══════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Full-text search across content_cache (used by Edge Function fallback)
create or replace function search_content_cache(query text, content_type text)
returns setof public.content_cache
language sql stable
as $$
  select * from public.content_cache
  where type = content_type
    and to_tsvector('simple', title) @@ plainto_tsquery('simple', query)
  order by ts_rank(to_tsvector('simple', title), plainto_tsquery('simple', query)) desc
  limit 20;
$$;

-- Upsert presence row (called by client on focus/blur)
create or replace function upsert_presence(p_club_id uuid, p_user_id uuid, p_username text, p_online boolean)
returns void language plpgsql security definer as $$
begin
  insert into public.presence (club_id, user_id, username, online, last_seen)
  values (p_club_id, p_user_id, p_username, p_online, now())
  on conflict (club_id, user_id)
  do update set online = p_online, last_seen = now();
end;
$$;
