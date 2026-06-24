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

const DEMO_EMAIL    = 'demo@btff.com';
const DEMO_PASSWORD = 'demo1234';

async function main() {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { team_name: 'Demo Team' },
  });

  if (!createError) {
    console.log('Demo user created:', created.user.id);
    return;
  }

  if (!createError.message?.includes('already')) {
    throw createError;
  }

  console.log('Demo user already exists — resetting password to known value');
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = list.users.find(u => u.email === DEMO_EMAIL);
  if (!existing) throw new Error('Could not find existing demo user to update');

  const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (updateError) throw updateError;

  console.log('Demo user password reset:', existing.id);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
