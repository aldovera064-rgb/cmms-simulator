-- Phase 1 RBAC migration.
-- Additive only: keeps backward compatibility and existing data.

alter table if exists admins
  add column if not exists role text default 'admin';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admins_role_allowed_values'
  ) then
    alter table admins
      add constraint admins_role_allowed_values
      check (role in ('god', 'admin', 'supervisor', 'technician', 'viewer'));
  end if;
end $$;

update admins
set role = 'admin'
where role is null;

update admins
set role = 'god'
where lower(username) = 'aldovera';
