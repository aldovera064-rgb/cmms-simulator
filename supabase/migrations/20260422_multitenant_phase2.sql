alter table if exists admins
  add column if not exists role text default 'admin';

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid,
  created_at timestamp default now()
);

update companies
set name = 'Sample 1'
where name is null;

create table if not exists user_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company_id uuid,
  role text,
  created_at timestamp default now()
);

alter table if exists assets add column if not exists company_id uuid;
alter table if exists work_orders add column if not exists company_id uuid;
alter table if exists technicians add column if not exists company_id uuid;
alter table if exists spare_parts add column if not exists company_id uuid;
alter table if exists pm_plans add column if not exists company_id uuid;

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  content text,
  company_id uuid,
  created_at timestamp default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_name = 'general_notes'
  ) then
    insert into notes (id, content, company_id, created_at)
    select gen_random_uuid(), note, company_id, created_at
    from general_notes g
    where not exists (
      select 1
      from notes n
      where n.content = g.note
        and coalesce(n.company_id::text, '') = coalesce(g.company_id::text, '')
        and coalesce(n.created_at::text, '') = coalesce(g.created_at::text, '')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_companies_company_id_fkey'
  ) then
    alter table user_companies
      add constraint user_companies_company_id_fkey
      foreign key (company_id) references companies(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notes_company_id_fkey'
  ) then
    alter table notes
      add constraint notes_company_id_fkey
      foreign key (company_id) references companies(id);
  end if;
end $$;
