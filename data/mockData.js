import { calcFantasyPoints } from '../utils/scoring.js';

// ─── World Cup 2026 groups (dummy draw, 32 nations) ────────────────────────
export const GROUPS = [
  { group: 'A', codes: ['USA', 'MEX', 'CAN', 'QAT'], name: 'USA / Mexico / Canada / Qatar' },
  { group: 'B', codes: ['ARG', 'ECU', 'URU', 'PAR'], name: 'Argentina / Ecuador / Uruguay / Paraguay' },
  { group: 'C', codes: ['FRA', 'BEL', 'MAR', 'ALG'], name: 'France / Belgium / Morocco / Algeria' },
  { group: 'D', codes: ['ENG', 'GER', 'SCO', 'AUS'], name: 'England / Germany / Scotland / Australia' },
  { group: 'E', codes: ['ESP', 'POR', 'CRO', 'SUI'], name: 'Spain / Portugal / Croatia / Switzerland' },
  { group: 'F', codes: ['BRA', 'COL', 'SEN', 'GHA'], name: 'Brazil / Colombia / Senegal / Ghana' },
  { group: 'G', codes: ['NED', 'NOR', 'EGY', 'TUN'], name: 'Netherlands / Norway / Egypt / Tunisia' },
  { group: 'H', codes: ['JPN', 'KOR', 'KSA', 'SWE'], name: 'Japan / South Korea / Saudi Arabia / Sweden' },
];

export const COUNTRY_NAMES = {
  USA: 'USA', MEX: 'Mexico', CAN: 'Canada', QAT: 'Qatar',
  ARG: 'Argentina', ECU: 'Ecuador', URU: 'Uruguay', PAR: 'Paraguay',
  FRA: 'France', BEL: 'Belgium', MAR: 'Morocco', ALG: 'Algeria',
  ENG: 'England', GER: 'Germany', SCO: 'Scotland', AUS: 'Australia',
  ESP: 'Spain', POR: 'Portugal', CRO: 'Croatia', SUI: 'Switzerland',
  BRA: 'Brazil', COL: 'Colombia', SEN: 'Senegal', GHA: 'Ghana',
  NED: 'Netherlands', NOR: 'Norway', EGY: 'Egypt', TUN: 'Tunisia',
  JPN: 'Japan', KOR: 'South Korea', KSA: 'Saudi Arabia', SWE: 'Sweden',
};

export const COUNTRY_CODES = GROUPS.flatMap(g => g.codes);

const VENUES = [
  'SoFi Stadium, LA', 'MetLife Stadium, NJ', 'AT&T Stadium, Dallas', 'Rose Bowl, LA',
  "Levi's Stadium, SF", 'Hard Rock Stadium, Miami', 'Mercedes-Benz Stadium, Atlanta',
  'Lincoln Financial Field, Philadelphia', 'Estadio Azteca, Mexico City', 'BC Place, Vancouver',
];

// ─── Marquee names so the pool isn't all generated filler ──────────────────
const STAR_NAMES = {
  ARG: ['Lionel Messi', 'Julián Álvarez'],
  FRA: ['Kylian Mbappé', 'Antoine Griezmann'],
  BRA: ['Vinícius Júnior', 'Neymar Jr.'],
  ENG: ['Jude Bellingham', 'Bukayo Saka'],
  POR: ['Cristiano Ronaldo', 'Bruno Fernandes'],
  BEL: ['Kevin De Bruyne', 'Romelu Lukaku'],
  NOR: ['Erling Haaland'],
  EGY: ['Mohamed Salah'],
  ESP: ['Rodri', 'Pedri'],
  NED: ['Virgil van Dijk', 'Jamal Musiala'],
  CRO: ['Luka Modrić'],
  GER: ['Manuel Neuer'],
};

