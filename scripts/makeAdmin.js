// Grants admin access to an existing user by email.
// Usage: node scripts/makeAdmin.js someone@example.com
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

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/makeAdmin.js <email>');
  process.exit(1);
}

async function main() {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const user = list.users.find(u => u.email === email);
  if (!user) throw new Error(`No user found with email ${email}`);

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, role: 'admin' },
  });
  if (error) throw error;

  console.log(`${email} is now an admin.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
