// One-off: re-price all players to the FIFA-style $3.5–10.5M band and backfill
// real photos from API-Football. Safe on live data — never touches stats fields.
// Usage: node scripts/repriceAndPhotos.js
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const { supabase } = await import('../config/supabase.js');
const { apiFootball, apiFetch } = await import('../config/footballApi.js');
const { launchPrice } = await import('../utils/playerValuation.js');

const POS_MAP = { Goalkeeper: 'GK', Defender: 'DF', Midfielder: 'MF', Attacker: 'FW' };

const teamsRes = await apiFetch(apiFootball.wcTeams(), { headers: apiFootball.headers });
const teams = teamsRes.response || [];
console.log('teams:', teams.length);

const rows = [];
for (const { team } of teams) {
  try {
    const squadRes = await apiFetch(apiFootball.teamSquad(team.id), { headers: apiFootball.headers });
    const squad = squadRes.response?.[0]?.players || [];
    for (const p of squad) {
      const position = POS_MAP[p.position];
      if (!position) continue;
      const number = p.number || 26;
      const role = number <= 11 ? 1 : number <= 23 ? 0.5 : 0.15;
      rows.push({
        id:       String(p.id),
        name:     p.name,
        country:  team.code,
        position,
        price_fc: launchPrice(position, team.code, role),
        photo:    p.photo || null,
      });
    }
  } catch (err) {
    console.log(`skip ${team.name}: ${err.message}`);
  }
  await new Promise(r => setTimeout(r, 150));
}
console.log('players fetched:', rows.length);

const BATCH = 100;
let done = 0, photoSupported = true;
for (let i = 0; i < rows.length; i += BATCH) {
  let batch = rows.slice(i, i + BATCH);
  if (!photoSupported) batch = batch.map(({ photo, ...rest }) => rest);

  let { error } = await supabase.from('players').upsert(batch, { onConflict: 'id' });
  if (error?.message?.includes('photo')) {
    photoSupported = false;
    console.log('! photo column missing — continuing with prices only');
    ({ error } = await supabase.from('players').upsert(batch.map(({ photo, ...rest }) => rest), { onConflict: 'id' }));
  }
  if (error) console.log('batch error:', error.message);
  else done += batch.length;
}
console.log('upserted:', done, '· photos stored:', photoSupported ? 'yes' : 'NO (column missing)');

// Verify: price band + stats survived
const { data: prices } = await supabase.from('players').select('price_fc').order('price_fc', { ascending: false }).limit(1);
const { data: cheapest } = await supabase.from('players').select('price_fc').order('price_fc', { ascending: true }).limit(1);
const { data: top } = await supabase.from('players').select('name, price_fc, total_pts').order('total_pts', { ascending: false }).limit(3);
console.log('price range:', (cheapest?.[0]?.price_fc / 1e6) + 'M –', (prices?.[0]?.price_fc / 1e6) + 'M');
console.log('top scorers (stats intact?):', JSON.stringify(top));
process.exit(0);
