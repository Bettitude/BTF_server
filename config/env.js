import dotenv from 'dotenv';
dotenv.config();

// Supabase is no longer required to boot — gameplay data lives in the in-memory
// runtime store (see store/runtimeStore.js). Only the admin tooling still touches
// Supabase, and it's fine for that to be unconfigured.

export const env = {
  PORT:                   parseInt(process.env.PORT || '3001', 10),
  NODE_ENV:               process.env.NODE_ENV || 'development',

  // Supabase (admin tooling only — placeholder keeps the client from throwing on boot)
  SUPABASE_URL:           process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_KEY:   process.env.SUPABASE_SERVICE_KEY || 'placeholder',
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
