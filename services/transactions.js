import { supabase, ensureSupabaseConfigured, getCurrentUser } from './supabase.js';
import { currentMonthRange } from '../utils/format.js?v=data-sync-20260818';

const TRANSACTION_VISIBLE_FROM = '2026-08-18';

function maxDate(a, b) {
  return a > b ? a : b;
}

function isItemMenuStockMovement(row) {
  const pic = String(row.pic || '').trim().toLowerCase();
  const description = String(row.description || '').trim().toLowerCase();
  return pic === 'menu barang'
    || description.includes('dari menu barang')
    || description.startsWith('stok awal')
    || description.startsWith('koreksi stok');
}

export async function createTransaction(payload) {
  ensureSupabaseConfigured();
  const user = await getCurrentUser();
  const row = {
    item_id: payload.item_id,
    transaction_date: payload.transaction_date,
    transaction_type: payload.transaction_type,
    quantity: Number(payload.quantity),
    pic: payload.pic || '',
    description: payload.description || '',
    created_by: user?.id || null,
  };
  const { data, error } = await supabase.from('transactions').insert(row).select('*, items(item_code, item_name, current_stock)').single();
  if (error) throw error;
  return data;
}

export async function listTransactions(filters = {}) {
  ensureSupabaseConfigured();
  let query = supabase
    .from('transactions')
    .select('*, items(item_code, item_name)')
    .gte('transaction_date', TRANSACTION_VISIBLE_FROM)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.date) query = query.eq('transaction_date', filters.date);
  if (filters.month) {
    const [year, month] = filters.month.split('-').map(Number);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`;
    query = query.gte('transaction_date', maxDate(start, TRANSACTION_VISIBLE_FROM)).lte('transaction_date', end);
  }
  if (filters.item_id) query = query.eq('item_id', filters.item_id);
  if (filters.transaction_type) query = query.eq('transaction_type', filters.transaction_type);

  const { data, error } = await query;
  if (error) throw error;
  const search = (filters.search || '').toLowerCase();
  if (!search) return data || [];
  return (data || []).filter((row) => [row.items?.item_code, row.items?.item_name, row.pic, row.description]
    .join(' ').toLowerCase().includes(search));
}

export async function deleteTransaction(id) {
  ensureSupabaseConfigured();
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteTransactions(ids = []) {
  for (const id of ids) await deleteTransaction(id);
}
export async function dashboardStats() {
  ensureSupabaseConfigured();
  const { start, end } = currentMonthRange();
  const visibleStart = maxDate(start, TRANSACTION_VISIBLE_FROM);
  const [{ data: items, error: itemError }, { data: tx, error: txError }] = await Promise.all([
    supabase.from('items').select('*').eq('is_active', true),
    supabase.from('transactions').select('*, items(item_name, is_active, current_stock)').gte('transaction_date', visibleStart).lte('transaction_date', end),
  ]);
  if (itemError) throw itemError;
  if (txError) throw txError;

  const allItems = items || [];
  const monthTx = (tx || []).filter((row) => !isItemMenuStockMovement(row));
  return {
    totalItems: allItems.length,
    currentStock: allItems.reduce((sum, item) => sum + Number(item.current_stock || 0), 0),
    incomingMonth: monthTx.filter((row) => row.transaction_type === 'IN').reduce((sum, row) => sum + Number(row.quantity), 0),
    outgoingMonth: monthTx.filter((row) => row.transaction_type === 'OUT').reduce((sum, row) => sum + Number(row.quantity), 0),
    lowStockItems: allItems.filter((item) => Number(item.current_stock) <= Number(item.minimum_stock || 10)),
    monthTransactions: monthTx,
    items: allItems,
  };
}

export async function reportTransactions(period, value) {
  ensureSupabaseConfigured();
  let query = supabase
    .from('transactions')
    .select('*, items(item_code, item_name, description, initial_stock, current_stock)')
    .gte('transaction_date', TRANSACTION_VISIBLE_FROM)
    .order('transaction_date', { ascending: true });
  if (period === 'daily') query = query.eq('transaction_date', value);
  if (period === 'monthly') {
    const [year, month] = value.split('-').map(Number);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    query = query.gte('transaction_date', maxDate(start, TRANSACTION_VISIBLE_FROM)).lte('transaction_date', end);
  }
  if (period === 'yearly') query = query.gte('transaction_date', maxDate(`${value}-01-01`, TRANSACTION_VISIBLE_FROM)).lte('transaction_date', `${value}-12-31`);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).filter((row) => !isItemMenuStockMovement(row));
}


