-- Outfit AI schema
-- Run this in Supabase SQL editor after creating a new project.

create extension if not exists "uuid-ossp";

create type clothing_category as enum ('top', 'bottom', 'jacket', 'dress', 'shoes', 'accessory');

create table if not exists clothes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category clothing_category not null,
  image_path text not null,           -- Storage path in 'clothes' bucket
  primary_color text,                 -- HEX like "#a31b2f"
  color_tags text[] default '{}',     -- e.g. {"navy","white"}
  style_tags text[] default '{}',     -- e.g. {"casual","formal"}
  season_tags text[] default '{}',    -- {"spring","summer","fall","winter"}
  min_temp_c int,                     -- appropriate min temperature
  max_temp_c int,
  description text,
  created_at timestamptz default now()
);

create index if not exists clothes_user_id_idx on clothes(user_id);
create index if not exists clothes_category_idx on clothes(user_id, category);

create table if not exists wear_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clothing_ids uuid[] not null,
  worn_on date not null,
  weather jsonb,
  created_at timestamptz default now()
);

create index if not exists wear_log_user_date_idx on wear_log(user_id, worn_on desc);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_lat double precision,
  home_lon double precision,
  created_at timestamptz default now()
);

-- Row level security
alter table clothes enable row level security;
alter table wear_log enable row level security;
alter table profiles enable row level security;

create policy "own clothes select" on clothes for select using (auth.uid() = user_id);
create policy "own clothes insert" on clothes for insert with check (auth.uid() = user_id);
create policy "own clothes update" on clothes for update using (auth.uid() = user_id);
create policy "own clothes delete" on clothes for delete using (auth.uid() = user_id);

create policy "own wear_log select" on wear_log for select using (auth.uid() = user_id);
create policy "own wear_log insert" on wear_log for insert with check (auth.uid() = user_id);
create policy "own wear_log delete" on wear_log for delete using (auth.uid() = user_id);

create policy "own profile select" on profiles for select using (auth.uid() = id);
create policy "own profile upsert" on profiles for insert with check (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

-- Storage bucket for clothing photos (private)
insert into storage.buckets (id, name, public)
values ('clothes', 'clothes', false)
on conflict (id) do nothing;

create policy "user reads own clothing images"
on storage.objects for select
using (bucket_id = 'clothes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "user uploads own clothing images"
on storage.objects for insert
with check (bucket_id = 'clothes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "user deletes own clothing images"
on storage.objects for delete
using (bucket_id = 'clothes' and (storage.foldername(name))[1] = auth.uid()::text);
