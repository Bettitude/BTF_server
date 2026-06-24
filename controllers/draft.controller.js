import * as draftService from '../services/draft.service.js';
import { dbFindOne } from '../services/supabase.service.js';
import { ok, badRequest, notFound } from '../utils/response.js';

export async function available(req, res) {
  const { leagueId } = req.params;
  const sport = req.query.sport || 'soccer';

  const league = await dbFindOne('leagues', { id: leagueId });
  if (!league) return res.status(404).json(notFound('League'));

  const players = await draftService.getAvailablePlayers(leagueId, sport);
  return res.json(ok(players, { available: players.length }));
}

export async function pick(req, res) {
  const { leagueId } = req.params;
  const { teamId, playerId } = req.body;

  if (!teamId || !playerId) {
    return res.status(400).json(badRequest('teamId and playerId are required'));
  }

  const league = await dbFindOne('leagues', { id: leagueId });
  if (!league) return res.status(404).json(notFound('League'));

  const sport = req.query.sport || league.sport || 'soccer';
  const result = await draftService.processPick(leagueId, teamId, playerId, sport);

  return res.json(ok(result, { message: `${result.player.name} drafted successfully` }));
}
