import { supabase } from '../config/supabase.js';
import { GAMEWEEKS } from '../data/wcSeed.js';
import { apiFootball, apiFetch } from '../config/footballApi.js';
import { computePrice, computeRating, launchPrice } from '../utils/playerValuation.js';
import { syncFixtureCalendar, liveSyncTick } from '../services/statsSync.service.js';
import { notifySquadOwners } from './notifications.controller.js';
import { computeUserPoints } from '../services/points.service.js';
import { ok } from '../utils/response.js';

const POS_MAP = {
  Goalkeeper: 'GK',
  Defender:   'DF',
  Midfielder: 'MF',
  Attacker:   'FW',
};

// Seeds ONLY the tournament calendar structure (8 matchday gameweeks).
// Players and fixtures come exclusively from API-Football — no dummy data.
export async function seedAll(req, res) {
  const results = {};

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

  // Clean out any legacy dummy fixtures (ids like f1…) — real ones use API-Football ids
  await supabase.from('fixtures').delete().like('id', 'f%');

  try {
    const sync = await syncFixtureCalendar();
    results.fixtures = `synced ${sync.fixtures} from API-Football`;
  } catch (err) {
    results.fixtures = `sync failed: ${err.message}`;
  }

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
  const teamsRes = await apiFetch(apiFootball.wcTeams(), { headers: apiFootball.headers });
  const teams    = teamsRes.response || [];

  const allPlayers = [];
  for (const { team } of teams) {
    try {
      const squadRes = await apiFetch(apiFootball.teamSquad(team.id), { headers: apiFootball.headers });
      const squad    = squadRes.response?.[0]?.players || [];
      for (const p of squad) {
        const position = POS_MAP[p.position];
        if (!position) continue;
        // Squad role from shirt number: starters (1–11) price higher, like FIFA's game
        const number = p.number || 26;
        const role   = number <= 11 ? 1 : number <= 23 ? 0.5 : 0.15;
        // Identity fields only — never zero out total_pts/form/weekly_pts here,
        // or a re-import would wipe the live-synced match stats aggregates.
        allPlayers.push({
          id:            String(p.id),
          name:          p.name,
          country:       team.code,
          position,
          price_fc:      launchPrice(position, team.code, role),
          photo:         p.photo || null,   // real headshot from API-Football; UI falls back to flag if missing
        });
      }
    } catch {
      // skip teams that error out
    }
    await new Promise(r => setTimeout(r, 150));
  }

  // Remove fake seeded players (IDs like wg1, wd1…) — clear dependents first
  await supabase.from('squad_players').delete().like('player_id', 'w%');
  await supabase.from('transfers').delete().like('player_in_id',  'w%');
  await supabase.from('transfers').delete().like('player_out_id', 'w%');
  await supabase.from('player_gw_stats').delete().like('player_id', 'w%');
  await supabase.from('players').delete().like('id', 'w%');

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

  const { data: player } = await supabase.from('players').select('name').eq('id', playerId).maybeSingle();
  if (player) {
    if (redCards)    await notifySquadOwners(playerId, player.name, 'received a red card');
    else if (yellowCards) await notifySquadOwners(playerId, player.name, 'received a yellow card');
  }

  return res.json(ok(data));
}

export async function updatePlayerInjuryStatus(req, res) {
  const { playerId } = req.params;
  const { injuryStatus, injuryNote } = req.body;
  if (!['fit', 'doubtful', 'injured', 'suspended'].includes(injuryStatus)) {
    return res.status(400).json({ success: false, error: 'Invalid injuryStatus' });
  }

  const { data: player, error } = await supabase
    .from('players')
    .update({ injury_status: injuryStatus, injury_note: injuryNote || null })
    .eq('id', playerId)
    .select().single();
  if (error) throw error;

  if (injuryStatus !== 'fit') {
    await notifySquadOwners(playerId, player.name, `is now ${injuryStatus}${injuryNote ? ` — ${injuryNote}` : ''}`);
  }

  return res.json(ok(player));
}

// Recompute every player's rating + price from real API-Football performance stats.
// Long-running (one request per player, rate-limited) — intended to be triggered
// from the admin panel and left to run.
export async function recomputeRatings(req, res) {
  const { data: players, error } = await supabase.from('players').select('id, position');
  if (error) throw error;

  let updated = 0, failed = 0;
  for (const player of players) {
    try {
      const statsRes = await apiFetch(apiFootball.playerStats(player.id), { headers: apiFootball.headers });
      const stat = statsRes.response?.[0]?.statistics?.[0];
      if (!stat) { failed++; continue; }

      const rating = parseFloat(stat.games?.rating) || 0;
      const price = computePrice(player.position, {
        rating,
        goals:       stat.goals?.total      || 0,
        assists:     stat.goals?.assists    || 0,
        appearances: stat.games?.appearences || 0,
        saves:       stat.goals?.saves      || 0,
      });

      await supabase.from('players').update({ form: computeRating(rating), price_fc: price }).eq('id', player.id);
      updated++;
    } catch {
      failed++;
    }
    await new Promise(r => setTimeout(r, 150));
  }

  return res.json(ok({ updated, failed, total: players.length }));
}

// Pull the full real fixture calendar (rounds, kickoff times, venues) from API-Football
export async function syncFixtures(req, res) {
  const result = await syncFixtureCalendar();
  return res.json(ok(result));
}

// Force a live-stats sync pass right now (player match stats + ratings + points)
export async function syncStats(req, res) {
  const result = await liveSyncTick();
  return res.json(ok(result));
}

export async function setCurrentGameweek(req, res) {
  const { id } = req.params;
  await supabase.from('gameweeks').update({ is_current: false }).neq('id', id);
  const { data, error } = await supabase.from('gameweeks').update({ is_current: true }).eq('id', id).select().single();
  if (error) throw error;
  return res.json(ok(data));
}

export async function finishGameweek(req, res) {
  const { id } = req.params;
  const { data, error } = await supabase.from('gameweeks')
    .update({ is_finished: true, is_current: false }).eq('id', id).select().single();
  if (error) throw error;
  return res.json(ok(data));
}

// Pulls every auth.users row via the admin API, paginating past Supabase's
// default 50-per-page cap so the list stays complete as signups grow.
async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
    page++;
  }
  return users;
}

// Full roster for the admin console: every registered user with their profile,
// payout details (so admins can pay out prize winners), and computed leaderboard
// rank — sorted highest points first so the #1 row is the current prize winner.
export async function listUsers(req, res) {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, team_name, payout_method, payout_account_name, payout_account_number, payout_bank_name, created_at');
  if (error) throw error;

  const authUsers = await listAllAuthUsers();
  const authById = Object.fromEntries(authUsers.map(u => [u.id, u]));

  const rows = (await Promise.all(profiles.map(async p => {
    const authUser = authById[p.id];
    const points = await computeUserPoints(p.id);
    return {
      id: p.id,
      email:    authUser?.email || null,
      isAdmin:  authUser?.user_metadata?.role === 'admin',
      teamName: p.team_name,
      createdAt: p.created_at,
      lastSignInAt: authUser?.last_sign_in_at || null,
      payoutMethod:        p.payout_method        || '',
      payoutAccountName:   p.payout_account_name   || '',
      payoutAccountNumber: p.payout_account_number || '',
      payoutBankName:      p.payout_bank_name      || '',
      total: points.total,
      gwPts: points.gwPts,
    };
  })))
    .sort((a, b) => b.total - a.total)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return res.json(ok(rows));
}
