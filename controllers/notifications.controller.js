import { supabase } from '../config/supabase.js';
import { ok } from '../utils/response.js';

export async function list(req, res) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return res.json(ok(data ?? []));
}

export async function markRead(req, res) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', req.user.id)
    .eq('is_read', false);

  if (error) throw error;
  return res.json(ok({ marked: true }));
}

// Internal helper — call from other controllers to create a notification
export async function createNotification(userId, type, message, link = null) {
  await supabase
    .from('notifications')
    .insert({ user_id: userId, type, message, link })
    .then(() => {});
}
