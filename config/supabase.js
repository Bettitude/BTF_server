import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from './env.js';

const sharedOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
};

// Service-role client — full DB access, used only on the server
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, sharedOptions);

// Anon client — used to verify user JWTs
export const supabaseAnon = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_KEY,
  sharedOptions
);
