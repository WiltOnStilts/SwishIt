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
  const counting =
    p.ppg * 1.15 +
    p.rpg * 0.85 +
    p.apg * 1.05 +
    p.spg * 2.2 +
    p.bpg * 2.0 +
    p.mpg * 0.12;

  let bonus = 0;
  if (p.mvp) bonus += 18;
  if (p.dpoy) bonus += 10;
  if (p.allStar) bonus += 6;
  if (p.champion) bonus += 4;
  bonus += Math.min(8, p.accolades.length * 2);

  const availability = clamp(p.games / 82, 0.35, 1);
  return counting * availability + bonus;
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

const ALL_TIME_TEAMS = [
  "1996 Bulls",
  "2017 Warriors",
  "1986 Celtics",
  "2001 Lakers",
  "2014 Spurs",
  "1983 76ers",
  "2008 Celtics",
  "2012 Heat",
  "1999 Spurs",
  "2022 Warriors",
  "1989 Pistons",
  "2004 Pistons",
  "2011 Mavericks",
  "2023 Nuggets",
  "1987 Lakers",
  "2016 Cavaliers",
  "2000 Lakers",
  "1994 Rockets",
  "2019 Raptors",
  "2024 Celtics",
  "2006 Heat",
  "1992 Bulls",
  "2015 Warriors",
  "1985 Lakers",
  "2005 Spurs",
  "1997 Jazz",
  "2013 Heat",
  "2020 Lakers",
  "1993 Suns",
  "2009 Lakers",
  "2018 Rockets",
  "1991 Bulls",
  "2025 Thunder",
  "1988 Pistons",
  "2010 Lakers",
  "2002 Lakers",
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

function pickUniqueOpponents(rand: () => number, count: number): string[] {
  const pool = [...ALL_TIME_TEAMS];
  const out: string[] = [];
  while (out.length < count && pool.length) {
    const i = Math.floor(rand() * pool.length);
    out.push(pool.splice(i, 1)[0]!);
  }
  return out;
}

function seriesScore(won: boolean, rand: () => number): string {
  if (won) {
    const losses = Math.floor(rand() * 3); // 4-0, 4-1, 4-2
    return `4-${losses}`;
  }
  const wins = Math.floor(rand() * 3); // 0-4 .. 2-4
  return `${wins}-4`;
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
  const madePlayoffs = wins >= 40;
  if (!madePlayoffs) {
    return { madePlayoffs: false, playoffRounds: [], champion: false };
  }

  const rounds = [
    "First Round",
    "Conference Semifinals",
    "Conference Finals",
    "NBA Finals",
  ];

  // How deep can they go based on regular-season wins / rating
  let maxRoundIndex = 0;
  if (wins >= 48 || rating >= 48) maxRoundIndex = 1;
  if (wins >= 54 || rating >= 55) maxRoundIndex = 2;
  if (wins >= 58 || rating >= 62) maxRoundIndex = 3;
  if (wins >= 65 || rating >= 70) maxRoundIndex = 3;

  // Chance to win each series — drops as rounds get harder
  const winChance = [
    clamp(0.35 + (wins - 40) * 0.015 + (rating - 40) * 0.008, 0.28, 0.88),
    clamp(0.28 + (wins - 45) * 0.012 + (rating - 45) * 0.007, 0.22, 0.78),
    clamp(0.22 + (wins - 52) * 0.01 + (rating - 52) * 0.006, 0.16, 0.68),
    clamp(0.18 + (wins - 58) * 0.01 + (rating - 58) * 0.006, 0.12, 0.62),
  ];

  // Perfect / near-perfect seasons punch above
  if (wins >= 72) {
    for (let i = 0; i < winChance.length; i++) winChance[i] = Math.min(0.92, winChance[i]! + 0.12);
    maxRoundIndex = 3;
  }
  if (wins === 82) {
    return {
      madePlayoffs: true,
      playoffRounds: pickUniqueOpponents(rand, 4).map((opponent, i) => ({
        round: rounds[i]!,
        opponent,
        won: true,
        series: seriesScore(true, rand),
      })),
      champion: true,
    };
  }

  const opponents = pickUniqueOpponents(rand, 4);
  const playoffRounds: PlayoffRoundResult[] = [];
  let champion = false;

  for (let i = 0; i <= maxRoundIndex; i++) {
    const won = rand() < winChance[i]!;
    playoffRounds.push({
      round: rounds[i]!,
      opponent: opponents[i]!,
      won,
      series: seriesScore(won, rand),
    });
    if (!won) break;
    if (i === 3) champion = true;
  }

  // Contenders who cleared maxRoundIndex check might still get upset earlier — already handled.
  // Give elite records a second chance only if they somehow got no rounds (shouldn't happen).
  if (playoffRounds.length === 0) {
    playoffRounds.push({
      round: "First Round",
      opponent: opponents[0]!,
      won: false,
      series: seriesScore(false, rand),
    });
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
      `${names} carried MVP-level gravity from their selected season(s), lifting the ceiling in big spots.`,
    );
  } else if (ace && ace.ppg >= 27) {
    stories.push(
      `${ace.playerName}'s ${ace.year} scoring (${ace.ppg.toFixed(1)} PPG) was the offense's cheat code — until trap-heavy all-time defenses forced someone else to beat them.`,
    );
  }

  const teamYears = new Set(lineup.map((p) => `${p.year}-${p.teamAbbr}`));
  if (teamYears.size === 1) {
    const p0 = lineup[0]!;
    stories.push(
      `Keeping the ${p0.year} ${p0.teamAbbr} core intact paid off — timing and habits from a real season showed up in January and again in April.`,
    );
  } else if (teamYears.size >= 4) {
    stories.push(
      `Four different team-seasons in the starting five meant talent without shorthand — a few baffling losses to lesser all-time names followed.`,
    );
  }

  if (weak && playerPower(weak) < 32 && ace && playerPower(ace) >= 50) {
    stories.push(
      `${weak.playerName}'s ${weak.year} line was the soft spot. All-time teams hunted that matchup.`,
    );
  }

  if (wins >= 65) {
    stories.push(
      `${wins}-${losses} put them in historic company. Bad losses were rare.`,
    );
  } else if (wins >= 50) {
    stories.push(
      `A ${wins}-${losses} campaign made them a clear playoff problem on any given night.`,
    );
  } else if (wins >= 40) {
    stories.push(
      `${wins}-${losses} was a bubble/playoff-edge grind — flashes of dominance, then cold stretches.`,
    );
  } else {
    stories.push(
      `${wins}-${losses} was a grind. The selected season forms didn't hold up over 82 against all-time competition.`,
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
  const chemistry =
    new Set(lineup.map((p) => `${p.year}-${p.teamAbbr}`)).size === 1 ? 4 : -2;

  let rating = starterPower + benchBoost + chemistry;
  const top = Math.max(...powers);
  const depth =
    [...powers].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  rating = rating * 0.55 + top * 0.25 + depth * 0.2;

  const seed = hashSeed(roster.map((p) => p.id).join("|"));
  const rand = mulberry32(seed);

  let expectedWins = clamp(
    22 + (rating - 28) * 1.05 + (rand() - 0.5) * 6,
    18,
    78,
  );
  // Tiny chance at historic perfection for absurdly stacked squads
  if (rating >= 78 && rand() > 0.92) expectedWins = 82;
  else if (rating >= 72 && rand() > 0.97) expectedWins = 82;

  const wins = Math.round(expectedWins);
  const losses = 82 - wins;

  const storylines = buildStorylines(lineup, sixthMan, wins, losses, rand);
  const playoffs = simulatePlayoffs(wins, rating, rand);

  let seedHint = "Lottery";
  if (wins >= 60) seedHint = "1–2 seed territory";
  else if (wins >= 53) seedHint = "Top-4 seed";
  else if (wins >= 45) seedHint = "Mid playoff seed";
  else if (wins >= 40) seedHint = "Play-in / low seed";
  else if (wins >= 38) seedHint = "Play-in band";

  let comparison = "Fringe contender";
  if (playoffs.champion) comparison = "Champions";
  else if (wins >= 65) comparison = "Historically great — Dynasty conversation";
  else if (wins >= 58) comparison = "Conference finals ceiling";
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
