import { supabase } from '../config/supabase.js';
import { dbFindOne, dbUpdate } from './supabase.service.js';
import { INITIAL_PLAYERS, INITIAL_SOCCER_PLAYERS } from '../playersData.js';

// Return remaining available players for this league
export async function getAvailablePlayers(leagueId, sport = 'soccer') {
  const allPlayers = sport === 'soccer' ? INITIAL_SOCCER_PLAYERS : INITIAL_PLAYERS;

  // Fetch all drafted player IDs
  const { data: rosters } = await supabase
    .from('rosters')
    .select('player_id')
    .in('team_id', (
      await supabase.from('teams').select('id').eq('league_id', leagueId)
    ).data?.map(t => t.id) || []);

  const draftedIds = new Set((rosters || []).map(r => r.player_id));
  return allPlayers.filter(p => !draftedIds.has(p.id));
}

// Process a single draft pick
export async function processPick(leagueId, teamId, playerId, sport = 'soccer') {
  const allPlayers = sport === 'soccer' ? INITIAL_SOCCER_PLAYERS : INITIAL_PLAYERS;
  const player = allPlayers.find(p => p.id === playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  // Ensure player exists in DB (upsert)
  await supabase.from('players').upsert({
    id:               player.id,
    name:             player.name,
    position:         player.position,
    team:             player.team,
    injury_status:    player.injuryStatus,
    projected_points: player.projectedPoints,
    weekly_points:    player.weeklyPoints,
    stats:            player.stats,
    rank:             player.rank,
  }, { onConflict: 'id' });

  // Add to roster
  const { error: rosterErr } = await supabase
    .from('rosters')
    .insert({ team_id: teamId, player_id: playerId });
  if (rosterErr) throw rosterErr;

  // Auto-fill into best available lineup slot
  const team = await dbFindOne('teams', { id: teamId });
  const lineup = team?.lineup || {};
  const updatedLineup = fillLineupSlot(lineup, player, sport);

  await dbUpdate('teams', { id: teamId }, { lineup: updatedLineup });

  // Advance draft pick counter
  const league = await dbFindOne('leagues', { id: leagueId });
  await dbUpdate('leagues', { id: leagueId }, {
    current_draft_pick: (league?.current_draft_pick || 0) + 1,
  });

  return { player, lineup: updatedLineup };
}

function fillLineupSlot(lineup, player, sport) {
  const updated = { ...lineup };

  if (sport === 'soccer') {
    const slotMap = {
      GK:  ['GK'],
      DF:  ['DF1', 'DF2', 'UTIL'],
      MF:  ['MF1', 'MF2', 'FLEX', 'UTIL'],
      FW:  ['FW1', 'FW2', 'FLEX', 'UTIL'],
    };
    const slots = slotMap[player.position] || ['BN1', 'BN2', 'BN3', 'BN4', 'BN5', 'BN6'];
    const bench = ['BN1', 'BN2', 'BN3', 'BN4', 'BN5', 'BN6'];
    const targets = [...slots, ...bench];
    for (const slot of targets) {
      if (updated[slot] === null || updated[slot] === undefined) {
        updated[slot] = player.id;
        break;
      }
    }
  } else {
    const slotMap = {
      QB:    ['QB'],
      RB:    ['RB1', 'RB2', 'FLEX'],
      WR:    ['WR1', 'WR2', 'FLEX'],
      TE:    ['TE', 'FLEX'],
      K:     ['K'],
      'D/ST': ['D/ST'],
    };
    const slots = slotMap[player.position] || [];
    const bench = ['BN1', 'BN2', 'BN3', 'BN4', 'BN5', 'BN6'];
    const targets = [...slots, ...bench];
    for (const slot of targets) {
      if (updated[slot] === null || updated[slot] === undefined) {
        updated[slot] = player.id;
        break;
      }
    }
  }

  return updated;
}
