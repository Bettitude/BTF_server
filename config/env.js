import dotenv from 'dotenv';
dotenv.config();

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
];

const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`\n[ENV ERROR] Missing required environment variables:\n  ${missing.join('\n  ')}\n`);
  console.error('Copy .env.example to .env and fill in all values.\n');
  process.exit(1);
}

export const env = {
  PORT:                   parseInt(process.env.PORT || '3001', 10),
  NODE_ENV:               process.env.NODE_ENV || 'development',

  // Supabase
  SUPABASE_URL:           process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY:   process.env.SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY:      process.env.SUPABASE_ANON_KEY || '',

  // Sports data APIs
  SPORTRADAR_KEY:         process.env.SPORTRADAR_LIVESCORE_KEY || '',
  APIFOOTBALL_KEY:        process.env.APIFOOTBALL_KEY || '',

  // AI
  GEMINI_API_KEY:         process.env.GEMINI_API_KEY || '',

  // CORS
  CLIENT_URL:             process.env.CLIENT_URL || 'http://localhost:3000',
  ADMIN_URL:              process.env.ADMIN_URL  || 'http://localhost:4000',
};
