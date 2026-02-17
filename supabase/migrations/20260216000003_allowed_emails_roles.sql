alter table public.allowed_emails
  add column if not exists role text not null default 'member';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'allowed_emails_role_check'
  ) then
    alter table public.allowed_emails
      add constraint allowed_emails_role_check
      check (role in ('member', 'admin', 'super_admin'));
  end if;
end $$;

with first_super_admin as (
  select email
  from public.allowed_emails
  order by created_at asc nulls last, email asc
  limit 1
)
update public.allowed_emails
set role = 'super_admin'
where email = (select email from first_super_admin)
  and not exists (
    select 1
    from public.allowed_emails
    where role = 'super_admin'
  );
