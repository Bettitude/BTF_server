// Player pricing + rating, modelled on the official FIFA World Cup Fantasy 2026 game:
//   · prices range $3.5M – $10.5M in 0.5M steps
//   · $100M budget for 15 players (2 GK / 5 DF / 5 MF / 3 FW)
//   · prices are FIXED for the whole tournament (FIFA doesn't move them)
//
// Since pre-tournament per-player stats aren't available on our API plan,
// launch prices come from team strength (FIFA ranking tier) + position + squad
// role, which reproduces FIFA's actual price distribution closely. The admin
// recalc endpoint can refine prices from real ratings between matchdays if wanted.

export const PRICE_MIN  = 3_500_000;
export const PRICE_MAX  = 10_500_000;
export const PRICE_STEP = 500_000;

export const BASE_PRICE = { GK: 3_500_000, DF: 4_000_000, MF: 4_500_000, FW: 5_000_000 };

// Tier 1 = title favourites … Tier 4 = outsiders (used at import time)
export const TEAM_TIERS = {
  // Tier 1 — favourites
  ARG: 1, FRA: 1, BRA: 1, ENG: 1, ESP: 1,
  // Tier 2 — contenders
  GER: 2, POR: 2, NED: 2, BEL: 2, ITA: 2, URU: 2, CRO: 2, COL: 2, MAR: 2,
  // Tier 3 — solid sides
  USA: 3, MEX: 3, SUI: 3, DEN: 3, JPN: 3, KOR: 3, SEN: 3, ECU: 3, AUT: 3, POL: 3, SRB: 3, UKR: 3, TUR: 3, NGA: 3, EGY: 3, ALG: 3, PAR: 3, CAN: 3, AUS: 3, NOR: 3, SWE: 3, SCO: 3, WAL: 3, IRN: 3, CIV: 3, TUN: 3, CHI: 3, PER: 3, GHA: 3, CMR: 3, RSA: 3, MLI: 3, QAT: 4, KSA: 4,
};

const TIER_BONUS = { 1: 2_500_000, 2: 1_500_000, 3: 500_000, 4: 0 };

function snap(price) {
  const snapped = Math.round(price / PRICE_STEP) * PRICE_STEP;
  return Math.min(PRICE_MAX, Math.max(PRICE_MIN, snapped));
}

// Launch price at import time: team tier + position + squad role.
// `role` 0..1 = how senior the player is in the squad (1 = star/starter).
export function launchPrice(position, countryCode, role = 0.5) {
  const base = BASE_PRICE[position] ?? 4_000_000;
  const tier = TIER_BONUS[TEAM_TIERS[countryCode] ?? 4] ?? 0;
  const roleBonus = Math.round(role * 1_500_000);
  return snap(base + tier + roleBonus);
}

// Refined price from real performance stats (admin recalc between matchdays).
// stats: { rating, goals, assists, appearances, cleanSheets, saves }
export function computePrice(position, stats = {}) {
  const rating      = Number(stats.rating) || 0;
  const goals       = stats.goals ?? 0;
  const assists     = stats.assists ?? 0;
  const appearances = stats.appearances ?? 0;
  const cleanSheets = stats.cleanSheets ?? 0;
  const saves       = stats.saves ?? 0;

  const base = BASE_PRICE[position] ?? 4_500_000;
  const ratingBonus = Math.max(0, rating - 6) * 1_500_000;   // 7.0 → +1.5M, 8.0 → +3M
  const goalBonus   = Math.min(goals, 8)   * 400_000;
  const assistBonus = Math.min(assists, 8) * 250_000;
  const appsBonus   = Math.min(appearances, 7) * 100_000;
  const gkDfBonus   = (position === 'GK' || position === 'DF')
    ? Math.min(cleanSheets, 7) * 150_000 + Math.min(saves, 30) * 10_000
    : 0;

  return snap(base + ratingBonus + goalBonus + assistBonus + appsBonus + gkDfBonus);
}

export function computeRating(rawRating) {
  const n = Number(rawRating);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}
