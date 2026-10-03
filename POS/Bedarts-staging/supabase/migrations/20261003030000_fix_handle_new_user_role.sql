-- Security fix (C-1): hard-code role = 'cashier' in handle_new_user().
--
-- The previous version read role from raw_user_meta_data:
--   COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')
-- Any attacker who signs up via the Supabase auth API with
-- { data: { role: 'admin' } } in the request body received an admin profile.
--
-- Storefront customer signups are handled by the separate
-- create_customer_profile_on_signup() trigger which writes to
-- customer_profiles, not profiles.  There is no 'customer' role in
-- profiles.role; handle_new_user() is exclusively for POS staff accounts.
-- Hard-coding 'cashier' is the correct floor: an admin promotes the account
-- to manager/admin/etc. in the dashboard after creation.
--
-- All other behaviour from migration_v5.sql is preserved:
--   SET row_security = off  — needed because trigger fires as supabase_auth_admin
--   SET search_path = public, auth
--   ON CONFLICT (id) DO NOTHING  — re-invite safety
--   is_active = true

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set row_security = off
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.email
    ),
    'cashier',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
