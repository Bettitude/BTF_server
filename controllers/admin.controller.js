import { supabase } from '../config/supabase.js';
import { PLAYERS, FIXTURES, GAMEWEEKS } from '../data/wcSeed.js';
import { apiFootball, apiFetch } from '../config/footballApi.js';
import { ok } from '../utils/response.js';

const POS_MAP = {
  Goalkeeper: 'GK',
  Defender:   'DF',
  Midfielder: 'MF',
  Attacker:   'FW',
};

function assignPrice(position, number) {
  const n = number || 23;
  const tier = n <= 11 ? 0 : n <= 22 ? 1 : 2;
  const PRICES = {
    GK: [9_500_000, 8_000_000, 7_000_000],
    DF: [12_000_000, 9_500_000, 7_500_000],
    MF: [14_000_000, 11_000_000, 8_500_000],
    FW: [13_500_000, 10_000_000, 8_000_000],
  };
  return PRICES[position]?.[tier] ?? 8_000_000;
}

export async function seedAll(req, res) {
  const results = {};

  // Seed gameweeks
  const { error: gwErr } = await supabase.from('gameweeks').upsert(
    GAMEWEEKS.map(g => ({
      number:      g.number,
      name:        g.name,
      deadline:    g.deadline,
      is_current:  g.is_current,
      is_finished: g.is_finished,
    })),
    { onConflict: 'number' }
  );
  results.gameweeks = gwErr ? `error: ${gwErr.message}` : `seeded ${GAMEWEEKS.length}`;

  // Seed players
  const { error: pErr } = await supabase.from('players').upsert(PLAYERS, { onConflict: 'id' });
  results.players = pErr ? `error: ${pErr.message}` : `seeded ${PLAYERS.length}`;

  // Seed fixtures (need gameweek ids)
  const { data: gwRows } = await supabase.from('gameweeks').select('id, number');
  const gwMap = Object.fromEntries((gwRows || []).map(g => [g.number, g.id]));
  const fixtureRows = FIXTURES.map(f => ({
    id:         f.id,
    gameweek_id: gwMap[f.gameweek_number],
    home:        f.home,
    home_code:   f.home_code,
    away:        f.away,
    away_code:   f.away_code,
    match_date:  f.match_date,
    match_time:  f.match_time,
    venue:       f.venue,
    status:      f.status,
    home_score:  f.home_score,
    away_score:  f.away_score,
  }));
  const { error: fErr } = await supabase.from('fixtures').upsert(fixtureRows, { onConflict: 'id' });
  results.fixtures = fErr ? `error: ${fErr.message}` : `seeded ${FIXTURES.length}`;

  return res.json(ok(results));
}

export async function updateFixture(req, res) {
  const { id } = req.params;
  const { status, homeScore, awayScore } = req.body;

  const { data, error } = await supabase.from('fixtures').update({
    status,
    home_score: homeScore,
    away_score: awayScore,
  }).eq('id', id).select().single();

  if (error) throw error;
  return res.json(ok(data));
}

export async function importPlayers(req, res) {
  // 1. Fetch all 48 WC2026 teams
  const teamsRes = await apiFetch(apiFootball.wcTeams(), { headers: apiFootball.headers });
  const teams    = teamsRes.response || [];

  // 2. Fetch each team's squad (~48 requests, ~150ms apart to stay within rate limit)
  const allPlayers = [];
  for (const { team } of teams) {
    try {
      const squadRes = await apiFetch(apiFootball.teamSquad(team.id), { headers: apiFootball.headers });
      const squad    = squadRes.response?.[0]?.players || [];
      for (const p of squad) {
        const position = POS_MAP[p.position];
        if (!position) continue;
        allPlayers.push({
          id:            String(p.id),
          name:          p.name,
          country:       team.code,
          position,
          price_fc:      assignPrice(position, p.number),
          total_pts:     0,
          form:          0,
          selection_pct: 0,
          weekly_pts:    [],
        });
      }
    } catch {
      // skip teams that error out
    }
    await new Promise(r => setTimeout(r, 150));
  }

  // 3. Remove fake seeded players (IDs like wg1, wd1…) — clear dependents first
  //    (squad_players has no CASCADE on player_id FK, so must delete manually)
  await supabase.from('squad_players').delete().like('player_id', 'w%');
  await supabase.from('transfers').delete().like('player_in_id',  'w%');
  await supabase.from('transfers').delete().like('player_out_id', 'w%');
  await supabase.from('player_gw_stats').delete().like('player_id', 'w%');
  await supabase.from('players').delete().like('id', 'w%');

  // 4. Upsert real players in batches of 100
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < allPlayers.length; i += BATCH) {
    const { error } = await supabase
      .from('players')
      .upsert(allPlayers.slice(i, i + BATCH), { onConflict: 'id' });
    if (!error) inserted += Math.min(BATCH, allPlayers.length - i);
  }

  return res.json(ok({ teams: teams.length, players: inserted }));
}

export async function updatePlayerStats(req, res) {
  const { playerId } = req.params;
  const { gameweekId, minutes, goals, assists, cleanSheet, yellowCards, redCards, saves, penaltiesSaved, penaltiesMissed } = req.body;

  const { data, error } = await supabase.from('player_gw_stats').upsert({
    player_id:        playerId,
    gameweek_id:      gameweekId,
    minutes:          minutes || 0,
    goals:            goals || 0,
    assists:          assists || 0,
    clean_sheet:      cleanSheet || false,
    yellow_cards:     yellowCards || 0,
    red_cards:        redCards || 0,
    saves:            saves || 0,
    penalties_saved:  penaltiesSaved || 0,
    penalties_missed: penaltiesMissed || 0,
  }, { onConflict: 'player_id,gameweek_id' }).select().single();

  if (error) throw error;
  return res.json(ok(data));
}
