import { MOCK_OPPONENT_OWNERS } from '../playersData.js';

const SOCCER_CPU_NAMES = [
  'Madrid Galácticos', 'Parisian Stars', 'Munich Knights', 'United Devils',
  'Inter Milano', 'Catalonia Gunners', 'London City Blue', 'Milano Kings', 'Ajax Reds',
];

const NFL_CPU_NAMES = MOCK_OPPONENT_OWNERS.map(o => `${o.name.split(' ')[0]}'s Franchise`);

function buildEmptyLineup(sport) {
  if (sport === 'soccer') {
    return {
      GK: null, DF1: null, DF2: null, MF1: null, MF2: null,
      FW1: null, FW2: null, FLEX: null, UTIL: null,
      BN1: null, BN2: null, BN3: null, BN4: null, BN5: null, BN6: null,
    };
  }
  return {
    QB: null, RB1: null, RB2: null, WR1: null, WR2: null,
    TE: null, FLEX: null, K: null, 'D/ST': null,
    BN1: null, BN2: null, BN3: null, BN4: null, BN5: null, BN6: null,
  };
}

export function buildLeague({ franchiseName, ownerName, themeColor, sport = 'soccer', draftPosition = 1 }) {
  const isSoccer = sport === 'soccer';
  const lineup = buildEmptyLineup(sport);
  const cpuNames = isSoccer ? SOCCER_CPU_NAMES : NFL_CPU_NAMES;

  const userTeam = {
    id: 'user-team',
    name: franchiseName,
    ownerName,
    avatar: ownerName.charAt(0).toUpperCase(),
    isUser: true,
    roster: [],
    lineup,
    wins: 0,
    losses: 0,
    totalPoints: 0,
  };

  const cpuTeams = MOCK_OPPONENT_OWNERS.map((owner, idx) => ({
    id: `cpu-team-${idx}`,
    name: cpuNames[idx] || `Team ${idx + 2}`,
    ownerName: owner.name,
    avatar: owner.avatar,
    isUser: false,
    roster: [],
    lineup: { ...lineup },
    wins: 0,
    losses: 0,
    totalPoints: 0,
  }));

  return {
    id: `league-${Date.now()}`,
    name: isSoccer ? 'Bettitude World Cup Fantasy' : 'Bettitude Championship League',
    sport,
    themeColor: themeColor || 'emerald',
    teams: [userTeam, ...cpuTeams],
    drafted: false,
    currentDraftPick: 0,
    draftPosition,
    currentWeek: 1,
    settings: {
      maxTeams: 10,
      scoringType: isSoccer ? 'Standard' : 'PPR',
      passingTdPoints: isSoccer ? 0 : 4,
      rosterSize: 15,
    },
  };
}

export function buildSnakeDraftOrder(numTeams, rounds) {
  const order = [];
  for (let round = 0; round < rounds; round++) {
    const picks = Array.from({ length: numTeams }, (_, i) => i);
    if (round % 2 === 1) picks.reverse(); // snake flip
    order.push(...picks);
  }
  return order;
}
