-- Security + bug fix: stop handle_new_user() from creating POS staff profiles
-- for storefront signups.
--
-- Found 2026-10-04 by live test: a plain public signUp() (storefront customer)
-- received an ACTIVE profiles row with role='cashier', i.e. a POS staff account,
-- because handle_new_user() fires on every auth.users insert and the storefront
-- shares the same auth project. The same trigger also made guest checkout fail
-- ("Database error creating anonymous user"): anonymous users have no email or
-- metadata, so full_name was NULL and violated NOT NULL on profiles.full_name.
--
-- POS staff creation already writes profiles explicitly through the admin client
-- (app/(dashboard)/settings/actions.ts upserts id/full_name/role/is_active after
-- createUser / inviteUserByEmail), so the trigger is not needed for staff.
-- Customer rows are created by create_customer_profile_on_signup() (separate
-- trigger -> customer_profiles) and are unaffected.
--
-- The function is kept as a no-op so the existing trigger binding keeps working.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set row_security = off
set search_path = public, auth
as $$
begin
  return new;
end;
$$;
