-- Extend the auto-create-profile trigger to handle anonymous users.
-- Anonymous auth users have no email, so the split_part fallback returns NULL
-- and the NOT NULL constraint on full_name blocks the insert. Fall back to
-- "Guest" for anonymous users; real names come from metadata (via signup
-- form) once the user upgrades to a real account.

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
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Guest'
    ),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
