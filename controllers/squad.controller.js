import { supabase } from '../config/supabase.js';
import { ok, notFound, badRequest } from '../utils/response.js';
import { sendEventEmail } from '../services/email.service.js';

export async function getSquad(req, res) {
  const { data: squad } = await supabase.from('squads').select('*').eq('user_id', req.user.id).maybeSingle();
  if (!squad) return res.json(ok(null));

  const { data: rows, error } = await supabase
    .from('squad_players')
    .select('players(*)')
    .eq('squad_id', squad.id);
  if (error) throw error;

  return res.json(ok({
    name:       squad.name,
    formation:  squad.formation,
    captainId:  squad.captain_id,
    vcId:       squad.vice_captain_id,
    players:    (rows || []).map(r => r.players).filter(Boolean),
  }));
}

export async function saveSquad(req, res) {
  const { name, formation, captainId, vcId, playerIds } = req.body;

  if (!Array.isArray(playerIds)) return res.status(400).json(badRequest('Invalid squad data — please try saving again.'));
  if (playerIds.length > 15) return res.status(400).json(badRequest('Your squad can\'t have more than 15 players.'));

  const { data: squad, error } = await supabase
    .from('squads')
    .upsert({
      user_id:         req.user.id,
      name:            name?.trim() || 'My Squad',
      formation:       formation || '4-3-3',
      captain_id:      captainId || null,
      vice_captain_id: vcId || null,
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('squad_players').delete().eq('squad_id', squad.id);
  if (playerIds.length) {
    const { error: insError } = await supabase
      .from('squad_players')
      .insert(playerIds.map(playerId => ({ squad_id: squad.id, player_id: playerId })));
    if (insError) throw insError;
  }

  if (playerIds.length === 15) {
    const { data: captain } = squad.captain_id
      ? await supabase.from('players').select('name').eq('id', squad.captain_id).maybeSingle()
      : { data: null };
    sendEventEmail(req.user.email, 'squad_saved', {
      squadName:   squad.name,
      formation:   squad.formation,
      playerCount: playerIds.length,
      captain:     captain?.name,
    });
  }

  return res.json(ok({
    name:       squad.name,
    formation:  squad.formation,
    captainId:  squad.captain_id,
    vcId:       squad.vice_captain_id,
    playerIds,
  }));
}

export async function transfer(req, res) {
  const { playerInId, playerOutId } = req.body;
  if (!playerInId || !playerOutId) return res.status(400).json(badRequest('Please select both a player to add and a player to remove.'));

  const { data: squad } = await supabase.from('squads').select('id').eq('user_id', req.user.id).maybeSingle();
  if (!squad) return res.status(404).json(notFound('Squad'));

  await supabase.from('squad_players').delete().match({ squad_id: squad.id, player_id: playerOutId });
  await supabase.from('squad_players').insert({ squad_id: squad.id, player_id: playerInId });

  const { data: currentGw } = await supabase.from('gameweeks').select('id, name').eq('is_current', true).maybeSingle();
  await supabase.from('transfers').insert({
    user_id:        req.user.id,
    gameweek_id:    currentGw?.id ?? null,
    player_in_id:   playerInId,
    player_out_id:  playerOutId,
  });

  const { data: moved } = await supabase.from('players').select('id, name').in('id', [playerInId, playerOutId]);
  sendEventEmail(req.user.email, 'transfer', {
    playerIn:  moved?.find(p => p.id === playerInId)?.name,
    playerOut: moved?.find(p => p.id === playerOutId)?.name,
    gameweek:  currentGw?.name,
  });

  return res.json(ok({ playerInId, playerOutId }));
}
