import * as sportsApiService from '../services/sportsApi.service.js';
import { ok } from '../utils/response.js';

export async function apiStatus(req, res) {
  const { apiFetch, apiFootball } = await import('../config/footballApi.js');
  const { env } = await import('../config/env.js');
  if (!env.APIFOOTBALL_KEY) return res.json({ success: false, error: 'No API key set' });

  const data = await apiFetch('https://v3.football.api-sports.io/status', { headers: apiFootball.headers });
  return res.json({ success: true, data });
}

export async function liveFixtures(req, res) {
  const data = await sportsApiService.fetchLiveFixtures();
  return res.json(ok(data));
}

export async function fixtures(req, res) {
  const data = await sportsApiService.fetchFixtures(req.query.round);
  return res.json(ok(data));
}

export async function playerStats(req, res) {
  const data = await sportsApiService.fetchPlayerStats(req.params.playerId);
  return res.json(ok(data));
}

export async function worldCupStandings(req, res) {
  const data = await sportsApiService.fetchWorldCupStandings();
  return res.json(ok(data));
}
