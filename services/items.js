import { supabase, ensureSupabaseConfigured } from './supabase.js';

export async function listItems(search = '') {
  ensureSupabaseConfigured();
  let query = supabase.from('items').select('*').eq('is_active', true).order('item_code', { ascending: true });
  if (search) query = query.or(`item_code.ilike.%${search}%,item_name.ilike.%${search}%,description.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getActiveItems() {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.from('items').select('*').eq('is_active', true).order('item_name');
  if (error) throw error;
  return data || [];
}

export async function getItem(id) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createItem(payload) {
  ensureSupabaseConfigured();
  const initialStock = Number(payload.initial_stock || 0);
  const currentStock = payload.current_stock === '' || payload.current_stock == null
    ? initialStock
    : Number(payload.current_stock || 0);
  const row = {
    item_name: payload.item_name,
    description: payload.description || '',
    initial_stock: initialStock,
    current_stock: 0,
    minimum_stock: Number(payload.minimum_stock || 10),
    is_active: true,
  };
  const { data, error } = await supabase.from('items').insert(row).select().single();
  if (error) throw error;
  if (currentStock > 0) {
    await createStockMovement(data.id, 'IN', currentStock, 'Stok awal dari menu Barang');
    return getItem(data.id);
  }
  return data;
}

export async function updateItem(id, payload) {
  ensureSupabaseConfigured();
  const currentItem = await getItem(id);
  const nextStock = Number(payload.current_stock || 0);
  const currentStock = Number(currentItem.current_stock || 0);
  const stockDelta = nextStock - currentStock;
  const row = {
    item_name: payload.item_name,
    description: payload.description || '',
    initial_stock: Number(payload.initial_stock || 0),
    minimum_stock: Number(payload.minimum_stock || 10),
    is_active: Boolean(payload.is_active),
  };
  const { data, error } = await supabase.from('items').update(row).eq('id', id).select().single();
  if (error) throw error;
  if (stockDelta !== 0) {
    await createStockMovement(
      id,
      stockDelta > 0 ? 'IN' : 'OUT',
      Math.abs(stockDelta),
      stockDelta > 0 ? 'Koreksi stok bertambah dari menu Barang' : 'Koreksi stok berkurang dari menu Barang'
    );
    return getItem(id);
  }
  return data;
}

export async function countItemTransactions(id) {
  ensureSupabaseConfigured();
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', id);
  if (error) throw error;
  return count || 0;
}

export async function deactivateItem(id) {
  ensureSupabaseConfigured();
  const { error } = await supabase.from('items').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

export async function deleteItem(id) {
  ensureSupabaseConfigured();
  const count = await countItemTransactions(id);
  if (count > 0) {
    await deactivateItem(id);
    return { deleted: false, deactivated: true };
  }
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
  return { deleted: true, deactivated: false };
}

export async function listItemTransactions(id, limit = 5) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('item_id', id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
export async function getNextItemCode() {
  ensureSupabaseConfigured();
  const { data: rows, error } = await supabase.from('items').select('item_code').order('item_code', { ascending: false }).limit(1);
  if (error) throw error;
  const last = rows?.[0]?.item_code || 'BRG0000';
  const next = Number(last.replace(/\D/g, '')) + 1;
  return `BRG${String(next).padStart(4, '0')}`;
}

async function createStockMovement(itemId, type, quantity, description) {
  const { error } = await supabase.from('transactions').insert({
    item_id: itemId,
    transaction_date: todayLocal(),
    transaction_type: type,
    quantity,
    pic: 'Menu Barang',
    description,
  });
  if (error) throw error;
}

function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}






