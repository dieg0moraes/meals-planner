-- Enable RLS and policies to allow authenticated users to read/write their own data

-- Enable Row Level Security
-- alter table if exists public.profiles enable row level security;
alter table if exists public.weekly_meals enable row level security;
alter table if exists public.shopping_lists enable row level security;

-- Profiles: a user can read and write only their own profile row
/* drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own" on public.profiles
  for select
  using (auth.uid() = auth_user_id);

drop policy if exists "profile_insert_own" on public.profiles;
create policy "profile_insert_own" on public.profiles
  for insert
  with check (auth.uid() = auth_user_id);

drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles
  for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id); */

-- Helper predicate: map auth.uid() to profile.id via profiles.auth_user_id
-- Weekly meals: can read and write rows linked to own profile
drop policy if exists "weekly_meals_select_own" on public.weekly_meals;
create policy "weekly_meals_select_own" on public.weekly_meals
  for select
  using (exists (
    select 1 from public.profiles p
    where p.id = weekly_meals.user_id and p.auth_user_id = auth.uid()
  ));

drop policy if exists "weekly_meals_insert_own" on public.weekly_meals;
create policy "weekly_meals_insert_own" on public.weekly_meals
  for insert
  with check (exists (
    select 1 from public.profiles p
    where p.id = user_id and p.auth_user_id = auth.uid()
  ));

drop policy if exists "weekly_meals_update_own" on public.weekly_meals;
create policy "weekly_meals_update_own" on public.weekly_meals
  for update
  using (exists (
    select 1 from public.profiles p
    where p.id = weekly_meals.user_id and p.auth_user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = weekly_meals.user_id and p.auth_user_id = auth.uid()
  ));

-- Shopping lists: can read and write rows linked to own profile
drop policy if exists "shopping_lists_select_own" on public.shopping_lists;
create policy "shopping_lists_select_own" on public.shopping_lists
  for select
  using (exists (
    select 1 from public.profiles p
    where p.id = shopping_lists.user_id and p.auth_user_id = auth.uid()
  ));

drop policy if exists "shopping_lists_insert_own" on public.shopping_lists;
create policy "shopping_lists_insert_own" on public.shopping_lists
  for insert
  with check (exists (
    select 1 from public.profiles p
    where p.id = user_id and p.auth_user_id = auth.uid()
  ));

drop policy if exists "shopping_lists_update_own" on public.shopping_lists;
create policy "shopping_lists_update_own" on public.shopping_lists
  for update
  using (exists (
    select 1 from public.profiles p
    where p.id = shopping_lists.user_id and p.auth_user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = shopping_lists.user_id and p.auth_user_id = auth.uid()
  ));

-- (Optional) Enable Realtime on these tables so client subscriptions receive updates
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'weekly_meals';
  if not found then
    -- Publication exists by default; ensure tables are added
    execute 'alter publication supabase_realtime add table public.weekly_meals';
  end if;
end $$;

do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shopping_lists';
  if not found then
    execute 'alter publication supabase_realtime add table public.shopping_lists';
  end if;
end $$;


