-- Raise the session cap and exempt customers entirely.
--
-- Why: the original 3-session cap (migration 20260925000000) protected shared
-- physical tills from indefinite session accumulation. In practice it now
-- kicks staff out of POS whenever they sign into the storefront (and vice
-- versa) since a single admin account may legitimately hold sessions across:
--   POS till + POS phone + storefront browser + stale prior session.
--
-- New rules:
--   * Customers (no row in public.profiles) — uncapped. They use their own
--     devices; the shared-till concern doesn't apply.
--   * Staff — 5 sessions. Enough for two POS devices + storefront + backup,
--     still bounded so a lost/stolen device eventually loses its slot.

create or replace function public.enforce_max_sessions_per_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_staff boolean;
  v_cap integer := 5;
begin
  select exists (
    select 1 from public.profiles where id = new.user_id
  ) into v_is_staff;

  if not v_is_staff then
    return new;
  end if;

  delete from auth.sessions
  where user_id = new.user_id
    and id not in (
      select id from auth.sessions
      where user_id = new.user_id
      order by coalesce(updated_at, created_at) desc
      limit v_cap
    );
  return new;
end;
$$;
