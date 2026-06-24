import * as store from '../store/runtimeStore.js';
import { ok, created, badRequest } from '../utils/response.js';

export async function register(req, res) {
  const { email, password, teamName = 'My Team' } = req.body;
  if (!email || !password) return res.status(400).json(badRequest('Email and password required'));
  if (store.findUserByEmail(email)) return res.status(409).json(badRequest('Email already registered'));

  const user = store.createUser(email, password, teamName);
  store.leagues.get(store.GLOBAL_LEAGUE_ID).memberIds.add(user.id);

  return res.status(201).json(created({ userId: user.id, email: user.email }));
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json(badRequest('Email and password required'));

  const user = store.findUserByEmail(email);
  if (!user || !store.verifyPassword(user, password)) {
    return res.status(401).json(badRequest('Invalid email or password'));
  }

  const token = store.createSession(user.id);
  return res.json(ok({
    accessToken:  token,
    refreshToken: token,
    expiresAt:    Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    user:         store.publicUser(user),
  }));
}

export async function me(req, res) {
  return res.json(ok(store.publicUser(req.user)));
}

export async function logout(req, res) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) store.sessions.delete(header.slice(7));
  return res.json(ok(null, { message: 'Logged out' }));
}
