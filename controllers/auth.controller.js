import { supabase, supabaseAnon } from '../config/supabase.js';
import { ok, created, badRequest } from '../utils/response.js';

export async function register(req, res) {
  const { email, password, teamName = 'My Team' } = req.body;
  if (!email || !password) return res.status(400).json(badRequest('Email and password required'));

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { team_name: teamName },
  });
  if (error) {
    const status = error.message?.includes('already') ? 409 : 400;
    return res.status(status).json(badRequest(error.message));
  }

  // Create profile row
  await supabase.from('profiles').upsert({ id: data.user.id, team_name: teamName });

  return res.status(201).json(created({ userId: data.user.id, email: data.user.email }));
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json(badRequest('Email and password required'));

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json(badRequest('Invalid email or password'));

  return res.json(ok({
    accessToken:  data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt:    data.session.expires_at,
    user: {
      id:       data.user.id,
      email:    data.user.email,
      teamName: data.user.user_metadata?.team_name || 'My Team',
    },
  }));
}

export async function me(req, res) {
  const { id, email, user_metadata } = req.user;
  const { data: profile } = await supabase.from('profiles').select('team_name').eq('id', id).single();
  return res.json(ok({
    id,
    email,
    teamName: profile?.team_name || user_metadata?.team_name || 'My Team',
  }));
}

export async function logout(_req, res) {
  return res.json(ok(null, { message: 'Logged out' }));
}
