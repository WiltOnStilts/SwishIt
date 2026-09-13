export type CourtPos = "PG" | "SG" | "SF" | "PF" | "C";

export type LineupPlayer = {
  id: string;
  playerName: string;
  year: number;
  position: CourtPos;
  positions: CourtPos[];
  games: number;
  mpg: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  fgPct?: number | null;
  accolades: string[];
  allStar: boolean;
  mvp: boolean;
  dpoy: boolean;
  champion: boolean;
  teamName: string;
  teamAbbr: string;
};

export type PlayoffRoundResult = {
  round: string;
  opponent: string;
  won: boolean;
  series: string;
};

export type SeasonResult = {
  wins: number;
  losses: number;
  seedHint: string;
  rating: number;
  storylines: string[];
  comparison: string;
  madePlayoffs: boolean;
  playoffRounds: PlayoffRoundResult[];
  champion: boolean;
  perfectSeason: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function parsePositions(raw: string): CourtPos[] {
  const parts = raw
    .split(/[,|/]/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean) as CourtPos[];
  const valid: CourtPos[] = ["PG", "SG", "SF", "PF", "C"];
  const filtered = parts.filter((p): p is CourtPos =>
    valid.includes(p as CourtPos),
  );
  return filtered.length ? [...new Set(filtered)] : ["SF"];
}

export function canPlaySlot(player: LineupPlayer, slot: CourtPos): boolean {
  return player.positions.includes(slot);
}

function curve(
  value: number,
  midpoint: number,
  steepness: number,
  floor: number,
  ceil: number,
): number {
  const t = 1 / (1 + Math.exp(-steepness * (value - midpoint)));
  return floor + t * (ceil - floor);
}

function per36(stat: number, mpg: number): number {
  if (mpg <= 0) return stat;
  return (stat * 36) / mpg;
}

/**
 * Defensive impact on the same 42–96 scale as Superstar Studio defense.
 * Uses STL, BLK, REB, minutes, awards — shared with Undefeated wins + UI.
 */
export function playerDefense(p: LineupPlayer): number {
  const isC = p.positions.includes("C");
  const isPF = p.positions.includes("PF");
  const big = isC || isPF;
  const guard = p.positions.includes("PG") || p.positions.includes("SG");
  const stl36 = per36(p.spg, p.mpg);
  const blk36 = per36(p.bpg, p.mpg);
  const reb36 = per36(p.rpg, p.mpg);
  const stocks = p.spg + p.bpg;
  const stocks36 = stl36 + blk36;

  const stealScore =
    curve(stl36, 1.35, 0.9, 48, 94) * 0.55 +
    curve(p.spg, 1.15, 0.95, 48, 93) * 0.45;
  const blockScore =
    curve(blk36, 1.4, 0.72, 48, 95) * 0.55 +
    curve(p.bpg, 1.15, 0.78, 48, 94) * 0.45;
  const boardScore =
    curve(reb36, 8.2, 0.32, 48, 92) * 0.6 +
    curve(p.rpg, 7.0, 0.34, 48, 91) * 0.4;
  const stockScore =
    curve(stocks36, 2.0, 0.62, 50, 94) * 0.55 +
    curve(stocks, 1.7, 0.7, 50, 93) * 0.45;
  const workload = curve(p.mpg, 28, 0.13, 48, 88);
  const availability = curve(p.games, 65, 0.06, 50, 86);

  let raw: number;
  if (big) {
    raw =
      blockScore * 0.3 +
      boardScore * 0.26 +
      stockScore * 0.18 +
      stealScore * 0.12 +
      workload * 0.08 +
      availability * 0.06;
  } else if (guard) {
    raw =
      stealScore * 0.38 +
      stockScore * 0.22 +
      workload * 0.14 +
      boardScore * 0.1 +
      blockScore * 0.08 +
      availability * 0.08;
  } else {
    raw =
      stealScore * 0.26 +
      blockScore * 0.22 +
      boardScore * 0.2 +
      stockScore * 0.16 +
      workload * 0.1 +
      availability * 0.06;
  }

  if (p.bpg >= 1.2) raw += 1.5;
  if (p.bpg >= 2.0) raw += 2.5;
  if (p.bpg >= 3.0) raw += 2.5;
  if (p.bpg >= 3.8) raw += 2;
  if (p.spg >= 1.3) raw += 1.5;
  if (p.spg >= 1.8) raw += 2;
  if (p.spg >= 2.3) raw += 2.5;
  if (p.rpg >= 8 && big) raw += 1.5;
  if (p.rpg >= 10 && big) raw += 2;
  if (p.mpg >= 32 && stocks >= 1.5) raw += 1.5;

  const allDef1 = p.accolades.some((a) => /all-defense 1|def1/i.test(a));
  const allDef2 = p.accolades.some((a) => /all-defense 2|def2/i.test(a));
  const anyDef = p.accolades.some((a) => /def/i.test(a));

  if (p.dpoy) raw += 12;
  else if (allDef1) raw += 7;
  else if (allDef2) raw += 5;
  else if (anyDef) raw += 3;

  if (p.allStar && stocks >= 1.6) raw += 1.5;
  if (p.champion && stocks >= 1.4) raw += 1;

  if (stocks >= 2.0) raw = Math.max(raw, 78);
  if (stocks >= 2.5) raw = Math.max(raw, 82);
  if (stocks >= 3.2) raw = Math.max(raw, 86);
  if (stocks36 >= 3.5) raw = Math.max(raw, 84);
  if (allDef2) raw = Math.max(raw, 84);
  if (allDef1) raw = Math.max(raw, 88);
  if (p.dpoy) raw = Math.max(raw, 93);
  if (big && p.bpg >= 2.5 && p.rpg >= 8) raw = Math.max(raw, 85);
  if (guard && p.spg >= 2.0) raw = Math.max(raw, 84);

  return Math.round(clamp(raw, 42, 96));
}

export function playerPower(p: LineupPlayer): number {
  // Defense uses every defensive counting stat we store: STL, BLK, REB + awards.
  const offense = p.ppg * 1.15 + p.apg * 1.05;
  const boards = p.rpg * 1.05;
  const defense =
    p.spg * 3.1 +
    p.bpg * 2.9 +
    p.rpg * 0.35 +
    (p.spg + p.bpg) * 0.6;
  const workload = p.mpg * 0.12;

  let bonus = 0;
  if (p.mvp) bonus += 18;
  if (p.dpoy) bonus += 14;
  if (p.accolades.some((a) => /all-defense 1|def1/i.test(a))) bonus += 8;
  else if (p.accolades.some((a) => /all-defense 2|def2/i.test(a))) bonus += 5;
  else if (p.accolades.some((a) => /def/i.test(a))) bonus += 3;
  if (p.allStar) bonus += 6;
  if (p.champion) bonus += 4;
  bonus += Math.min(8, p.accolades.length * 2);

  const availability = clamp(p.games / 82, 0.35, 1);
  return (offense + boards + defense + workload) * availability + bonus;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * All-time playoff opponents with strength on the same scale as Undefeated team rating.
 * Higher = harder. Calibrated so mid-tier champs (e.g. 1994 Rockets) sit below
 * three-peat Lakers / dynasties — beating a stronger team implies an easier matchup
 * against a weaker one next round.
 */
const ALL_TIME_TEAMS: { name: string; strength: number }[] = [
  { name: "1996 Bulls", strength: 78 },
  { name: "2017 Warriors", strength: 77 },
  { name: "1986 Celtics", strength: 74 },
  { name: "1987 Lakers", strength: 73 },
  { name: "2001 Lakers", strength: 72 },
  { name: "2015 Warriors", strength: 71 },
  { name: "2014 Spurs", strength: 70 },
  { name: "1983 76ers", strength: 69 },
  { name: "2008 Celtics", strength: 69 },
  { name: "2012 Heat", strength: 68 },
  { name: "2002 Lakers", strength: 67 },
  { name: "1992 Bulls", strength: 67 },
  { name: "2024 Celtics", strength: 66 },
  { name: "1985 Lakers", strength: 66 },
  { name: "2016 Cavaliers", strength: 65 },
  { name: "2000 Lakers", strength: 65 },
  { name: "1991 Bulls", strength: 65 },
  { name: "2013 Heat", strength: 64 },
  { name: "2025 Thunder", strength: 64 },
  { name: "1989 Pistons", strength: 63 },
  { name: "2005 Spurs", strength: 63 },
  { name: "2023 Nuggets", strength: 62 },
  { name: "1999 Spurs", strength: 62 },
  { name: "2022 Warriors", strength: 61 },
  { name: "2009 Lakers", strength: 61 },
  { name: "2010 Lakers", strength: 60 },
  { name: "1988 Pistons", strength: 60 },
  { name: "2019 Raptors", strength: 59 },
  { name: "2006 Heat", strength: 59 },
  { name: "2020 Lakers", strength: 58 },
  { name: "1997 Jazz", strength: 58 },
  { name: "1994 Rockets", strength: 57 },
  { name: "2011 Mavericks", strength: 56 },
  { name: "2004 Pistons", strength: 56 },
  { name: "2018 Rockets", strength: 55 },
  { name: "1993 Suns", strength: 54 },
];

function impactLabel(p: LineupPlayer): string {
  const traits: { score: number; text: string }[] = [
    { score: p.ppg, text: `${p.ppg.toFixed(1)} PPG scoring punch` },
    { score: p.apg * 2.2, text: `${p.apg.toFixed(1)} APG playmaking` },
    { score: p.rpg * 1.6, text: `${p.rpg.toFixed(1)} RPG on the glass` },
    { score: p.bpg * 8, text: `${p.bpg.toFixed(1)} BPG rim protection` },
    { score: p.spg * 7, text: `${p.spg.toFixed(1)} SPG on-ball pressure` },
  ];
  traits.sort((a, b) => b.score - a.score);
  return traits[0]?.text ?? "two-way presence";
}

function pickFromBand(
  pool: { name: string; strength: number }[],
  rand: () => number,
  minS: number,
  maxS: number,
): { name: string; strength: number } {
  const band = pool.filter((t) => t.strength >= minS && t.strength <= maxS);
  const source = band.length ? band : pool;
  const i = Math.floor(rand() * source.length);
  return source.splice(i, 1)[0]!;
}

/** Earlier rounds draw weaker champs; Finals draw the heavyweights. */
function pickPlayoffOpponents(
  rand: () => number,
): { name: string; strength: number }[] {
  const pool = [...ALL_TIME_TEAMS];
  return [
    pickFromBand(pool, rand, 54, 62), // First Round
    pickFromBand(pool, rand, 58, 68), // Conf Semis
    pickFromBand(pool, rand, 62, 72), // Conf Finals
    pickFromBand(pool, rand, 66, 78), // NBA Finals
  ];
}

function seriesWinChance(
  userRating: number,
  oppStrength: number,
  roundIndex: number,
): number {
  const gap = userRating - oppStrength;
  // Slightly softer curve so modest favorites still win most series.
  let p = 1 / (1 + Math.exp(-gap / 6.5));
  // Light round tax — Conf Finals/Finals are harder, not a brick wall.
  p -= roundIndex * 0.015;
  if (gap >= 0) p += 0.05;
  if (gap >= 4) p += 0.06;
  if (gap >= 10) p += 0.06;
  return clamp(p, 0.28, 0.95);
}

function seriesScore(
  won: boolean,
  powerDiff: number,
  rand: () => number,
): string {
  const roll = rand();
  if (won) {
    // Close matchups go the distance often (Game 7 / 4-2).
    if (Math.abs(powerDiff) <= 5) {
      if (roll < 0.42) return "4-3";
      if (roll < 0.75) return "4-2";
      if (roll < 0.92) return "4-1";
      return "4-0";
    }
    if (powerDiff >= 12) {
      if (roll < 0.12) return "4-3";
      if (roll < 0.32) return "4-2";
      if (roll < 0.68) return "4-1";
      return "4-0";
    }
    if (roll < 0.28) return "4-3";
    if (roll < 0.58) return "4-2";
    if (roll < 0.85) return "4-1";
    return "4-0";
  }

  // Losses: favorites who get upset usually push it to 6–7; big underdogs get swept more.
  if (powerDiff >= 0) {
    if (roll < 0.5) return "3-4";
    if (roll < 0.82) return "2-4";
    return "1-4";
  }
  if (powerDiff <= -10) {
    if (roll < 0.12) return "3-4";
    if (roll < 0.38) return "2-4";
    if (roll < 0.7) return "1-4";
    return "0-4";
  }
  if (roll < 0.35) return "3-4";
  if (roll < 0.7) return "2-4";
  if (roll < 0.9) return "1-4";
  return "0-4";
}

function simulatePlayoffs(
  wins: number,
  rating: number,
  rand: () => number,
): {
  madePlayoffs: boolean;
  playoffRounds: PlayoffRoundResult[];
  champion: boolean;
} {
  const madePlayoffs = wins >= 38;
  if (!madePlayoffs) {
    return { madePlayoffs: false, playoffRounds: [], champion: false };
  }

  const rounds = [
    "First Round",
    "Conference Semifinals",
    "Conference Finals",
    "NBA Finals",
  ];

  const opponents = pickPlayoffOpponents(rand);

  // 82-0: auto-title run against the gauntlet.
  if (wins === 82) {
    return {
      madePlayoffs: true,
      playoffRounds: opponents.map((opp, i) => ({
        round: rounds[i]!,
        opponent: opp.name,
        won: true,
        series: seriesScore(true, rating - opp.strength + 8, rand),
      })),
      champion: true,
    };
  }

  const playoffRounds: PlayoffRoundResult[] = [];
  let champion = false;

  // Always continue to the next round after a win — Conf Finals winners reach the Finals.
  for (let i = 0; i < rounds.length; i++) {
    const opp = opponents[i]!;
    let chance = seriesWinChance(rating, opp.strength, i);
    if (wins >= 65) chance = Math.min(0.96, chance + 0.1);
    else if (wins >= 55) chance = Math.min(0.94, chance + 0.06);
    else if (wins >= 48) chance = Math.min(0.92, chance + 0.03);

    const won = rand() < chance;
    const powerDiff = rating - opp.strength;
    playoffRounds.push({
      round: rounds[i]!,
      opponent: opp.name,
      won,
      series: seriesScore(won, powerDiff, rand),
    });
    if (!won) break;
    if (i === rounds.length - 1) champion = true;
  }

  return { madePlayoffs: true, playoffRounds, champion };
}

function buildStorylines(
  lineup: LineupPlayer[],
  sixthMan: LineupPlayer | null,
  wins: number,
  losses: number,
  rand: () => number,
): string[] {
  const roster = sixthMan ? [...lineup, sixthMan] : [...lineup];
  const ranked = [...roster].sort((a, b) => playerPower(b) - playerPower(a));
  const ace = ranked[0];
  const weak = [...lineup].sort((a, b) => playerPower(a) - playerPower(b))[0];
  const stories: string[] = [];
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]!;

  const sidelined = roster
    .filter((p) => p.games < 58 && playerPower(p) >= 42)
    .sort((a, b) => playerPower(b) - playerPower(a));

  if (sidelined.length) {
    const p = sidelined[0]!;
    const missed = 82 - p.games;
    const trait = impactLabel(p);
    stories.push(
      pick([
        `${p.playerName}'s ${p.year} form was elite, but ${missed} games on the shelf meant stretches without their ${trait} — and the all-time schedule punished those nights.`,
        `When ${p.playerName} (${p.year}) was out, opponents attacked the hole they left: you don't replace ${trait} with a warm body.`,
      ]),
    );
  }

  const mvps = roster.filter((p) => p.mvp);
  if (mvps.length) {
    const names = mvps.map((p) => `${p.playerName} (${p.year})`).join(" & ");
    stories.push(
      `${names} brought MVP-level gravity — the kind that opens the floor for everyone else.`,
    );
  } else if (ace && ace.ppg >= 27) {
    stories.push(
      `${ace.playerName}'s ${ace.year} scoring (${ace.ppg.toFixed(1)} PPG) was the cheat code — defenses had to pick their poison.`,
    );
  }

  if (weak && playerPower(weak) < 32 && ace && playerPower(ace) >= 50) {
    stories.push(
      `${weak.playerName}'s ${weak.year} form was the soft spot all-time teams tried to hunt.`,
    );
  }

  const avgDef =
    lineup.reduce((s, p) => s + playerDefense(p), 0) / lineup.length;
  const byDef = [...lineup].sort(
    (a, b) => playerDefense(b) - playerDefense(a),
  );
  const bestDef = byDef[0]!;
  const softDef = byDef[byDef.length - 1]!;
  const defLabel = Math.round(avgDef);

  if (avgDef >= 84) {
    stories.push(
      `Elite defensive impact (team ${defLabel}) — ${bestDef.playerName}'s stops (${playerDefense(bestDef)} def) banked extra wins against all-time scorers.`,
    );
  } else if (avgDef >= 76) {
    stories.push(
      `Solid defensive impact (team ${defLabel}) with ${bestDef.playerName} leading — enough stops to swing toss-up nights.`,
    );
  } else if (avgDef < 68) {
    stories.push(
      `Soft defensive impact (team ${defLabel}) cost wins — ${softDef.playerName}'s end (${playerDefense(softDef)} def) got hunted by all-time offenses.`,
    );
  } else {
    stories.push(
      `Middle-of-the-pack defensive impact (team ${defLabel}) — offense had to carry more nights than a lockdown unit would need.`,
    );
  }

  if (wins >= 65) {
    stories.push(
      `${wins}-${losses} put this squad in historic company — bad nights were rare.`,
    );
  } else if (wins >= 50) {
    stories.push(
      `${wins}-${losses} made them a real problem in April — win or go home energy every night.`,
    );
  } else if (wins >= 40) {
    stories.push(
      `${wins}-${losses} was a playoff-edge grind with flashes of real dominance.`,
    );
  } else {
    stories.push(
      `${wins}-${losses} was a tough go — the all-time schedule never let up.`,
    );
  }

  const unique: string[] = [];
  for (const s of stories) {
    if (!unique.includes(s)) unique.push(s);
  }
  while (unique.length > 5) {
    unique.splice(Math.floor(rand() * (unique.length - 1)) + 1, 1);
  }
  return unique.slice(0, 5);
}

export function simulateSeason(
  lineup: LineupPlayer[],
  sixthMan: LineupPlayer | null,
): SeasonResult {
  const roster = sixthMan ? [...lineup, sixthMan] : lineup;
  const powers = roster.map(playerPower);
  const starterPower =
    lineup.reduce((s, p) => s + playerPower(p), 0) / lineup.length;
  const benchBoost = sixthMan ? playerPower(sixthMan) * 0.22 : 0;
  // Same real team-season is a small hidden bonus — never shown in storylines.
  const sameCore =
    new Set(lineup.map((p) => `${p.year}-${p.teamAbbr}`)).size === 1;
  const chemistry = sameCore ? 3 : 0;

  const starterDef =
    lineup.reduce((s, p) => s + playerDefense(p), 0) / lineup.length;
  const benchDef = sixthMan ? playerDefense(sixthMan) * 0.18 : 0;
  // Defense moves the needle: elite units win more, soft ones bleed wins.
  const defBoost = (starterDef - 72) * 0.45 + (benchDef - 13) * 0.08;

  let rating = starterPower + benchBoost + chemistry + defBoost;
  const top = Math.max(...powers);
  const depth =
    [...powers].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  rating = rating * 0.55 + top * 0.25 + depth * 0.2;

  const seed = hashSeed(roster.map((p) => p.id).join("|"));
  const rand = mulberry32(seed);

  // Higher baseline so stacked Undefeated squads win more games vs all-time competition.
  let expectedWins = clamp(
    30 + (rating - 28) * 1.2 + (rand() - 0.5) * 5,
    24,
    78,
  );
  // Tiny chance at historic perfection for absurdly stacked squads
  if (rating >= 74 && rand() > 0.88) expectedWins = 82;
  else if (rating >= 68 && rand() > 0.95) expectedWins = 82;

  const wins = Math.round(expectedWins);
  const losses = 82 - wins;

  const storylines = buildStorylines(lineup, sixthMan, wins, losses, rand);
  const playoffs = simulatePlayoffs(wins, rating, rand);

  let seedHint = "Lottery";
  if (wins >= 60) seedHint = "1–2 seed territory";
  else if (wins >= 53) seedHint = "Top-4 seed";
  else if (wins >= 45) seedHint = "Mid playoff seed";
  else if (wins >= 38) seedHint = "Play-in / low seed";
  else if (wins >= 35) seedHint = "Play-in band";

  let comparison = "Fringe contender";
  if (playoffs.champion) comparison = "Champions";
  else if (
    playoffs.playoffRounds.some((r) => r.round === "NBA Finals")
  ) {
    comparison = "Finals appearance";
  } else if (wins >= 65) comparison = "Historically great — Dynasty conversation";
  else if (
    playoffs.playoffRounds.some(
      (r) => r.round === "Conference Finals",
    )
  ) {
    comparison = "Conference finals ceiling";
  } else if (wins >= 58) comparison = "Conference finals ceiling";
  else if (wins >= 50) comparison = "Serious second-round club";
  else if (wins >= 42) comparison = "First-round live dog";
  else if (wins >= 35) comparison = "Play-in survivor profile";
  else comparison = "Rebuilding / mismatched forms";

  return {
    wins,
    losses,
    seedHint,
    rating: Math.round(rating * 10) / 10,
    storylines,
    comparison,
    madePlayoffs: playoffs.madePlayoffs,
    playoffRounds: playoffs.playoffRounds,
    champion: playoffs.champion,
    perfectSeason: wins === 82,
  };
}

export const UNDEFEATED_RESULT_KEY = "swishit-undefeated-result";
