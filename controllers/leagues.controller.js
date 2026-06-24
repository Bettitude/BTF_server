import * as store from '../store/runtimeStore.js';
import { PLAYERS, GAMEWEEKS } from '../data/mockData.js';
import { calcFantasyPoints } from '../utils/scoring.js';
import { ok, created, notFound, badRequest } from '../utils/response.js';

function computeUserPoints(userId) {
  const squad = store.getSquad(userId);
  if (!squad) return { total: 0, gwPts: 0 };

  const currentGw = GAMEWEEKS.find(g => g.is_current) || GAMEWEEKS[GAMEWEEKS.length - 1];
  const gwIndex = currentGw.number - 1;

  let total = 0, gwPts = 0;
  squad.playerIds.forEach(pid => {
    const player = PLAYERS.find(p => p.id === pid);
    if (!player) return;
    const stats = player.player_gw_stats[gwIndex];
    let seasonPts = player.total_pts;
    let gwScore   = calcFantasyPoints(stats, player.position);
    if (player.id === squad.captainId) { seasonPts *= 2; gwScore *= 2; }
    else if (player.id === squad.vcId) { seasonPts = Math.round(seasonPts * 1.5); gwScore = Math.round(gwScore * 1.5); }
    total += seasonPts;
    gwPts += gwScore;
  });
  return { total, gwPts };
}

export async function myLeagues(req, res) {
  const userId = req.user.id;
  const userLeagues = store.leaguesForUser(userId);

  const result = userLeagues.map(l => {
    const members = [...l.memberIds].map(id => ({ id, ...computeUserPoints(id) }))
      .sort((a, b) => b.total - a.total);
    const rank = members.findIndex(m => m.id === userId) + 1;
    const me   = members.find(m => m.id === userId);

    return {
      id: l.id, name: l.name, type: l.type, code: l.code,
      created_by: l.created_by, created_at: l.created_at,
      myTotalPts: me?.total ?? 0,
      myGwPts:    me?.gwPts ?? 0,
      myRank:     rank || null,
    };
  });

  return res.json(ok(result));
}

export async function create(req, res) {
  const userId = req.user.id;
  const { name, type = 'private' } = req.body;
  if (!name?.trim()) return res.status(400).json(badRequest('League name required'));

  const league = store.createLeague(userId, name.trim(), type);
  return res.status(201).json(created({ id: league.id, name: league.name, type: league.type, code: league.code }));
}

export async function join(req, res) {
  const userId = req.user.id;
  const { code } = req.body;
  if (!code) return res.status(400).json(badRequest('League code required'));

  const result = store.joinLeagueByCode(userId, code.trim());
  if (result.error === 'not_found')      return res.status(404).json(notFound('League'));
  if (result.error === 'already_member') return res.status(409).json(badRequest('Already a member'));

  return res.json(ok({ id: result.league.id, name: result.league.name, type: result.league.type, code: result.league.code }));
}

export async function standings(req, res) {
  const { id } = req.params;
  const league = store.leagues.get(id);
  if (!league) return res.status(404).json(notFound('League'));

  const rows = [...league.memberIds]
    .map(uid => {
      const user = store.users.get(uid);
      return { userId: uid, name: user?.teamName || 'Unknown', ...computeUserPoints(uid) };
    })
    .sort((a, b) => b.total - a.total)
    .map((r, i) => ({ rank: i + 1, userId: r.userId, name: r.name, gwPts: r.gwPts, total: r.total }));

  return res.json(ok(rows));
}

export async function globalLeague(req, res) {
  const real = [...store.users.values()].map(u => ({
    userId: u.id,
    name:   u.teamName,
    ...computeUserPoints(u.id),
  }));

  const combined = [...store.globalStandings, ...real]
    .sort((a, b) => b.total - a.total)
    .map((entry, i) => ({ rank: i + 1, userId: entry.userId, name: entry.name, gwPts: entry.gwPts, total: entry.total }));

  return res.json(ok(combined));
}
