import { supabase, supabaseAnon } from '../config/supabase.js';
import { ok, created, badRequest } from '../utils/response.js';
import { createNotification } from './notifications.controller.js';
import { sendEventEmail } from '../services/email.service.js';

export async function register(req, res) {
  const { email, password, teamName = 'My Team' } = req.body;
  if (!email || !password) return res.status(400).json(badRequest('Please enter your email and password.'));

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { team_name: teamName },
  });
  if (error) {
    const isExisting = error.message?.toLowerCase().includes('already');
    const status = isExisting ? 409 : 400;
    const msg = isExisting
      ? 'An account with this email already exists — try signing in instead.'
      : 'We couldn\'t create your account. Please check your details and try again.';
    return res.status(status).json(badRequest(msg));
  }

  await supabase.from('profiles').upsert({ id: data.user.id, team_name: teamName });
  await createNotification(data.user.id, 'welcome', `Welcome to BT Fantasy Football, ${teamName}!`, '/build');
  sendEventEmail(data.user.email, 'signup', { teamName });

  return res.status(201).json(created({ userId: data.user.id, email: data.user.email }));
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json(badRequest('Please enter your email and password.'));

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json(badRequest('Incorrect email or password — please try again.'));

  const { data: profile } = await supabase.from('profiles').select('team_name').eq('id', data.user.id).single();

  sendEventEmail(data.user.email, 'login', {
    time: new Date().toUTCString(),
  });

  return res.json(ok({
    accessToken:  data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt:    data.session.expires_at,
    user: {
      id:       data.user.id,
      email:    data.user.email,
      teamName: profile?.team_name || data.user.user_metadata?.team_name || 'My Team',
      isAdmin:  data.user.user_metadata?.role === 'admin',
    },
  }));
}

export async function me(req, res) {
  const { id, email, user_metadata } = req.user;
  const { data: profile } = await supabase.from('profiles')
    .select('team_name, payout_method, payout_account_name, payout_account_number, payout_bank_name')
    .eq('id', id).single();
  return res.json(ok({
    id,
    email,
    teamName: profile?.team_name || user_metadata?.team_name || 'My Team',
    isAdmin:  user_metadata?.role === 'admin',
    payoutMethod:        profile?.payout_method        || '',
    payoutAccountName:   profile?.payout_account_name   || '',
    payoutAccountNumber: profile?.payout_account_number || '',
    payoutBankName:      profile?.payout_bank_name      || '',
  }));
}

export async function logout(_req, res) {
  return res.json(ok(null, { message: 'Logged out' }));
}

export async function updateProfile(req, res) {
  const { teamName, payoutMethod, payoutAccountName, payoutAccountNumber, payoutBankName } = req.body;

  const patch = {};
  if (teamName !== undefined) {
    if (!teamName.trim()) return res.status(400).json(badRequest('Team name can\'t be empty.'));
    patch.team_name = teamName.trim();
  }
  if (payoutMethod        !== undefined) patch.payout_method         = payoutMethod?.trim()        || null;
  if (payoutAccountName   !== undefined) patch.payout_account_name   = payoutAccountName?.trim()    || null;
  if (payoutAccountNumber !== undefined) patch.payout_account_number = payoutAccountNumber?.trim()  || null;
  if (payoutBankName      !== undefined) patch.payout_bank_name      = payoutBankName?.trim()       || null;

  if (Object.keys(patch).length === 0) return res.status(400).json(badRequest('Nothing to update — make a change first.'));

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', req.user.id)
    .select('team_name, payout_method, payout_account_name, payout_account_number, payout_bank_name')
    .single();
  if (error) throw error;

  const FIELD_LABELS = {
    team_name: 'team name', payout_method: 'payout method', payout_account_name: 'payout account name',
    payout_account_number: 'payout account number', payout_bank_name: 'payout bank',
  };
  sendEventEmail(req.user.email, 'profile_updated', {
    fields: Object.keys(patch).map(k => FIELD_LABELS[k] || k).join(', '),
  });

  return res.json(ok({
    id: req.user.id,
    email: req.user.email,
    teamName: data.team_name,
    payoutMethod:        data.payout_method        || '',
    payoutAccountName:   data.payout_account_name   || '',
    payoutAccountNumber: data.payout_account_number || '',
    payoutBankName:      data.payout_bank_name      || '',
  }));
}

export async function closeAccount(req, res) {
  const { error } = await supabase.auth.admin.deleteUser(req.user.id);
  if (error) throw error;
  return res.json(ok(null, { message: 'Account closed' }));
}
