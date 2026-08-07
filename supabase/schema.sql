-- Supabase schema for IR Souvenir Stock Management System
-- Generated and refined from Sheet2 logbook analysis.

create extension if not exists pgcrypto;

create sequence if not exists public.item_code_seq start 1;

create or replace function public.generate_item_code()
returns text
language plpgsql
as $$
declare
  next_no bigint;
begin
  select nextval('public.item_code_seq') into next_no;
  return 'BRG' || lpad(next_no::text, 4, '0');
end;
$$;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  item_code text not null unique,
  item_name text not null,
  description text,
  initial_stock integer not null default 0 check (initial_stock >= 0),
  current_stock integer not null default 0 check (current_stock >= 0),
  minimum_stock integer not null default 10 check (minimum_stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete restrict,
  transaction_date date not null,
  transaction_type text not null check (transaction_type in ('IN', 'OUT')),
  quantity integer not null check (quantity > 0),
  pic text,
  description text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function public.sync_item_code_sequence()
returns void
language plpgsql
as $$
declare
  max_no bigint;
begin
  select coalesce(max(nullif(regexp_replace(item_code, '\D', '', 'g'), '')::bigint), 0) into max_no
  from public.items;
  perform setval('public.item_code_seq', greatest(max_no, 1), true);
end;
$$;

create or replace function public.set_item_code()
returns trigger
language plpgsql
as $$
begin
  if new.item_code is null or btrim(new.item_code) = '' then
    new.item_code = public.generate_item_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_item_code on public.items;
create trigger trg_set_item_code
before insert on public.items
for each row execute function public.set_item_code();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_items_updated_at on public.items;
create trigger trg_items_updated_at
before update on public.items
for each row execute function public.set_updated_at();

create or replace function public.apply_stock_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.transaction_type = 'IN' then
    update public.items
    set current_stock = current_stock + new.quantity
    where id = new.item_id;
  elsif new.transaction_type = 'OUT' then
    update public.items
    set current_stock = current_stock - new.quantity
    where id = new.item_id
      and current_stock >= new.quantity;

    if not found then
      raise exception 'Insufficient stock for item %', new.item_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_stock_transaction on public.transactions;
create trigger trg_apply_stock_transaction
before insert on public.transactions
for each row execute function public.apply_stock_transaction();

alter table public.items enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "authenticated users can read items" on public.items;
create policy "authenticated users can read items"
on public.items for select
to authenticated
using (true);

drop policy if exists "authenticated users can manage items" on public.items;
create policy "authenticated users can manage items"
on public.items for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can read transactions" on public.transactions;
create policy "authenticated users can read transactions"
on public.transactions for select
to authenticated
using (true);

drop policy if exists "authenticated users can create transactions" on public.transactions;
create policy "authenticated users can create transactions"
on public.transactions for insert
to authenticated
with check (true);

-- Run this after importing seed data so the next generated code continues after BRG0048.
select public.sync_item_code_sequence();

