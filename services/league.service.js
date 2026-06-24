import { supabase } from '../config/supabase.js';
import { dbInsert, dbFindOne, dbFindMany, dbUpdate } from './supabase.service.js';
import { buildLeague } from '../utils/leagueBuilder.js';

export async function createLeague(payload) {
  const league = buildLeague(payload);

  // Persist to Supabase
  const leagueRow = await dbInsert('leagues', {
    id:                   league.id,
    name:                 league.name,
    sport:                payload.sport || 'soccer',
    is_drafted:           false,
    current_draft_pick:   0,
    current_week:         1,
    settings:             league.settings,
  });

  // Persist all teams
  const teamInserts = league.teams.map(t => ({
    id:          t.id,
    league_id:   leagueRow.id,
    name:        t.name,
    owner_name:  t.ownerName,
    avatar:      t.avatar,
    is_user:     t.isUser,
    wins:        0,
    losses:      0,
    total_points: 0,
    lineup:      t.lineup,
  }));

  const { error: teamsError } = await supabase.from('teams').insert(teamInserts);
  if (teamsError) throw teamsError;

  return { ...leagueRow, teams: league.teams };
}

export async function getLeague(leagueId) {
  const league = await dbFindOne('leagues', { id: leagueId });
  if (!league) return null;

  const teams = await dbFindMany('teams', { league_id: leagueId });
  return { ...league, teams };
}

export async function updateLeagueSettings(leagueId, settings) {
  return dbUpdate('leagues', { id: leagueId }, { settings });
}

export async function advanceWeek(leagueId) {
  const league = await dbFindOne('leagues', { id: leagueId });
  if (!league) throw new Error('League not found');
  return dbUpdate('leagues', { id: leagueId }, { current_week: league.current_week + 1 });
}

export async function markDrafted(leagueId) {
  return dbUpdate('leagues', { id: leagueId }, { is_drafted: true });
}
