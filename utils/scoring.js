// Fantasy points scoring rules, shared between live points calculation and mock data generation.
export function calcFantasyPoints(stats, position) {
  if (!stats || !stats.minutes) return 0;
  let pts = 0;
  if (stats.minutes >= 60) pts += 2; else if (stats.minutes > 0) pts += 1;

  if (position === 'GK' || position === 'DF') {
    pts += stats.goals * 6;
    pts += stats.assists * 3;
    if (stats.clean_sheet && stats.minutes >= 60) pts += (position === 'GK' ? 6 : 4);
  } else if (position === 'MF') {
    pts += stats.goals * 5;
    pts += stats.assists * 3;
    if (stats.clean_sheet && stats.minutes >= 60) pts += 1;
  } else {
    pts += stats.goals * 4;
    pts += stats.assists * 3;
  }

  pts += (stats.saves || 0) >= 3 ? Math.floor(stats.saves / 3) : 0;
  if (stats.yellow_cards) pts -= 1;
  if (stats.red_cards)    pts -= 3;
  if (stats.penalties_saved)  pts += stats.penalties_saved * 5;
  if (stats.penalties_missed) pts -= stats.penalties_missed * 2;
  return pts;
}
