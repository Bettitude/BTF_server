import { apiFootball, apiFetch } from '../config/footballApi.js';
import { env } from '../config/env.js';

// ─── Live Fixtures ─────────────────────────────────────────────────────────

export async function fetchLiveFixtures() {
  if (!env.APIFOOTBALL_KEY) return getMockFixtures();

  try {
    const data = await apiFetch(apiFootball.liveFixtures(), { headers: apiFootball.headers });
    return data?.response || [];
  } catch (err) {
    console.warn('[SportsAPI] Live fixtures failed, using mock:', err.message);
    return getMockFixtures();
  }
}

// ─── Fixtures (all or by round) ────────────────────────────────────────────

export async function fetchFixtures(round) {
  if (!env.APIFOOTBALL_KEY) return getMockFixtures();

  try {
    const data = await apiFetch(apiFootball.fixtures(round), { headers: apiFootball.headers });
    return data?.response || [];
  } catch (err) {
    console.warn('[SportsAPI] Fixtures fetch failed:', err.message);
    return getMockFixtures();
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
  if (!env.APIFOOTBALL_KEY) return getMockStandings();

  try {
    const data = await apiFetch(apiFootball.standings(), { headers: apiFootball.headers });
    return data?.response || [];
  } catch (err) {
    console.warn('[SportsAPI] Standings fetch failed:', err.message);
    return getMockStandings();
  }
}

// ─── Mock fallback data ────────────────────────────────────────────────────

function getMockFixtures(sport) {
  if (sport === 'soccer') {
    return [
      { id: 'f1', homeTeam: 'France', awayTeam: 'Argentina', status: 'LIVE', homeScore: 1, awayScore: 0, minute: 67 },
      { id: 'f2', homeTeam: 'England', awayTeam: 'Germany', status: 'FT',   homeScore: 2, awayScore: 1, minute: 90 },
      { id: 'f3', homeTeam: 'Brazil',  awayTeam: 'Spain',   status: 'NS',   homeScore: 0, awayScore: 0, minute: 0  },
      { id: 'f4', homeTeam: 'Portugal', awayTeam: 'Belgium', status: 'NS',  homeScore: 0, awayScore: 0, minute: 0  },
    ];
  }
  return [
    { id: 'nf1', homeTeam: 'Kansas City Chiefs', awayTeam: 'Buffalo Bills',        status: 'LIVE', homeScore: 21, awayScore: 17 },
    { id: 'nf2', homeTeam: 'San Francisco 49ers', awayTeam: 'Dallas Cowboys',      status: 'FT',   homeScore: 28, awayScore: 14 },
  ];
}

function getMockPlayerStats(playerId, sport) {
  const allPlayers = sport === 'soccer' ? INITIAL_SOCCER_PLAYERS : INITIAL_PLAYERS;
  const player = allPlayers.find(p => p.id === playerId);
  if (!player) return null;
  return { id: player.id, name: player.name, stats: player.stats, livePoints: player.projectedPoints };
}

function getMockStandings() {
  return [
    { group: 'A', teams: ['France', 'Germany', 'Japan', 'Australia'] },
    { group: 'B', teams: ['England', 'USA', 'Iran', 'Wales'] },
    { group: 'C', teams: ['Argentina', 'Poland', 'Mexico', 'Saudi Arabia'] },
    { group: 'D', teams: ['Portugal', 'Brazil', 'Cameroon', 'Serbia'] },
  ];
}
