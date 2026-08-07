-- Allow authenticated users to delete transaction history rows.
-- Needed for bulk delete in the History page.

drop policy if exists "authenticated users can delete transactions" on public.transactions;
create policy "authenticated users can delete transactions"
on public.transactions for delete
to authenticated
using (true);
