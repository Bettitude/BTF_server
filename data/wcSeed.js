export const GAMEWEEKS = [
  { number: 1, name: 'Group Stage — MD1', deadline: '2026-06-11T16:00:00Z', is_current: true,  is_finished: false },
  { number: 2, name: 'Group Stage — MD2', deadline: '2026-06-18T16:00:00Z', is_current: false, is_finished: false },
  { number: 3, name: 'Group Stage — MD3', deadline: '2026-06-24T16:00:00Z', is_current: false, is_finished: false },
  { number: 4, name: 'Round of 32',       deadline: '2026-06-28T16:00:00Z', is_current: false, is_finished: false },
  { number: 5, name: 'Round of 16',       deadline: '2026-07-04T16:00:00Z', is_current: false, is_finished: false },
  { number: 6, name: 'Quarter-finals',    deadline: '2026-07-09T16:00:00Z', is_current: false, is_finished: false },
  { number: 7, name: 'Semi-finals',       deadline: '2026-07-14T16:00:00Z', is_current: false, is_finished: false },
  { number: 8, name: 'Final Stage',       deadline: '2026-07-18T16:00:00Z', is_current: false, is_finished: false },
];

// Maps an API-Football round string to our gameweek number
export function roundToGameweek(round = '') {
  const r = round.toLowerCase();
  const groupMatch = r.match(/group stage\s*-\s*(\d)/);
  if (groupMatch) return parseInt(groupMatch[1], 10);
  if (r.includes('round of 32')) return 4;
  if (r.includes('round of 16')) return 5;
  if (r.includes('quarter'))     return 6;
  if (r.includes('semi'))        return 7;
  if (r.includes('third') || r.includes('final')) return 8;
  return null;
}
