import { FIXTURES } from '../data/mockData.js';
import { ok } from '../utils/response.js';

export async function list(req, res) {
  const { gw, status } = req.query;
  let fixtures = [...FIXTURES];

  if (gw)     fixtures = fixtures.filter(f => f.gameweeks.number === parseInt(gw));
  if (status) fixtures = fixtures.filter(f => f.status === status.toUpperCase());

  return res.json(ok(fixtures));
}

export async function live(req, res) {
  return res.json(ok(FIXTURES.filter(f => f.status === 'LIVE')));
}
