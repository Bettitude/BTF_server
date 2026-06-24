import { supabase } from '../config/supabase.js';
import { ok, notFound, badRequest } from '../utils/response.js';

export async function getSquad(req, res) {
  const userId = req.user.id;

  const { data: squad, error } = await supabase
    .from('squads')
    .select(`*, squad_players(player_id, players(*))`)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!squad) return res.json(ok(null));

  const players = (squad.squad_players || []).map(sp => sp.players);
  return res.json(ok({
    formation:    squad.formation,
    captainId:    squad.captain_id,
    vcId:         squad.vice_captain_id,
    players,
  }));
}

export async function saveSquad(req, res) {
  const userId = req.user.id;
  const { formation, captainId, vcId, playerIds } = req.body;

  if (!Array.isArray(playerIds)) return res.status(400).json(badRequest('playerIds array required'));
  if (playerIds.length > 15) return res.status(400).json(badRequest('Maximum 15 players'));

  // Upsert squad row
  const { data: squad, error: squadErr } = await supabase
    .from('squads')
    .upsert({
      user_id:         userId,
      formation:       formation || '4-3-3',
      captain_id:      captainId || null,
      vice_captain_id: vcId || null,
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (squadErr) throw squadErr;

  // Replace squad players
  await supabase.from('squad_players').delete().eq('squad_id', squad.id);

  if (playerIds.length > 0) {
    const rows = playerIds.map(pid => ({ squad_id: squad.id, player_id: pid }));
    const { error: insertErr } = await supabase.from('squad_players').insert(rows);
    if (insertErr) throw insertErr;
  }

  return res.json(ok({ formation: squad.formation, captainId: squad.captain_id, vcId: squad.vice_captain_id, playerIds }));
}

export async function transfer(req, res) {
  const userId = req.user.id;
  const { playerInId, playerOutId } = req.body;
  if (!playerInId || !playerOutId) return res.status(400).json(badRequest('playerInId and playerOutId required'));

  // Get current squad
  const { data: squad } = await supabase.from('squads').select('id').eq('user_id', userId).single();
  if (!squad) return res.status(404).json(notFound('Squad'));

  // Remove outgoing player, add incoming
  await supabase.from('squad_players').delete().eq('squad_id', squad.id).eq('player_id', playerOutId);
  await supabase.from('squad_players').insert({ squad_id: squad.id, player_id: playerInId });

  // Log transfer
  const { data: gw } = await supabase.from('gameweeks').select('id').eq('is_current', true).single();
  await supabase.from('transfers').insert({
    user_id:       userId,
    gameweek_id:   gw?.id,
    player_in_id:  playerInId,
    player_out_id: playerOutId,
  });

  return res.json(ok({ playerInId, playerOutId }));
}
