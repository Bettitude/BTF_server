import { supabase } from '../config/supabase.js';
import { apiFootball, apiFetch } from '../config/footballApi.js';
import { calcFantasyPoints } from '../utils/scoring.js';
import { computeRating } from '../utils/playerValuation.js';
import { roundToGameweek } from '../data/wcSeed.js';

// ─────────────────────────────────────────────────────────────────────────────
// Live data sync from API-Football: fixtures, scores, and per-player match
// stats (including the official match RATING). Everything the fantasy scoring
// needs lands in Postgres; no dummy data anywhere.
//
// Quota-aware: a tick only spends API calls when matches are live, about to
// start, or freshly finished and not yet synced.
// ─────────────────────────────────────────────────────────────────────────────

// DB CHECK constraint allows exactly: NS | LIVE | FT | PP
// API-Football returns many more intermediate codes — collapse them here.
const LIVE_API = new Set(['1H','HT','2H','ET','P','BT','INT','SUSP','LIVE']);
const DONE_API = new Set(['FT','AET','PEN','AWD','WO']);
const CANC_API = new Set(['PST','CANC','ABD']);

// What we store in our DB (4 canonical values matching the CHECK constraint)
const LIVE_STATUSES = ['LIVE'];
const DONE_STATUSES = ['FT'];

function mapStatus(short) {
  if (!short || short === 'NS' || short === 'TBD') return 'NS';
  if (LIVE_API.has(short)) return 'LIVE';
  if (DONE_API.has(short)) return 'FT';
  if (CANC_API.has(short)) return 'PP';
  return 'NS';
}

let teamCodeCache = null; // API team id -> { code, name }

async function getTeamMap() {
  if (teamCodeCache) return teamCodeCache;
  const res = await apiFetch(apiFootball.wcTeams(), { headers: apiFootball.headers });
  teamCodeCache = Object.fromEntries(
    (res.response || []).map(({ team }) => [team.id, { code: team.code || team.name?.slice(0, 3).toUpperCase(), name: team.name }])
  );
  return teamCodeCache;
}

function fixtureRow(f, teamMap) {
  const gwNumber = roundToGameweek(f.league?.round);
  const home = teamMap[f.teams?.home?.id] || {};
  const away = teamMap[f.teams?.away?.id] || {};
  const dt = new Date(f.fixture?.date);
  return {
    id:         String(f.fixture.id),
    home:       f.teams?.home?.name,
    home_code:  home.code || f.teams?.home?.name?.slice(0, 3).toUpperCase(),
    away:       f.teams?.away?.name,
    away_code:  away.code || f.teams?.away?.name?.slice(0, 3).toUpperCase(),
    match_date: dt.toISOString().slice(0, 10),
    match_time: dt.toISOString().slice(11, 19),
    venue:      f.fixture?.venue?.name || null,
    status:     mapStatus(f.fixture?.status?.short),
    home_score: f.goals?.home,
    away_score: f.goals?.away,
    _gwNumber:  gwNumber,
    _homeTeamId: f.teams?.home?.id,
    _awayTeamId: f.teams?.away?.id,
  };
}

// Full tournament calendar → fixtures table. 2 API calls. Run at boot / daily / manually.
export async function syncFixtureCalendar() {
  const [teamMap, fxRes] = await Promise.all([
    getTeamMap(),
    apiFetch(apiFootball.fixtures(), { headers: apiFootball.headers }),
  ]);
  const fixtures = (fxRes.response || []).map(f => fixtureRow(f, teamMap));
  if (!fixtures.length) return { fixtures: 0 };

  const { data: gwRows } = await supabase.from('gameweeks').select('id, number');
  const gwByNumber = Object.fromEntries((gwRows || []).map(g => [g.number, g.id]));

  const rows = fixtures.map(({ _gwNumber, _homeTeamId, _awayTeamId, ...row }) => ({
    ...row,
    gameweek_id: gwByNumber[_gwNumber] ?? null,
  }));

  const { error } = await supabase.from('fixtures').upsert(rows, { onConflict: 'id' });
  if (error) throw error;

  await advanceGameweeks();
  return { fixtures: rows.length };
}

