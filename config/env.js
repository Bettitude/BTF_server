import dotenv from 'dotenv';
dotenv.config();

// All gameplay data (auth, players, fixtures, squads, points, leagues, chat,
// notifications) lives in Supabase. Without real SUPABASE_URL/keys in .env,
// every data-backed route will fail at request time.

export const env = {
  PORT:                   parseInt(process.env.PORT || '3001', 10),
  NODE_ENV:               process.env.NODE_ENV || 'development',

  // Supabase — placeholder only keeps the client from throwing on boot when unset
  SUPABASE_URL:           process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_KEY:   process.env.SUPABASE_SERVICE_KEY || 'placeholder',
  SUPABASE_ANON_KEY:      process.env.SUPABASE_ANON_KEY || '',

  // Sports data APIs
  SPORTRADAR_KEY:         process.env.SPORTRADAR_LIVESCORE_KEY || '',
  APIFOOTBALL_KEY:        process.env.APIFOOTBALL_KEY || '',
  SYNC_INTERVAL_SEC:      parseInt(process.env.SYNC_INTERVAL_SEC || '150', 10),

  // AI
  GEMINI_API_KEY:         process.env.GEMINI_API_KEY || '',

  // Email notifications (Google Apps Script web app — see email-apps-script.gs)
  EMAIL_WEBHOOK_URL:      process.env.EMAIL_WEBHOOK_URL    || '',
  EMAIL_WEBHOOK_SECRET:   process.env.EMAIL_WEBHOOK_SECRET || '',

  // CORS
  CLIENT_URL:             process.env.CLIENT_URL || 'http://localhost:3000',
  ADMIN_URL:              process.env.ADMIN_URL  || 'http://localhost:4000',
};
