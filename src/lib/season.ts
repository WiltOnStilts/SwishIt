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
  while (unique.length > 4) {
    unique.splice(Math.floor(rand() * (unique.length - 1)) + 1, 1);
  }
  return unique.slice(0, 4);
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

  let rating = starterPower + benchBoost + chemistry;
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
