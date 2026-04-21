-- Safe, additive migration for CMMS industrial upgrade.
-- Keeps backward compatibility by only adding columns/tables/constraints if missing.

alter table if exists assets
  add column if not exists serial_number text,
  add column if not exists criticality text,
  add column if not exists location text;

alter table if exists technicians
  add column if not exists active boolean default true;

alter table if exists work_orders
  add column if not exists asset_id uuid,
  add column if not exists technician_id uuid,
  add column if not exists started_at timestamp,
  add column if not exists completed_at timestamp,
  add column if not exists description text,
  add column if not exists root_cause text,
  add column if not exists action_taken text,
  add column if not exists qr_code text;

alter table if exists spare_parts
  add column if not exists min_stock int;

create table if not exists work_order_parts (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid,
  spare_part_id uuid,
  quantity int,
  created_at timestamp default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'work_orders_asset_id_fkey'
  ) then
    alter table work_orders
      add constraint work_orders_asset_id_fkey
      foreign key (asset_id) references assets(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'work_orders_technician_id_fkey'
  ) then
    alter table work_orders
      add constraint work_orders_technician_id_fkey
      foreign key (technician_id) references technicians(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'work_order_parts_work_order_id_fkey'
  ) then
    alter table work_order_parts
      add constraint work_order_parts_work_order_id_fkey
      foreign key (work_order_id) references work_orders(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'work_order_parts_spare_part_id_fkey'
  ) then
    alter table work_order_parts
      add constraint work_order_parts_spare_part_id_fkey
      foreign key (spare_part_id) references spare_parts(id);
  end if;
end $$;
