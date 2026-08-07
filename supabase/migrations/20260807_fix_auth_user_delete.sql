-- Fix Auth user deletion when transactions reference auth.users.
-- Keeps transaction history intact and clears created_by when an Auth user is deleted.

alter table public.transactions
  drop constraint if exists transactions_created_by_fkey;

alter table public.transactions
  add constraint transactions_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;
