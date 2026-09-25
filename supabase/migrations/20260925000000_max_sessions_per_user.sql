-- Enforce a maximum of 3 active sessions per user.
-- When a new session is created, delete any sessions beyond the 3 most recent
-- for that user. Deleting auth.sessions cascades to auth.refresh_tokens, so the
-- kicked device can no longer refresh its access token (grace period = access
-- token TTL, typically ~1 hour).

create or replace function public.enforce_max_sessions_per_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.sessions
  where user_id = new.user_id
    and id not in (
      select id from auth.sessions
      where user_id = new.user_id
      order by coalesce(updated_at, created_at) desc
      limit 3
    );
  return new;
end;
$$;

drop trigger if exists enforce_max_sessions_per_user on auth.sessions;

create trigger enforce_max_sessions_per_user
after insert on auth.sessions
for each row
execute function public.enforce_max_sessions_per_user();
