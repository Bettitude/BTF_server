import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const HEADERS  = { 'x-apisports-key': process.env.APIFOOTBALL_KEY };
const BASE     = 'https://v3.football.api-sports.io';

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

async function apiFetch(url) {
  const res = await fetch(url, { headers: HEADERS });
  return res.json();
}

async function run() {
  // 1. Get all 48 WC2026 teams
  console.log('Fetching WC2026 teams...');
  const teamsRes = await apiFetch(`${BASE}/teams?league=1&season=2026`);
  const teams    = teamsRes.response || [];
  console.log(`Found ${teams.length} teams\n`);

  // 2. Fetch each team's squad
  const allPlayers = [];
  for (const { team } of teams) {
    try {
      const squadRes = await apiFetch(`${BASE}/players/squads?team=${team.id}`);
      const squad    = squadRes.response?.[0]?.players || [];
      let count = 0;
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
        count++;
      }
      console.log(`  ✓ ${team.name} (${team.code}): ${count} players`);
    } catch (e) {
      console.log(`  ✗ ${team.name}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\nTotal fetched: ${allPlayers.length} players`);

  // 3. Remove fake seeded players (IDs like wg1, wd1…)
  console.log('\nRemoving fake seeded players...');
  await supabase.from('squad_players').delete().like('player_id', 'w%');
  await supabase.from('transfers').delete().like('player_in_id',  'w%');
  await supabase.from('transfers').delete().like('player_out_id', 'w%');
  await supabase.from('player_gw_stats').delete().like('player_id', 'w%');
  const { error: delErr } = await supabase.from('players').delete().like('id', 'w%');
  if (delErr) console.log('  Delete warning:', delErr.message);
  else        console.log('  Done');

  // 4. Upsert real players in batches of 100
  console.log('\nInserting real players...');
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < allPlayers.length; i += BATCH) {
    const batch = allPlayers.slice(i, i + BATCH);
    const { error } = await supabase.from('players').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.log(`  Batch ${Math.floor(i / BATCH) + 1} error: ${error.message}`);
    } else {
      inserted += batch.length;
      process.stdout.write(`  ${inserted}/${allPlayers.length}\r`);
    }
  }

  console.log(`\n\nDone! ${inserted} real WC2026 players imported from ${teams.length} teams.`);
}

run().catch(e => { console.error(e); process.exit(1); });
