import { supabase } from '../config/supabase.js';
import { ok } from '../utils/response.js';

export async function list(req, res) {
  const room  = req.query.room  || 'global';
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, user_id, username, content, created_at')
    .eq('room', room)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return res.json(ok(data.reverse()));
}

export async function send(req, res) {
  const { content, room = 'global' } = req.body;
  const user = req.user;

  const username = user.email?.split('@')[0] ?? 'user';

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id: user.id, username, room, content })
    .select()
    .single();

  if (error) throw error;
  return res.status(201).json(ok(data));
}
