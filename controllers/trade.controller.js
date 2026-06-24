import { supabase } from '../config/supabase.js';
import { dbFindOne, dbUpdate } from '../services/supabase.service.js';
import { INITIAL_PLAYERS, INITIAL_SOCCER_PLAYERS } from '../playersData.js';
import { ok, badRequest, notFound } from '../utils/response.js';

export async function proposeTrade(req, res) {
  const { leagueId, offeringTeamId, receivingTeamId, offerPlayerId, requestPlayerId } = req.body;

  if (!offeringTeamId || !receivingTeamId || !offerPlayerId || !requestPlayerId) {
    return res.status(400).json(badRequest('offeringTeamId, receivingTeamId, offerPlayerId, requestPlayerId required'));
  }

  const league = await dbFindOne('leagues', { id: leagueId });
  if (!league) return res.status(404).json(notFound('League'));

  const sport = league.sport || 'soccer';
  const allPlayers = sport === 'soccer' ? INITIAL_SOCCER_PLAYERS : INITIAL_PLAYERS;

  const offerPlayer   = allPlayers.find(p => p.id === offerPlayerId);
  const requestPlayer = allPlayers.find(p => p.id === requestPlayerId);

  if (!offerPlayer || !requestPlayer) {
    return res.status(404).json(notFound('One or both players'));
  }

  // CPU evaluation — accept if offered player is worth >= 88% of requested
  const ratio = offerPlayer.projectedPoints / requestPlayer.projectedPoints;
  const accepted = ratio >= 0.88;

  if (accepted) {
    // Swap in rosters table
    await supabase.from('rosters')
      .delete()
      .match({ team_id: offeringTeamId, player_id: offerPlayerId });

    await supabase.from('rosters')
      .delete()
      .match({ team_id: receivingTeamId, player_id: requestPlayerId });

    await supabase.from('rosters').insert([
      { team_id: offeringTeamId,  player_id: requestPlayerId },
      { team_id: receivingTeamId, player_id: offerPlayerId  },
    ]);

    // Log activity
    await supabase.from('activities').insert({
      league_id: leagueId,
      type:      'lineup',
      message:   `TRADE: ${offerPlayer.name} ↔ ${requestPlayer.name} completed.`,
    });
  }

  return res.json(ok({ accepted, offerPlayer, requestPlayer }));
}
