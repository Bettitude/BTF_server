import './config/env.js'; // validates env vars before anything else
import app from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  console.log('\n┌─────────────────────────────────────────────┐');
  console.log(`│  Bettitude Fantasy Arena — API Server        │`);
  console.log(`│  http://localhost:${env.PORT}  [${env.NODE_ENV}]        │`);
  console.log('└─────────────────────────────────────────────┘\n');
  console.log('  Supabase  →', env.SUPABASE_URL ? '✓ Connected' : '✗ Not configured');
  console.log('  Sport API →', env.SPORTRADAR_KEY || env.APIFOOTBALL_KEY ? '✓ Configured' : '⚠ Mock mode');
  console.log('  Sport     →  World Cup (soccer) primary\n');
});
