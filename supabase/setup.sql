-- ============================================================
-- 濟州 app 資料庫設定
-- 用法：
--   1. 先把最下面「在這裡換成你們的通關碼」改成你們自己的通關碼
--      （建議三個詞以上，例如：橘子-懸崖-大方魚）
--   2. 全部複製，貼到 Supabase 左側 SQL Editor，按 Run
-- 重跑也沒關係：已經建好的東西會略過，通關碼會更新成新的。
-- ============================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- ---------- 資料表 ----------

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 通關碼只存雜湊值，放在不對外開放的 private schema
create table if not exists private.trip_codes (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  code_hash text not null
);

create table if not exists public.members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  color text not null default '#EE7F1B',
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.days (
  trip_id uuid not null references public.trips(id) on delete cascade,
  day date not null,
  title text,
  tagline text,
  theme text,
  rain_note text,
  weather_lat double precision,
  weather_lng double precision,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (trip_id, day)
);

create table if not exists public.stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day date not null,
  plan text not null default 'sun' check (plan in ('sun', 'rain')),
  position integer not null default 0,
  time text,
  name text not null check (char_length(name) between 1 and 80),
  name_ko text,
  lat double precision,
  lng double precision,
  category text,
  duration_min integer,
  drive_min integer,
  tips jsonb not null default '[]'::jsonb,
  options jsonb,
  extra jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
create index if not exists stops_trip_day on public.stops (trip_id, day, plan, position);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  scope text not null default 'shared' check (scope in ('shared', 'mine')),
  owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  group_name text not null default '其他',
  name text not null check (char_length(name) between 1 and 60),
  done boolean not null default false,
  assignee uuid references auth.users(id) on delete set null,
  position integer not null default 0,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
create index if not exists checklist_trip on public.checklist_items (trip_id, scope);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stop_id uuid references public.stops(id) on delete set null,
  day date,
  stop_name text,
  author_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  note text check (note is null or char_length(note) <= 500),
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists memories_trip on public.memories (trip_id, day, created_at);

-- 記錄是誰最後改的
create or replace function private.touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists touch_days on public.days;
create trigger touch_days before insert or update on public.days for each row execute function private.touch();
drop trigger if exists touch_stops on public.stops;
create trigger touch_stops before insert or update on public.stops for each row execute function private.touch();
drop trigger if exists touch_checklist on public.checklist_items;
create trigger touch_checklist before insert or update on public.checklist_items for each row execute function private.touch();

-- ---------- 加入旅行 ----------

create or replace function public.is_member(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m where m.trip_id = t and m.user_id = auth.uid()
  );
$$;

create or replace function public.join_trip(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
  n integer;
  palette text[] := array['#EE7F1B', '#2F64A8', '#4E8A5B', '#B4547E', '#6B6F8A', '#C08A1E'];
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'name required';
  end if;
  select c.trip_id into t
    from private.trip_codes c
   where c.code_hash = extensions.crypt(lower(trim(p_code)), c.code_hash)
   limit 1;
  if t is null then
    raise exception 'wrong code' using errcode = '28000';
  end if;
  select count(*) into n from public.members m where m.trip_id = t;
  insert into public.members (trip_id, user_id, display_name, color)
  values (t, auth.uid(), left(trim(p_name), 20), palette[1 + (n % 6)])
  on conflict (trip_id, user_id) do update set display_name = excluded.display_name;
  return t;
end $$;

revoke all on function public.join_trip(text, text) from public, anon;
grant execute on function public.join_trip(text, text) to authenticated;
revoke all on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;

-- ---------- 權限：只有加入旅行的人看得到、改得到 ----------

alter table public.trips enable row level security;
alter table public.members enable row level security;
alter table public.days enable row level security;
alter table public.stops enable row level security;
alter table public.checklist_items enable row level security;
alter table public.memories enable row level security;

drop policy if exists "members read trip" on public.trips;
create policy "members read trip" on public.trips for select to authenticated
  using (public.is_member(id));

drop policy if exists "members read members" on public.members;
create policy "members read members" on public.members for select to authenticated
  using (public.is_member(trip_id));
drop policy if exists "rename myself" on public.members;
create policy "rename myself" on public.members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "members edit days" on public.days;
create policy "members edit days" on public.days for all to authenticated
  using (public.is_member(trip_id)) with check (public.is_member(trip_id));

drop policy if exists "members edit stops" on public.stops;
create policy "members edit stops" on public.stops for all to authenticated
  using (public.is_member(trip_id)) with check (public.is_member(trip_id));

drop policy if exists "checklist read" on public.checklist_items;
create policy "checklist read" on public.checklist_items for select to authenticated
  using (public.is_member(trip_id) and (scope = 'shared' or owner_id = auth.uid()));
drop policy if exists "checklist insert" on public.checklist_items;
create policy "checklist insert" on public.checklist_items for insert to authenticated
  with check (public.is_member(trip_id) and (scope = 'shared' or owner_id = auth.uid()));
drop policy if exists "checklist update" on public.checklist_items;
create policy "checklist update" on public.checklist_items for update to authenticated
  using (public.is_member(trip_id) and (scope = 'shared' or owner_id = auth.uid()))
  with check (public.is_member(trip_id) and (scope = 'shared' or owner_id = auth.uid()));
drop policy if exists "checklist delete" on public.checklist_items;
create policy "checklist delete" on public.checklist_items for delete to authenticated
  using (public.is_member(trip_id) and (scope = 'shared' or owner_id = auth.uid()));

drop policy if exists "memories read" on public.memories;
create policy "memories read" on public.memories for select to authenticated
  using (public.is_member(trip_id));
drop policy if exists "memories write own" on public.memories;
create policy "memories write own" on public.memories for insert to authenticated
  with check (public.is_member(trip_id) and author_id = auth.uid());
drop policy if exists "memories edit own" on public.memories;
create policy "memories edit own" on public.memories for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "memories delete own" on public.memories;
create policy "memories delete own" on public.memories for delete to authenticated
  using (author_id = auth.uid());

-- ---------- 照片：私人 bucket，路徑以旅行 id 開頭 ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.photo_trip_member(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  t uuid;
begin
  begin
    t := split_part(object_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return public.is_member(t);
end $$;
revoke all on function public.photo_trip_member(text) from public, anon;
grant execute on function public.photo_trip_member(text) to authenticated;

drop policy if exists "members view photos" on storage.objects;
create policy "members view photos" on storage.objects for select to authenticated
  using (bucket_id = 'memories' and public.photo_trip_member(name));
drop policy if exists "members upload photos" on storage.objects;
create policy "members upload photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'memories' and public.photo_trip_member(name));
drop policy if exists "delete own photos" on storage.objects;
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'memories' and owner_id::text = (select auth.uid())::text);

-- ---------- 即時同步：別人改了，你的畫面馬上更新 ----------

do $$
declare
  tbl text;
begin
  foreach tbl in array array['members', 'days', 'stops', 'checklist_items', 'memories'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

-- ---------- 這次的旅行和通關碼 ----------

insert into public.trips (id, name)
values ('7c1e7d0a-2f3b-4c5d-9e8f-26112026a001', '濟州 11/26–29')
on conflict (id) do nothing;

insert into private.trip_codes (trip_id, code_hash)
values (
  '7c1e7d0a-2f3b-4c5d-9e8f-26112026a001',
  extensions.crypt(lower(trim('在這裡換成你們的通關碼')), extensions.gen_salt('bf'))
)
on conflict (trip_id) do update set code_hash = excluded.code_hash;