// Mark gameweeks finished when all their fixtures are done; point is_current at
// the first unfinished gameweek so deadlines advance without manual admin work.
async function advanceGameweeks() {
  const { data: gws } = await supabase.from('gameweeks').select('id, number').order('number');
  if (!gws?.length) return;

  const { data: fixtures } = await supabase.from('fixtures').select('gameweek_id, status');
  const byGw = {};
  for (const f of fixtures || []) {
    if (!f.gameweek_id) continue;
    (byGw[f.gameweek_id] ??= []).push(f.status);
  }

  let currentSet = false;
  for (const gw of gws) {
    const statuses = byGw[gw.id] || [];
    const finished = statuses.length > 0 && statuses.every(s => s === 'FT');
    const patch = { is_finished: finished, is_current: false };
    if (!finished && !currentSet) { patch.is_current = true; currentSet = true; }
    await supabase.from('gameweeks').update(patch).eq('id', gw.id);
  }
}

// Per-player stats for one fixture → player_gw_stats (with rating + points)
export async function syncFixturePlayerStats(fixtureId) {
  const { data: fixture } = await supabase.from('fixtures').select('*').eq('id', String(fixtureId)).maybeSingle();
  if (!fixture) return { players: 0 };

  const res = await apiFetch(apiFootball.fixturePlayers(fixtureId), { headers: apiFootball.headers });
  const sides = res.response || [];
  if (!sides.length) return { players: 0 };

  // Which of our player ids exist (import uses API-Football player ids as strings)
  const apiIds = sides.flatMap(side => (side.players || []).map(p => String(p.player.id)));
  const { data: knownPlayers } = await supabase.from('players').select('id, position').in('id', apiIds);
  const known = Object.fromEntries((knownPlayers || []).map(p => [p.id, p]));

  const rows = [];
  for (const side of sides) {
    const isHome   = side.team?.name === fixture.home;
    const conceded = (isHome ? fixture.away_score : fixture.home_score) ?? 0;

    for (const entry of side.players || []) {
      const id = String(entry.player.id);
      const player = known[id];
      if (!player) continue;

      const s = entry.statistics?.[0] || {};
      const minutes = s.games?.minutes || 0;
      const row = {
        player_id:            id,
        gameweek_id:          fixture.gameweek_id,
        minutes,
        rating:               computeRating(s.games?.rating),
        goals:                s.goals?.total    || 0,
        assists:              s.goals?.assists  || 0,
        goals_conceded:       minutes > 0 ? conceded : 0,
        clean_sheet:          minutes > 0 && conceded === 0,
        saves:                s.goals?.saves    || 0,
        tackles:              s.tackles?.total  || 0,
        key_passes:           s.passes?.key     || 0,
        shots_on:             s.shots?.on       || 0,
        yellow_cards:         s.cards?.yellow   || 0,
        red_cards:            s.cards?.red      || 0,
        penalties_won:        s.penalty?.won      || 0,
        penalties_committed:  s.penalty?.commited || 0,
        penalties_saved:      s.penalty?.saved    || 0,
        penalties_missed:     s.penalty?.missed   || 0,
      };
      row.points = calcFantasyPoints(row, player.position);
      rows.push(row);
    }
  }

  if (rows.length) {
    const { error } = await supabase.from('player_gw_stats').upsert(rows, { onConflict: 'player_id,gameweek_id' });
    if (error) throw error;
    await recomputePlayerAggregates(rows.map(r => r.player_id));
  }

  if (DONE_STATUSES.includes(fixture.status)) {
    await supabase.from('fixtures').update({ stats_synced: true }).eq('id', fixture.id);
  }

  return { players: rows.length };
}

// Season totals, per-GW points array, and form (avg rating of last 3 games)
export async function recomputePlayerAggregates(playerIds) {
  const ids = [...new Set(playerIds)];
  if (!ids.length) return;

  const { data: gws } = await supabase.from('gameweeks').select('id, number').order('number');
  const gwNumber = Object.fromEntries((gws || []).map(g => [g.id, g.number]));

  const { data: statRows } = await supabase
    .from('player_gw_stats')
    .select('player_id, gameweek_id, points, rating, minutes')
    .in('player_id', ids);

  const byPlayer = {};
  for (const s of statRows || []) (byPlayer[s.player_id] ??= []).push(s);

  for (const id of ids) {
    const rows = (byPlayer[id] || []).sort((a, b) => (gwNumber[a.gameweek_id] || 0) - (gwNumber[b.gameweek_id] || 0));
    const weekly = rows.map(r => r.points || 0);
    const total  = weekly.reduce((s, p) => s + p, 0);
    const rated  = rows.filter(r => r.minutes > 0 && r.rating > 0).slice(-3);
    const form   = rated.length
      ? Math.round((rated.reduce((s, r) => s + Number(r.rating), 0) / rated.length) * 10) / 10
      : 0;

    await supabase.from('players').update({ total_pts: total, weekly_pts: weekly, form }).eq('id', id);
  }
}

