import * as store from '../store/runtimeStore.js';
import { PLAYERS } from '../data/mockData.js';
import { ok, notFound, badRequest } from '../utils/response.js';

export async function getSquad(req, res) {
  const squad = store.getSquad(req.user.id);
  if (!squad) return res.json(ok(null));

  const players = squad.playerIds.map(id => PLAYERS.find(p => p.id === id)).filter(Boolean);
  return res.json(ok({
    formation: squad.formation,
    captainId: squad.captainId,
    vcId:      squad.vcId,
    players,
  }));
}

export async function saveSquad(req, res) {
  const { formation, captainId, vcId, playerIds } = req.body;

  if (!Array.isArray(playerIds)) return res.status(400).json(badRequest('playerIds array required'));
  if (playerIds.length > 15) return res.status(400).json(badRequest('Maximum 15 players'));

  const squad = store.saveSquad(req.user.id, { formation, captainId, vcId, playerIds });
  return res.json(ok({ formation: squad.formation, captainId: squad.captainId, vcId: squad.vcId, playerIds: squad.playerIds }));
}

export async function transfer(req, res) {
  const { playerInId, playerOutId } = req.body;
  if (!playerInId || !playerOutId) return res.status(400).json(badRequest('playerInId and playerOutId required'));

  const squad = store.getSquad(req.user.id);
  if (!squad) return res.status(404).json(notFound('Squad'));

  squad.playerIds = squad.playerIds.filter(id => id !== playerOutId);
  squad.playerIds.push(playerInId);

  return res.json(ok({ playerInId, playerOutId }));
}
