import { apiFootball, apiFetch } from '../config/footballApi.js';
import { env } from '../config/env.js';

// ─── Live Fixtures ─────────────────────────────────────────────────────────

export async function fetchLiveFixtures() {
  if (!env.APIFOOTBALL_KEY) return [];

  try {
    const data = await apiFetch(apiFootball.liveFixtures(), { headers: apiFootball.headers });
    return data?.response || [];
  } catch (err) {
    console.warn('[SportsAPI] Live fixtures failed:', err.message);
    return [];
  }
}

// ─── Fixtures (all or by round) ────────────────────────────────────────────

export async function fetchFixtures(round) {
  if (!env.APIFOOTBALL_KEY) return [];

  try {
    const data = await apiFetch(apiFootball.fixtures(round), { headers: apiFootball.headers });
    return data?.response || [];
  } catch (err) {
    console.warn('[SportsAPI] Fixtures fetch failed:', err.message);
    return [];
  }
}

// ─── Player Stats ─────────────────────────────────────────────────────────

export async function fetchPlayerStats(playerId) {
  if (!env.APIFOOTBALL_KEY) return null;

  try {
    const data = await apiFetch(apiFootball.playerStats(playerId), { headers: apiFootball.headers });
    return data?.response?.[0] || null;
  } catch (err) {
    console.warn('[SportsAPI] Player stats fetch failed:', err.message);
    return null;
  }
}

// ─── World Cup group standings ─────────────────────────────────────────────

export async function fetchWorldCupStandings() {
  if (!env.APIFOOTBALL_KEY) return [];

  try {
    const data = await apiFetch(apiFootball.standings(), { headers: apiFootball.headers });
    return data?.response || [];
  } catch (err) {
    console.warn('[SportsAPI] Standings fetch failed:', err.message);
    return [];
  }
}
