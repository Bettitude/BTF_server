import { supabase } from '../config/supabase.js';
import { ok, badRequest } from '../utils/response.js';

export async function search(req, res) {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json(ok({ players: [], leagues: [] }));

  const pattern = `%${q}%`;

  const [playersRes, leaguesRes] = await Promise.all([
    supabase
      .from('players')
      .select('id, name, position, country, price_fc, total_pts')
      .or(`name.ilike.${pattern},country.ilike.${pattern}`)
      .order('total_pts', { ascending: false })
      .limit(10),

    supabase
      .from('leagues')
      .select('id, name, code, type')
      .ilike('name', pattern)
      .limit(5),
  ]);

  if (playersRes.error) throw playersRes.error;
  if (leaguesRes.error) throw leaguesRes.error;

  return res.json(ok({
    players: playersRes.data ?? [],
    leagues: leaguesRes.data ?? [],
  }));
}