const FIRST_NAMES = ['Carlos', 'Luis', 'Diego', 'Marco', 'Jan', 'Erik', 'Lucas', 'Mateo', 'Hugo', 'Tom', 'Sam', 'Leo', 'Noah', 'Adam', 'Omar', 'Yusuf', 'Kenji', 'Haruto', 'Felix', 'Ivan', 'Pavel', 'Stefan', 'Marcus', 'Andre', 'Bruno', 'Rafael', 'Pedro', 'Joao', 'Karim', 'Said', 'Viktor', 'Dario'];
const LAST_NAMES  = ['Silva', 'Garcia', 'Müller', 'Rossi', 'Janssen', 'Olsen', 'Costa', 'Fernandez', 'Novak', 'Smith', 'Johnson', 'Dubois', 'Haddad', 'Nakamura', 'Park', 'Kim', 'Popov', 'Andersson', 'Larsen', 'Mendes', 'Santos', 'Almeida', 'Hassan', 'Saleh', 'Diallo', 'Toure', 'Ahmed', 'Khan', 'Berg', 'Lindqvist'];

function rnd(min, max) { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
function pick(arr) { return arr[rndInt(0, arr.length - 1)]; }

function randomGwStats(position) {
  const played = Math.random() < 0.85;
  if (!played) return { minutes: 0, goals: 0, assists: 0, clean_sheet: false, yellow_cards: 0, red_cards: 0, saves: 0 };

  const minutes = Math.random() < 0.75 ? rndInt(60, 90) : rndInt(1, 59);
  const scoreChance = position === 'FW' ? 0.45 : position === 'MF' ? 0.22 : 0.07;
  const assistChance = position === 'FW' ? 0.2 : position === 'MF' ? 0.28 : 0.12;
  const goals   = Math.random() < scoreChance ? rndInt(1, 2) : 0;
  const assists = Math.random() < assistChance ? rndInt(1, 2) : 0;
  const cleanSheetChance = position === 'GK' || position === 'DF' ? 0.35 : position === 'MF' ? 0.15 : 0.05;
  const clean_sheet = minutes >= 60 && Math.random() < cleanSheetChance;
  const yellow_cards = Math.random() < 0.12 ? 1 : 0;
  const red_cards    = Math.random() < 0.015 ? 1 : 0;
  const saves = position === 'GK' && minutes > 0 ? rndInt(0, 7) : 0;

  return { minutes, goals, assists, clean_sheet, yellow_cards, red_cards, saves };
}

function buildPlayer(id, name, position, country) {
  const player_gw_stats = Array.from({ length: 5 }, () => randomGwStats(position));
  const weekly_pts = player_gw_stats.map(s => calcFantasyPoints(s, position));
  const total_pts  = weekly_pts.reduce((a, b) => a + b, 0);
  const recentForm = weekly_pts.slice(-3);
  const form = recentForm.length ? recentForm.reduce((a, b) => a + b, 0) / recentForm.length : 0;

  const priceRange = { GK: [4, 7], DF: [5, 9], MF: [7, 13], FW: [8, 16] }[position];
  const price_fc = Math.round(rnd(priceRange[0], priceRange[1]) * 10) * 100_000;

  return {
    id,
    name,
    position,
    country,
    price_fc,
    total_pts,
    form: Math.round(form * 10) / 10,
    selection_pct: Math.round(rnd(1, 45) * 10) / 10,
    weekly_pts,
    player_gw_stats,
    photo: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(id)}&radius=50&backgroundColor=0057B8,1E2A40,FFC527`,
  };
}

function generatePlayers() {
  const POSITIONS = [
    ['GK', 1], ['DF', 2], ['MF', 2], ['FW', 1],
  ];
  const players = [];
  let counter = 1;

  for (const code of COUNTRY_CODES) {
    const stars = [...(STAR_NAMES[code] || [])];
    for (const [position, count] of POSITIONS) {
      for (let i = 0; i < count; i++) {
        const name = (position === 'FW' || position === 'MF') && stars.length
          ? stars.shift()
          : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
        const id = `p${counter++}`;
        const player = buildPlayer(id, name, position, code);
        if (STAR_NAMES[code]?.includes(name)) {
          player.price_fc = Math.round(rnd(11, 18) * 10) * 100_000;
          player.selection_pct = Math.round(rnd(35, 70) * 10) / 10;
        }
        players.push(player);
      }
    }
  }
  return players;
}

export const PLAYERS = generatePlayers();

// ─── Gameweeks ──────────────────────────────────────────────────────────────
export const GAMEWEEKS = [
  { id: 'gw1', number: 1, name: 'Group Stage — Matchday 1', is_current: false },
  { id: 'gw2', number: 2, name: 'Group Stage — Matchday 2', is_current: false },
  { id: 'gw3', number: 3, name: 'Group Stage — Matchday 3', is_current: true  },
  { id: 'gw4', number: 4, name: 'Round of 16',               is_current: false },
  { id: 'gw5', number: 5, name: 'Quarter-Finals',             is_current: false },
];

// ─── Fixtures ───────────────────────────────────────────────────────────────
function makeFixture(id, gwNumber, gwName, home, away, dateStr, timeStr, status) {
  const isDone = status === 'FT';
  const isLive = status === 'LIVE';
  return {
    id,
    home: COUNTRY_NAMES[home],
    home_code: home,
    home_name: COUNTRY_NAMES[home],
    away: COUNTRY_NAMES[away],
    away_code: away,
    away_name: COUNTRY_NAMES[away],
    home_score: isDone || isLive ? rndInt(0, 4) : null,
    away_score: isDone || isLive ? rndInt(0, 4) : null,
    status,
    match_date: dateStr,
    match_time: timeStr,
    venue: pick(VENUES),
    gameweeks: { number: gwNumber, name: gwName },
  };
}

function generateFixtures() {
  const fixtures = [];
  let id = 1;
  const gwDates = {
    1: ['2026-06-14', '2026-06-15', '2026-06-16'],
    2: ['2026-06-18', '2026-06-19', '2026-06-20'],
    3: ['2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25'],
    4: ['2026-06-29', '2026-06-30'],
    5: ['2026-07-03', '2026-07-04'],
  };

  GROUPS.forEach(({ codes }) => {
    const [a, b, c, d] = codes;
    const gw1Name = GAMEWEEKS[0].name, gw2Name = GAMEWEEKS[1].name, gw3Name = GAMEWEEKS[2].name;

    fixtures.push(makeFixture(`f${id++}`, 1, gw1Name, a, b, pick(gwDates[1]), '16:00:00', 'FT'));
    fixtures.push(makeFixture(`f${id++}`, 1, gw1Name, c, d, pick(gwDates[1]), '19:00:00', 'FT'));

    fixtures.push(makeFixture(`f${id++}`, 2, gw2Name, a, c, pick(gwDates[2]), '16:00:00', 'FT'));
    fixtures.push(makeFixture(`f${id++}`, 2, gw2Name, b, d, pick(gwDates[2]), '19:00:00', 'FT'));

    // GW3 is "current" — mix of live, finished today, and upcoming this week
    const gw3Status = pick(['LIVE', 'FT', 'NS', 'NS']);
    fixtures.push(makeFixture(`f${id++}`, 3, gw3Name, a, d, pick(gwDates[3]), '15:00:00', gw3Status));
    fixtures.push(makeFixture(`f${id++}`, 3, gw3Name, b, c, pick(gwDates[3]), '18:00:00', pick(['LIVE', 'FT', 'NS'])));
  });

  // Knockout-flavoured fixtures for GW4/GW5 — all upcoming
  const allCodes = COUNTRY_CODES;
  for (let i = 0; i < 8; i++) {
    const home = allCodes[i * 2];
    const away = allCodes[i * 2 + 1];
    fixtures.push(makeFixture(`f${id++}`, 4, GAMEWEEKS[3].name, home, away, pick(gwDates[4]), '17:00:00', 'NS'));
  }
  for (let i = 0; i < 4; i++) {
    const home = allCodes[i * 4];
    const away = allCodes[i * 4 + 2];
    fixtures.push(makeFixture(`f${id++}`, 5, GAMEWEEKS[4].name, home, away, pick(gwDates[5]), '17:00:00', 'NS'));
  }

  return fixtures;
}

export const FIXTURES = generateFixtures();

// ─── World Cup standings (api-football response shape) ────────────────────
function generateStandings() {
  return GROUPS.map(({ group, codes }) => {
    const table = codes.map(code => ({
      team:   { name: COUNTRY_NAMES[code] },
      all:    { played: rndInt(1, 3) },
      points: rndInt(0, 9),
      goalsDiff: rndInt(-3, 5),
    })).sort((a, b) => b.points - a.points);

    return { league: { name: `Group ${group}`, standings: [table] } };
  });
}

export const STANDINGS_MOCK = generateStandings();
