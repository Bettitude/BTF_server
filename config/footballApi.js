import { env } from './env.js';

// ─── Sportradar ───────────────────────────────────────────────
const SPORTRADAR_BASE = 'https://api.sportradar.com';

export const sportradar = {
  fixtures: (sport = 'football') =>
    `${SPORTRADAR_BASE}/nfl/official/v7/en/games/2024/REG/schedule.json?api_key=${env.SPORTRADAR_KEY}`,

  liveScores: () =>
    `${SPORTRADAR_BASE}/nfl/official/v7/en/games/live/boxscore.json?api_key=${env.SPORTRADAR_KEY}`,

  playerStats: (playerId) =>
    `${SPORTRADAR_BASE}/nfl/official/v7/en/players/${playerId}/profile.json?api_key=${env.SPORTRADAR_KEY}`,

  soccerFixtures: () =>
    `${SPORTRADAR_BASE}/soccer-extended/trial/v4/en/schedules/live/results.json?api_key=${env.SPORTRADAR_KEY}`,

  soccerPlayerStats: (playerId) =>
    `${SPORTRADAR_BASE}/soccer-extended/trial/v4/en/players/${playerId}/profile.json?api_key=${env.SPORTRADAR_KEY}`,
};

// ─── API-Football (api-football.com direct) ───────────────────
const APIFOOTBALL_BASE = 'https://v3.football.api-sports.io';

// World Cup 2026 constants
const WC_LEAGUE = 1;
const WC_SEASON = 2026;

export const apiFootball = {
  headers: {
    'x-apisports-key': env.APIFOOTBALL_KEY,
  },

  // Live WC matches right now
  liveFixtures: () =>
    `${APIFOOTBALL_BASE}/fixtures?live=all&league=${WC_LEAGUE}&season=${WC_SEASON}`,

  // All WC fixtures (optionally filter by round e.g. "Group Stage - 1")
  fixtures: (round) =>
    round
      ? `${APIFOOTBALL_BASE}/fixtures?league=${WC_LEAGUE}&season=${WC_SEASON}&round=${encodeURIComponent(round)}`
      : `${APIFOOTBALL_BASE}/fixtures?league=${WC_LEAGUE}&season=${WC_SEASON}`,

  // Fixtures on a specific date (YYYY-MM-DD)
  fixturesByDate: (date) =>
    `${APIFOOTBALL_BASE}/fixtures?league=${WC_LEAGUE}&season=${WC_SEASON}&date=${date}`,

  // Player stats in WC 2026
  playerStats: (playerId) =>
    `${APIFOOTBALL_BASE}/players?id=${playerId}&league=${WC_LEAGUE}&season=${WC_SEASON}`,

  // Group standings
  standings: () =>
    `${APIFOOTBALL_BASE}/standings?league=${WC_LEAGUE}&season=${WC_SEASON}`,

  // All WC2026 teams
  wcTeams: () =>
    `${APIFOOTBALL_BASE}/teams?league=${WC_LEAGUE}&season=${WC_SEASON}`,

  // Players in a specific WC team
  teamSquad: (teamId) =>
    `${APIFOOTBALL_BASE}/players/squads?team=${teamId}`,
};

// Generic fetch wrapper with timeout
export async function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`API responded ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Sports API request timed out');
    throw err;
  }
}
