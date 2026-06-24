import { supabase } from '../config/supabase.js';

// ─── Generic helpers ─────────────────────────────────────────

export async function dbInsert(table, data) {
  const { data: row, error } = await supabase.from(table).insert(data).select().single();
  if (error) throw error;
  return row;
}

export async function dbInsertMany(table, rows) {
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) throw error;
  return data;
}

export async function dbFindOne(table, match) {
  const { data, error } = await supabase.from(table).select('*').match(match).single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data || null;
}

export async function dbFindMany(table, match = {}, options = {}) {
  let query = supabase.from(table).select(options.select || '*');
  if (Object.keys(match).length) query = query.match(match);
  if (options.order) query = query.order(options.order, { ascending: options.ascending ?? true });
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function dbUpdate(table, match, updates) {
  const { data, error } = await supabase.from(table).update(updates).match(match).select().single();
  if (error) throw error;
  return data;
}

export async function dbDelete(table, match) {
  const { error } = await supabase.from(table).delete().match(match);
  if (error) throw error;
}

export async function dbUpsert(table, data, onConflict) {
  const { data: row, error } = await supabase
    .from(table)
    .upsert(data, { onConflict })
    .select()
    .single();
  if (error) throw error;
  return row;
}

// ─── Auth helpers ─────────────────────────────────────────────

export async function createAuthUser(email, password) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

export async function deleteAuthUser(userId) {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
}
