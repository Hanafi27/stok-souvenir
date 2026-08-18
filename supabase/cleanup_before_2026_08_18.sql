-- Cleanup all old inventory data before 18 August 2026.
-- Run this in Supabase SQL Editor.
--
-- Scope:
-- 1. Delete transactions with transaction_date before 2026-08-18.
-- 2. Delete items created before 2026-08-18.
-- 3. Delete any transactions attached to those old items first, so item deletion does not fail.
--
-- This is permanent. Review the affected rows first if needed.

begin;

with
  old_items as (
    select id
    from public.items
    where created_at < timestamptz '2026-08-18 00:00:00+07'
  ),
  deleted_transactions as (
    delete from public.transactions t
    where t.transaction_date < date '2026-08-18'
       or exists (
        select 1
        from old_items oi
        where oi.id = t.item_id
      )
    returning 1
  ),
  deleted_items as (
    delete from public.items i
    where exists (
      select 1
      from old_items oi
      where oi.id = i.id
    )
    returning 1
  )
select
  (select count(*) from deleted_transactions) as deleted_transactions,
  (select count(*) from deleted_items) as deleted_items;

select public.sync_item_code_sequence();

commit;