// selection_pct for every player = squads containing them / total squads
export async function recomputeSelectionPct() {
  const [{ count: squadCount }, { data: picks }] = await Promise.all([
    supabase.from('squads').select('id', { count: 'exact', head: true }),
    supabase.from('squad_players').select('player_id'),
  ]);
  if (!squadCount) return;

  const counts = {};
  for (const p of picks || []) counts[p.player_id] = (counts[p.player_id] || 0) + 1;

  await Promise.all(Object.entries(counts).map(([playerId, n]) =>
    supabase.from('players')
      .update({ selection_pct: Math.round((n / squadCount) * 1000) / 10 })
      .eq('id', playerId)
  ));
}

// ── The periodic tick ────────────────────────────────────────────────────────
// Spends zero API calls unless matches are imminent, live, or freshly finished.
export async function liveSyncTick() {
  const now = Date.now();
  const { data: fixtures } = await supabase.from('fixtures').select('*');
  if (!fixtures?.length) return { skipped: 'no fixtures' };

  const needsAttention = fixtures.filter(f => {
    if (f.status === 'LIVE') return true;
    if (f.status === 'FT' && !f.stats_synced) return true;
    const kickoff = new Date(`${f.match_date}T${f.match_time}Z`).getTime();
    return kickoff - 15 * 60_000 <= now && now <= kickoff + 3.5 * 3600_000; // kickoff window
  });
  if (!needsAttention.length) return { skipped: 'no active matches' };

  // Refresh today's statuses/scores in one call
  const teamMap = await getTeamMap();
  const today = new Date().toISOString().slice(0, 10);
  const dayRes = await apiFetch(apiFootball.fixturesByDate(today), { headers: apiFootball.headers });
  const { data: gwRows } = await supabase.from('gameweeks').select('id, number');
  const gwByNumber = Object.fromEntries((gwRows || []).map(g => [g.number, g.id]));

  for (const f of dayRes.response || []) {
    const { _gwNumber, _homeTeamId, _awayTeamId, ...row } = fixtureRow(f, teamMap);
    await supabase.from('fixtures').upsert({ ...row, gameweek_id: gwByNumber[_gwNumber] ?? null }, { onConflict: 'id' });
  }

  // Player stats for live + unsynced finished fixtures
  const { data: refreshed } = await supabase.from('fixtures').select('*')
    .in('id', needsAttention.map(f => f.id));
  let synced = 0;
  for (const f of refreshed || []) {
    if (f.status === 'LIVE' || (f.status === 'FT' && !f.stats_synced)) {
      try {
        await syncFixturePlayerStats(f.id);
        synced++;
      } catch (err) {
        console.error(`stats sync failed for fixture ${f.id}:`, err.message);
      }
    }
  }

  await recomputeSelectionPct();
  await advanceGameweeks();
  return { fixturesChecked: needsAttention.length, statsSynced: synced };
}

// ── Scheduler ────────────────────────────────────────────────────────────────
let tickTimer = null;
let calendarTimer = null;

export function startLiveSync({ tickSeconds = 150 } = {}) {
  if (tickTimer) return;

  // Boot: refresh the calendar once (safe if API key/quota missing — just logs)
  syncFixtureCalendar()
    .then(r => console.log(`  Fixtures  →  calendar synced (${r.fixtures} matches)`))
    .catch(err => console.log(`  Fixtures  →  calendar sync skipped (${err.message})`));

  tickTimer = setInterval(() => {
    liveSyncTick().catch(err => console.error('live sync tick failed:', err.message));
  }, tickSeconds * 1000);

  calendarTimer = setInterval(() => {
    syncFixtureCalendar().catch(err => console.error('calendar sync failed:', err.message));
  }, 12 * 3600 * 1000);

  console.log(`  Live sync →  every ${tickSeconds}s (API calls only during match windows)`);
}

export function stopLiveSync() {
  clearInterval(tickTimer);
  clearInterval(calendarTimer);
  tickTimer = calendarTimer = null;
}
