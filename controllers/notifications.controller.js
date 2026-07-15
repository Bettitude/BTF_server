import { supabase } from '../config/supabase.js';
import { ok } from '../utils/response.js';

export async function list(req, res) {
  const { data, error } = await supabase
    .from('notifications').select('*').eq('user_id', req.user.id)
    .order('created_at', { ascending: false }).limit(20);
  if (error) throw error;
  return res.json(ok(data));
}

export async function markRead(req, res) {
  const { error } = await supabase
    .from('notifications').update({ is_read: true })
    .eq('user_id', req.user.id).eq('is_read', false);
  if (error) throw error;
  return res.json(ok({ marked: true }));
}

// Internal helper — call from other controllers to create a notification
export async function createNotification(userId, type, message, link = null) {
  await supabase.from('notifications').insert({ user_id: userId, type, message, link });
}

// Notify every manager who has this player in their squad — used when a player's
// live status changes (card, injury, suspension) so squads update in near-real-time.
export async function notifySquadOwners(playerId, playerName, message) {
  const { data: squadRows } = await supabase
    .from('squad_players')
    .select('squads(user_id)')
    .eq('player_id', playerId);

  const userIds = [...new Set((squadRows || []).map(r => r.squads?.user_id).filter(Boolean))];
  await Promise.all(userIds.map(uid =>
    createNotification(uid, 'team_update', `${playerName}: ${message}`, '/my-team')
  ));
}
