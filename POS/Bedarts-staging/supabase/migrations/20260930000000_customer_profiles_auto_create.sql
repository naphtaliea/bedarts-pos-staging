-- Auto-create customer_profiles for every auth user, and backfill existing users.
--
-- Rationale: the storefront's initializeOrder RPC requires a customer_profiles
-- row keyed by auth.uid(). Creating the row client-side after signup is racy
-- (session may not be attached yet, so RLS auth.uid() = id fails) and skippable
-- (if the insert throws, the user still exists in auth.users with no profile).
-- A SECURITY DEFINER trigger runs synchronously with the auth.users INSERT,
-- bypasses RLS, and can't be missed.

-- ── 1. Trigger function ───────────────────────────────────────────────────────
create or replace function public.create_customer_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customer_profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 2. Trigger ────────────────────────────────────────────────────────────────
drop trigger if exists create_customer_profile_on_signup on auth.users;

create trigger create_customer_profile_on_signup
  after insert on auth.users
  for each row execute function public.create_customer_profile_on_signup();

-- ── 3. Backfill existing users ────────────────────────────────────────────────
-- Every auth user that lacks a customer_profiles row gets one now. Uses the
-- same fallback chain as the trigger. Staff users get profiles too; harmless.
insert into public.customer_profiles (id, full_name, phone)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  u.raw_user_meta_data->>'phone'
from auth.users u
left join public.customer_profiles cp on cp.id = u.id
where cp.id is null;
