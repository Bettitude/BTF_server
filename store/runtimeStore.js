import crypto from 'crypto';
import { PLAYERS } from '../data/mockData.js';

// In-memory runtime data — resets on server restart. Replaces the dead Supabase project
// for everything that used to be stateful (users, squads, leagues, notifications, chat).

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function genId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function rndRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const users         = new Map(); // id -> { id, email, passwordHash, teamName }
export const sessions      = new Map(); // token -> userId
export const squads        = new Map(); // userId -> { formation, captainId, vcId, playerIds }
export const notifications = new Map(); // userId -> [ {...} ]
export const chatMessages  = [];        // [{ id, user_id, username, room, content, created_at }]
export const leagues       = new Map(); // id -> { id, name, type, code, created_by, created_at, memberIds: Set }

export const GLOBAL_LEAGUE_ID = 'global';

// ─── Users / auth ───────────────────────────────────────────────────────────

export function createUser(email, password, teamName) {
  const id = genId('user');
  const user = { id, email, passwordHash: hashPassword(password), teamName: teamName || 'My Team' };
  users.set(id, user);
  notifications.set(id, [{
    id: genId('notif'), user_id: id, type: 'welcome',
    message: `Welcome to BT Fantasy Football, ${teamName || 'manager'}!`,
    link: '/build', is_read: false, created_at: new Date().toISOString(),
  }]);
  return user;
}

export function findUserByEmail(email) {
  return [...users.values()].find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function verifyPassword(user, password) {
  return user.passwordHash === hashPassword(password);
}

export function createSession(userId) {
  const token = genId('tok');
  sessions.set(token, userId);
  return token;
}

export function getUserByToken(token) {
  const userId = sessions.get(token);
  return userId ? users.get(userId) : null;
}

export function publicUser(user) {
  return { id: user.id, email: user.email, teamName: user.teamName };
}

// ─── Squads ─────────────────────────────────────────────────────────────────

export function getSquad(userId) {
  return squads.get(userId) || null;
}

export function saveSquad(userId, { formation, captainId, vcId, playerIds }) {
  const squad = {
    formation:  formation || '4-3-3',
    captainId:  captainId || null,
    vcId:       vcId || null,
    playerIds:  [...playerIds],
  };
  squads.set(userId, squad);
  return squad;
}

// ─── Leagues ────────────────────────────────────────────────────────────────

const MOCK_MANAGERS = [
  "Carlos M.'s XI", "Rafael S.'s XI", "James W.'s XI", "Pierre D.'s XI", "Lucas B.'s XI",
  "Daan V.'s XI", "Álvaro T.'s XI", "Diego R.'s XI", "Nicolás F.'s XI", "Youssef A.'s XI",
];

export const globalStandings = MOCK_MANAGERS.map(name => ({
  userId: genId('mgr'),
  name,
  total: rndRange(380, 520),
  gwPts: rndRange(35, 95),
}));

leagues.set(GLOBAL_LEAGUE_ID, {
  id: GLOBAL_LEAGUE_ID,
  name: 'Global League',
  type: 'public',
  code: null,
  created_by: null,
  created_at: new Date().toISOString(),
  memberIds: new Set(),
});

export function createLeague(userId, name, type) {
  const id = genId('league');
  const code = type === 'private' ? `BTFF-${crypto.randomBytes(3).toString('hex').toUpperCase()}` : null;
  const league = { id, name, type, code, created_by: userId, created_at: new Date().toISOString(), memberIds: new Set([userId]) };
  leagues.set(id, league);
  return league;
}

export function joinLeagueByCode(userId, code) {
  const league = [...leagues.values()].find(l => l.code === code.toUpperCase());
  if (!league) return { error: 'not_found' };
  if (league.memberIds.has(userId)) return { error: 'already_member' };
  league.memberIds.add(userId);
  return { league };
}

export function leaguesForUser(userId) {
  return [...leagues.values()].filter(l => l.id !== GLOBAL_LEAGUE_ID && l.memberIds.has(userId));
}

// ─── Chat ───────────────────────────────────────────────────────────────────

chatMessages.push(
  { id: genId('msg'), user_id: 'system', username: 'BTFF', room: 'global', content: 'Welcome to the Global chat — be respectful and enjoy the World Cup!', created_at: new Date(Date.now() - 3600_000).toISOString() },
  { id: genId('msg'), user_id: 'system', username: 'BTFF', room: 'wc2026', content: 'Group stage is underway — good luck with your picks!', created_at: new Date(Date.now() - 1800_000).toISOString() },
);

// ─── Demo account seed ──────────────────────────────────────────────────────

function seedDemoAccount() {
  const demo = createUser('demo@btff.com', 'demo1234', 'Demo Team');
  leagues.get(GLOBAL_LEAGUE_ID).memberIds.add(demo.id);

  const byPos = { GK: [], DF: [], MF: [], FW: [] };
  PLAYERS.forEach(p => byPos[p.position]?.push(p));
  const starters = [
    ...byPos.GK.slice(0, 2),
    ...byPos.DF.slice(0, 5),
    ...byPos.MF.slice(0, 5),
    ...byPos.FW.slice(0, 3),
  ];

  saveSquad(demo.id, {
    formation: '4-3-3',
    captainId: starters[0]?.id,
    vcId:      starters[1]?.id,
    playerIds: starters.map(p => p.id),
  });
}

seedDemoAccount();
