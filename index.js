import './config/env.js'; // validates env vars before anything else
import app from './app.js';
import { env } from './config/env.js';
import { startLiveSync } from './services/statsSync.service.js';

app.listen(env.PORT, () => {
  console.log('\n┌─────────────────────────────────────────────┐');
  console.log(`│  Bettitude Fantasy Arena — API Server        │`);
  console.log(`│  http://localhost:${env.PORT}  [${env.NODE_ENV}]        │`);
  console.log('└─────────────────────────────────────────────┘\n');
  console.log('  Supabase  →', env.SUPABASE_URL ? '✓ Connected' : '✗ Not configured');
  console.log('  Sport API →', env.SPORTRADAR_KEY || env.APIFOOTBALL_KEY ? '✓ Configured' : '⚠ Not configured (live fixtures/standings disabled)');
  console.log('  Sport     →  World Cup (soccer) primary');

  // Live data: fixtures calendar at boot + player stats/ratings during match windows
  if (env.APIFOOTBALL_KEY) {
    startLiveSync({ tickSeconds: env.SYNC_INTERVAL_SEC });
  } else {
    console.log('  Live sync →  disabled (no APIFOOTBALL_KEY)\n');
  }
});
