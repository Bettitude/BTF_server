// Fantasy scoring — mirrors the official FIFA World Cup Fantasy 2026 rules.
//
//   All players:  1 pt for playing, +1 more at 60+ mins, +3 per assist,
//                 +2 penalty won, -1 penalty conceded, -2 penalty missed,
//                 -1 yellow, -2 red, -2 own goal
//   GK:  goal +9 · clean sheet (60+) +5 · 1st goal conceded free then -1 each
//        · penalty save +3 · every 3 saves +1
//   DF:  goal +7 · clean sheet (60+) +5 · 1st goal conceded free then -1 each
//   MF:  goal +6 · clean sheet (60+) +1 · every 3 tackles +1 · every 2 chances created +1
//   FW:  goal +5 · every 2 shots on target +1
//
// `stats` is a player_gw_stats row (snake_case DB columns).
const GOAL_PTS = { GK: 9, DF: 7, MF: 6, FW: 5 };

export function calcFantasyPoints(stats, position) {
  if (!stats || !stats.minutes) return 0;
  let pts = stats.minutes >= 60 ? 2 : 1;

  pts += (stats.goals   || 0) * (GOAL_PTS[position] ?? 5);
  pts += (stats.assists || 0) * 3;

  if (stats.clean_sheet && stats.minutes >= 60) {
    if (position === 'GK' || position === 'DF') pts += 5;
    else if (position === 'MF')                 pts += 1;
  }

  // Goals conceded: first one is free, each additional costs a point (GK/DF only)
  if (position === 'GK' || position === 'DF') {
    pts -= Math.max(0, (stats.goals_conceded || 0) - 1);
  }

  if (position === 'GK') {
    pts += Math.floor((stats.saves || 0) / 3);
    pts += (stats.penalties_saved || 0) * 3;
  }
  if (position === 'MF') {
    pts += Math.floor((stats.tackles    || 0) / 3);
    pts += Math.floor((stats.key_passes || 0) / 2);
  }
  if (position === 'FW') {
    pts += Math.floor((stats.shots_on || 0) / 2);
  }

  pts += (stats.penalties_won       || 0) * 2;
  pts -= (stats.penalties_committed || 0);
  pts -= (stats.penalties_missed    || 0) * 2;
  pts -= (stats.yellow_cards        || 0);
  pts -= (stats.red_cards           || 0) * 2;
  pts -= (stats.own_goals           || 0) * 2;

  return pts;
}
