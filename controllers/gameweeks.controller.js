import { GAMEWEEKS } from '../data/mockData.js';
import { ok, notFound } from '../utils/response.js';

export async function list(req, res) {
  return res.json(ok([...GAMEWEEKS].sort((a, b) => a.number - b.number)));
}

export async function current(req, res) {
  const gw = GAMEWEEKS.find(g => g.is_current);
  if (!gw) return res.status(404).json(notFound('Current gameweek'));
  return res.json(ok(gw));
}
