import * as leagueService from '../services/league.service.js';
import { ok, created, notFound, badRequest } from '../utils/response.js';

export async function create(req, res) {
  const { franchiseName, ownerName, themeColor, draftPosition, sport } = req.body;

  const league = await leagueService.createLeague({
    franchiseName,
    ownerName,
    themeColor,
    draftPosition: parseInt(draftPosition) || 1,
    sport: sport || 'soccer',
  });

  return res.status(201).json(created({ league, themeColor }));
}

// Legacy alias consumed by the existing client LoginScreen
export async function registerLeague(req, res) {
  return create(req, res);
}

export async function getById(req, res) {
  const league = await leagueService.getLeague(req.params.id);
  if (!league) return res.status(404).json(notFound('League'));
  return res.json(ok(league));
}

export async function updateSettings(req, res) {
  const { settings } = req.body;
  if (!settings) return res.status(400).json(badRequest('settings object required'));

  const league = await leagueService.updateLeagueSettings(req.params.id, settings);
  return res.json(ok(league));
}

export async function advanceWeek(req, res) {
  const league = await leagueService.advanceWeek(req.params.id);
  return res.json(ok(league));
}
