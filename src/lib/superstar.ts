import type { LineupPlayer } from "@/lib/season";

export const SUPERSTAR_RESULT_KEY = "swishit-superstar-result";

export const ATTRIBUTES = [
  "scoring",
  "defense",
  "handles",
  "playmaking",
  "body",
  "iq",
  "rebounding",
] as const;

export type AttributeKey = (typeof ATTRIBUTES)[number];

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  scoring: "Scoring",
  defense: "Defense",
  handles: "Handles",
  playmaking: "Playmaking",
  body: "Body",
  iq: "IQ",
  rebounding: "Rebounding",
};

export type AttributePick = {
  attribute: AttributeKey;
  player: LineupPlayer;
  score: number;
};

export type SuperstarCareer = {
  overall: number;
  grade: string;
  peak: string;
  yearsPlayed: number;
  position: string;
  attributes: { key: AttributeKey; label: string; score: number; from: string }[];
  awards: {
    mvps: number;
    dpoys: number;
    finalsMvps: number;
    scoringTitles: number;
    reboundTitles: number;
    assistTitles: number;
    allStars: number;
    allNba: number;
    allDefense: number;
    championships: number;
    rookiesOfYear: boolean;
  };
  hallOfFame: boolean;
  allTimeRank: number;
  /** e.g. "Behind Michael Jordan, ahead of LeBron James." */
  rankContext: string;
  legacyLine: string;
  backstory: string;
  careerAverages: {
    ppg: number;
    rpg: number;
    apg: number;
    spg: number;
    bpg: number;
  };
  peakAverages: {
    ppg: number;
    rpg: number;
    apg: number;
    spg: number;
    bpg: number;
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

/** Map a raw stat onto a grade band with a soft ceiling (avoids everyone at 99). */
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
 * Score one attribute from a source season.
 * 2K-style bands with counting-stat floors so production never grades as "unfinished":
 *   elite 90–96 · all-NBA 84–91 · solid starter 72–83 · rotation 58–71 · bench 42–57
 */
export function scoreAttribute(attr: AttributeKey, p: LineupPlayer): number {
  const isC = p.positions.includes("C");
  const isPF = p.positions.includes("PF");
  const isSF = p.positions.includes("SF");
  const big = isC || isPF;
  const guard = p.positions.includes("PG") || p.positions.includes("SG");
  const wing = isSF || p.positions.includes("SG");
  const pts36 = per36(p.ppg, p.mpg);
  const reb36 = per36(p.rpg, p.mpg);
  const ast36 = per36(p.apg, p.mpg);
  const stl36 = per36(p.spg, p.mpg);
  const blk36 = per36(p.bpg, p.mpg);
  const fg = p.fgPct != null && p.fgPct > 0 ? p.fgPct : null;
  const stocks = p.spg + p.bpg;
  const stocks36 = stl36 + blk36;

  let raw: number;

  switch (attr) {
    case "scoring": {
      // PPG-led scoring with shotmaking + finishing folded in.
      const volume =
        curve(p.ppg, 15, 0.28, 48, 95) * 0.7 +
        curve(pts36, 16, 0.26, 48, 95) * 0.3;
      let shoot: number;
      if (fg != null) {
        shoot =
          curve(pts36, 15.5, 0.24, 50, 93) * 0.4 +
          curve(fg * 100, 46, 0.2, 50, 94) * 0.6;
      } else {
        shoot = curve(pts36, 15.5, 0.24, 50, 93) + (guard || wing ? 3 : 1);
      }
      let finish = curve(pts36, 15.5, 0.24, 50, 93);
      if (fg != null) {
        finish = finish * 0.4 + curve(fg * 100, 49, 0.22, 50, 95) * 0.6;
      } else if (big) {
        finish += 5;
      }
      if (big) finish += 2;
      if (wing && p.ppg >= 18) finish += 2;

      raw = volume * 0.55 + shoot * 0.22 + finish * 0.23;
      if (p.ppg >= 18) raw += 2;
      if (p.ppg >= 20) raw += 2;
      if (p.ppg >= 22) raw += 2;
      if (p.ppg >= 25) raw += 2.5;
      if (p.ppg >= 28) raw += 2.5;
      if (p.ppg >= 32) raw += 2;
      if (p.mvp) raw += 2;
      if (p.allStar) raw += 1.5;
      if (p.accolades.some((a) => /scoring|points/i.test(a))) raw += 2.5;
      // Production floors — 20/24/28 PPG never look unfinished.
      if (p.ppg >= 18) raw = Math.max(raw, 76);
      if (p.ppg >= 20) raw = Math.max(raw, 80);
      if (p.ppg >= 22) raw = Math.max(raw, 84);
      if (p.ppg >= 24) raw = Math.max(raw, 86);
      if (p.ppg >= 26) raw = Math.max(raw, 88);
      if (p.ppg >= 28) raw = Math.max(raw, 90);
      if (p.ppg >= 30) raw = Math.max(raw, 92);
      if (p.ppg >= 33) raw = Math.max(raw, 94);
      break;
    }
    case "defense": {
      const stockScore = curve(stocks36, 1.8, 0.72, 50, 93);
      const counting = curve(stocks, 1.8, 0.78, 50, 92);
      raw = stockScore * 0.6 + counting * 0.4;
      if (big) raw += 2.5;
      if (p.bpg >= 1.5) raw += 2;
      if (p.bpg >= 2.5) raw += 3;
      if (p.bpg >= 3.5) raw += 2;
      if (p.spg >= 1.5) raw += 2;
      if (p.spg >= 2.2) raw += 2.5;
      if (p.dpoy) raw += 10;
      if (p.accolades.some((a) => /def/i.test(a))) raw += 4;
      if (p.allStar && stocks >= 1.8) raw += 2;
      if (stocks >= 2.5) raw = Math.max(raw, 82);
      if (stocks >= 3.2) raw = Math.max(raw, 86);
      if (p.dpoy) raw = Math.max(raw, 92);
      if (p.accolades.some((a) => /def1|all-defense 1/i.test(a))) {
        raw = Math.max(raw, 88);
      }
      break;
    }
    case "handles": {
      const creation = pts36 * 0.7 + ast36 * 0.5;
      raw = curve(creation, 14.5, 0.28, 48, 94);
      if (guard) {
        const scoreCreate = curve(pts36, 16.5, 0.28, 50, 95);
        const passCreate = curve(ast36, 6.2, 0.4, 52, 93);
        // Steady starting-guard security (Fisher). Low-minute backups stay modest.
        const steady =
          p.mpg >= 22
            ? curve(p.mpg, 28, 0.14, 55, 84) * 0.45 +
              curve(ast36 + pts36 * 0.35, 8.5, 0.26, 55, 84) * 0.55
            : curve(p.mpg, 20, 0.2, 48, 70);
        raw = Math.max(raw * 0.4 + scoreCreate * 0.6, passCreate * (p.mpg >= 20 ? 1 : 0.85), steady);
        if (p.ppg >= 18) raw += 2.5;
        if (p.ppg >= 22) raw += 3.5;
        if (p.ppg >= 26) raw += 3;
        if (p.ppg >= 30) raw += 2;
        if (p.mpg >= 20 && p.apg >= 3) raw += 1.5;
        if (p.mpg >= 22 && p.apg >= 4) raw += 1.5;
        if (p.apg >= 6) raw += 2;
        if (p.apg >= 8) raw += 2;
        if (pts36 >= 18 && ast36 >= 3.5 && ast36 < 9) raw += 3;
        if (pts36 >= 22 && ast36 >= 4 && ast36 < 8) raw += 2.5;
        if (p.allStar) raw += 1.5;
        if (p.champion && p.mpg >= 18) raw += 2.5;
        // Solid rotation / starting guards aren't mid-60s handlers.
        if (p.mpg >= 22 && p.apg >= 2.5) raw = Math.max(raw, 74);
        if (p.mpg >= 25 && p.apg >= 2.8) raw = Math.max(raw, 78);
        if (p.mpg >= 27 && (p.apg >= 3 || p.ppg >= 9)) raw = Math.max(raw, 80);
        if (p.mpg >= 30 && p.apg >= 3.5) raw = Math.max(raw, 82);
        if (p.champion && p.mpg >= 22) raw = Math.max(raw, 80);
        if (p.ppg >= 20) raw = Math.max(raw, 84);
        if (p.ppg >= 22) raw = Math.max(raw, 86);
        if (p.ppg >= 25) raw = Math.max(raw, 90);
      } else if (wing) {
        raw = raw * 0.55 + curve(pts36, 16.5, 0.24, 48, 92) * 0.45;
        if (p.ppg >= 20) raw += 2.5;
        if (p.ppg >= 24) raw += 3;
        if (p.apg >= 5) raw += 2.5;
        if (p.apg >= 7) raw += 2;
        if (p.champion) raw += 1.5;
        if (p.ppg >= 22 && p.apg >= 4) raw = Math.max(raw, 82);
      } else {
        raw = curve(ast36 * 1.2 + pts36 * 0.28, 7.2, 0.35, 46, 88);
        if (p.apg >= 4) raw += 3.5;
        if (p.apg >= 5.5) raw += 3.5;
        if (p.apg >= 7) raw += 3;
        if (p.ppg >= 20 && p.apg >= 4) raw += 2.5;
        if (p.apg >= 5) raw = Math.max(raw, 78);
      }
      if (p.apg >= 9) raw = Math.max(raw, 84);
      break;
    }
    case "playmaking": {
      raw =
        curve(p.apg, 4.5, 0.44, 48, 95) * 0.55 +
        curve(ast36, 5.0, 0.42, 48, 95) * 0.45;
      if (guard) raw += 2.5;
      if (p.apg >= 5) raw += 2;
      if (p.apg >= 6.5) raw += 2;
      if (p.apg >= 8) raw += 2.5;
      if (p.apg >= 10) raw += 2.5;
      if (p.apg >= 12) raw += 2;
      if (p.allStar) raw += 1.5;
      if (p.mvp) raw += 1.5;
      if (p.accolades.some((a) => /assist/i.test(a))) raw += 3.5;
      if (big && p.apg >= 4) raw += 2.5;
      if (big && p.apg >= 5) raw += 2.5;
      if (p.apg >= 6) raw = Math.max(raw, 78);
      if (p.apg >= 7) raw = Math.max(raw, 82);
      if (p.apg >= 8) raw = Math.max(raw, 86);
      if (p.apg >= 9) raw = Math.max(raw, 88);
      if (p.apg >= 10.5) raw = Math.max(raw, 91);
      if (p.apg >= 12) raw = Math.max(raw, 94);
      break;
    }
    case "body": {
      const athleticism =
        stl36 * 1.1 +
        blk36 * 1.0 +
        pts36 * 0.12 +
        reb36 * 0.15 +
        (p.mpg >= 34 ? 1.5 : 0) +
        (p.mpg >= 38 ? 1 : 0);
      const frameBase = isC ? 82 : isPF ? 78 : isSF ? 68 : guard ? 62 : 64;
      const frame =
        frameBase +
        clamp(reb36 - 4, -5, 12) * 1.1 +
        (p.ppg >= 22 ? 3 : p.ppg >= 18 ? 1.5 : 0);
      raw =
        curve(athleticism, 2.5, 0.55, 52, 94) * 0.38 +
        curve(frame, 70, 0.12, 54, 94) * 0.42 +
        curve(p.mpg, 29, 0.14, 52, 90) * 0.2;
      if (p.mvp) raw += 2;
      if (big && reb36 >= 9) raw += 2;
      if (p.ppg >= 25) raw += 2;
      if (p.allStar) raw += 1.5;
      if (p.mpg >= 32) raw = Math.max(raw, 72);
      if (p.mpg >= 34 && p.allStar) raw = Math.max(raw, 76);
      if (p.mpg >= 36 && (p.ppg >= 18 || big)) raw = Math.max(raw, 78);
      break;
    }
    case "iq": {
      const feel = ast36 + reb36 * 0.35 + pts36 * 0.08 + (guard ? 1.2 : 0);
      raw = curve(feel, 6.2, 0.28, 52, 93);
      if (p.mvp) raw += 5;
      if (p.allStar) raw += 2.5;
      if (p.apg >= 5) raw += 2;
      if (p.apg >= 7) raw += 2.5;
      if (p.champion) raw += 1.5;
      raw += Math.min(4, (p.accolades?.length ?? 0) * 1);
      if (guard) raw += 1.5;
      if (big && p.apg >= 4) raw += 2.5;
      if (p.mvp) raw = Math.max(raw, 86);
      if (p.apg >= 8) raw = Math.max(raw, 82);
      if (p.apg >= 10) raw = Math.max(raw, 88);
      break;
    }
    case "rebounding": {
      // Absolute boards + rate. Elite forwards like Webber live in the high 80s / low 90s.
      const byRpg = curve(p.rpg, 7.4, 0.42, 48, 94);
      const byRate = curve(reb36, 7.0, 0.4, 48, 94);
      raw = byRpg * 0.65 + byRate * 0.35;
      if (isC) raw += 3;
      else if (isPF) raw += 2.5;
      else if (isSF) raw += 1;
      if (p.rpg >= 8) raw += 2;
      if (p.rpg >= 9) raw += 2.5;
      if (p.rpg >= 9.5) raw += 2;
      if (p.rpg >= 10.5) raw += 2.5;
      if (p.rpg >= 12) raw += 2;
      if (p.rpg >= 14) raw += 2;
      if (p.rpg >= 16) raw += 1.5;
      if (p.accolades.some((a) => /rebound/i.test(a))) raw += 3;
      raw = Math.max(raw, isC ? 72 : isPF ? 70 : isSF ? 52 : 44);
      if (big && p.rpg >= 8) raw = Math.max(raw, 80);
      if (big && p.rpg >= 8.5) raw = Math.max(raw, 84);
      if (big && p.rpg >= 9) raw = Math.max(raw, 86);
      if (big && p.rpg >= 9.5) raw = Math.max(raw, 88);
      if (p.rpg >= 10) raw = Math.max(raw, 89);
      if (p.rpg >= 10.5) raw = Math.max(raw, 91);
      if (p.rpg >= 11.5) raw = Math.max(raw, 93);
      if (p.rpg >= 13) raw = Math.max(raw, 95);
      break;
    }
  }

  return Math.round(clamp(raw, 42, 96));
}

function gradeFromOverall(overall: number): string {
  if (overall >= 97) return "S";
  if (overall >= 93) return "A+";
  if (overall >= 89) return "A";
  if (overall >= 85) return "A-";
  if (overall >= 81) return "B+";
  if (overall >= 77) return "B";
  if (overall >= 73) return "B-";
  if (overall >= 68) return "C+";
  if (overall >= 62) return "C";
  if (overall >= 55) return "C-";
  if (overall >= 48) return "D";
  return "F";
}

const GRADE_ORDER = [
  "F",
  "D",
  "C-",
  "C",
  "C+",
  "B-",
  "B",
  "B+",
  "A-",
  "A",
  "A+",
  "S",
] as const;

function atLeastGrade(grade: string, floor: string): string {
  const gi = GRADE_ORDER.indexOf(grade as (typeof GRADE_ORDER)[number]);
  const fi = GRADE_ORDER.indexOf(floor as (typeof GRADE_ORDER)[number]);
  if (gi < 0) return floor;
  if (fi < 0) return grade;
  return gi < fi ? floor : grade;
}

/** Career résumé can outpace raw attribute overall — rank must drive the letter. */
function gradeFromCareer(overall: number, rank: number): string {
  let grade = gradeFromOverall(overall);
  if (rank === 1) grade = atLeastGrade(grade, "A+");
  else if (rank <= 5) grade = atLeastGrade(grade, "A+");
  else if (rank <= 15) grade = atLeastGrade(grade, "A");
  else if (rank <= 30) grade = atLeastGrade(grade, "A-");
  else if (rank <= 50) grade = atLeastGrade(grade, "B+");
  else if (rank <= 75) grade = atLeastGrade(grade, "B");
  else if (rank <= 100) grade = atLeastGrade(grade, "B-");
  else if (rank <= 150) grade = atLeastGrade(grade, "C+");
  // #1 with truly absurd overall can still earn S
  if (rank === 1 && overall >= 96) grade = "S";
  return grade;
}

/**
 * Consensus-style all-time ladder for "behind / ahead of" flavor text.
 * Custom superstar inserts at `rank`; neighbors are real players one spot
 * better and one spot worse on this fixed list (Jordan stays near #1, etc.).
 */
const NBA_ALL_TIME: string[] = [
  "Michael Jordan",
  "LeBron James",
  "Kareem Abdul-Jabbar",
  "Magic Johnson",
  "Bill Russell",
  "Wilt Chamberlain",
  "Larry Bird",
  "Tim Duncan",
  "Shaquille O'Neal",
  "Kobe Bryant",
  "Hakeem Olajuwon",
  "Stephen Curry",
  "Kevin Durant",
  "Julius Erving",
  "Oscar Robertson",
  "Jerry West",
  "Moses Malone",
  "Karl Malone",
  "Dirk Nowitzki",
  "Giannis Antetokounmpo",
  "Nikola Jokic",
  "Kevin Garnett",
  "Charles Barkley",
  "David Robinson",
  "John Stockton",
  "Isiah Thomas",
  "Dwyane Wade",
  "Scottie Pippen",
  "Chris Paul",
  "Steve Nash",
  "Allen Iverson",
  "Clyde Drexler",
  "Patrick Ewing",
  "John Havlicek",
  "Elgin Baylor",
  "Bob Pettit",
  "Rick Barry",
  "George Gervin",
  "Dominique Wilkins",
  "Jason Kidd",
  "Gary Payton",
  "Russell Westbrook",
  "James Harden",
  "Kawhi Leonard",
  "Anthony Davis",
  "Paul Pierce",
  "Ray Allen",
  "Reggie Miller",
  "Kevin McHale",
  "James Worthy",
  "Tony Parker",
  "Manu Ginobili",
  "Vince Carter",
  "Tracy McGrady",
  "Carmelo Anthony",
  "Dwight Howard",
  "Chris Webber",
  "Pau Gasol",
  "Yao Ming",
  "Alonzo Mourning",
  "Dikembe Mutombo",
  "Ben Wallace",
  "Dennis Rodman",
  "Robert Parish",
  "Dave Cowens",
  "Bill Walton",
  "Wes Unseld",
  "Willis Reed",
  "Walt Frazier",
  "Earl Monroe",
  "Nate Archibald",
  "Pete Maravich",
  "George Mikan",
  "Bob Cousy",
  "Sam Jones",
  "Dolph Schayes",
  "Elvin Hayes",
  "Bob McAdoo",
  "Adrian Dantley",
  "Alex English",
  "Bernard King",
  "Joe Dumars",
  "Sidney Moncrief",
  "Dennis Johnson",
  "Chauncey Billups",
  "Grant Hill",
  "Penny Hardaway",
  "Chris Bosh",
  "Amar'e Stoudemire",
  "Blake Griffin",
  "Luka Doncic",
  "Jayson Tatum",
  "Joel Embiid",
  "Damian Lillard",
  "Kyrie Irving",
  "Jimmy Butler",
  "Draymond Green",
  "Klay Thompson",
  "Paul George",
  "Devin Booker",
  "Shai Gilgeous-Alexander",
  "Ja Morant",
  "Victor Wembanyama",
  "David Thompson",
  "Connie Hawkins",
  "Artis Gilmore",
  "Bob Lanier",
  "Nate Thurmond",
  "Dave DeBusschere",
  "Billy Cunningham",
  "Hal Greer",
  "Lenny Wilkens",
  "Dave Bing",
  "Maurice Cheeks",
  "Mark Price",
  "Tim Hardaway",
  "Kevin Johnson",
  "Deron Williams",
  "Rajon Rondo",
  "Kyle Lowry",
  "Jrue Holiday",
  "Andre Iguodala",
  "Shawn Marion",
  "Andrei Kirilenko",
  "Detlef Schrempf",
  "Toni Kukoc",
  "Peja Stojakovic",
  "LaMarcus Aldridge",
  "Kevin Love",
  "Al Horford",
  "Marc Gasol",
  "Rudy Gobert",
  "Bam Adebayo",
  "Karl-Anthony Towns",
  "Anthony Edwards",
  "Zion Williamson",
  "Cade Cunningham",
  "Metta World Peace",
  "Rasheed Wallace",
  "Shawn Kemp",
  "Mitch Richmond",
  "Glen Rice",
  "Chris Mullin",
];

function buildRankContext(rank: number): string {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const name of NBA_ALL_TIME) {
    if (seen.has(name)) continue;
    seen.add(name);
    list.push(name);
  }

  if (rank < 1) return "";
  if (rank > list.length) {
    return `Outside the canonical top ${list.length} — still chasing that tier.`;
  }

  const behind = rank > 1 ? list[rank - 2]! : null;
  const ahead = list[rank - 1]!;

  if (!behind) return `Unmatched — in front of ${ahead}.`;
  return `Behind ${behind}, in front of ${ahead}.`;
}

/**
 * Map résumé + peak onto a real all-time ladder.
 * #1–5 is Jordan/LeBron/Kareem/Magic/Russell territory — not a 1-MVP season.
 */
function rankAllTime(args: {
  overall: number;
  mvps: number;
  dpoys: number;
  finalsMvps: number;
  championships: number;
  allStars: number;
  allNba: number;
  scoringTitles: number;
  reboundTitles: number;
  assistTitles: number;
  yearsPlayed: number;
  peakPpg: number;
  peakRpg: number;
  peakApg: number;
  careerPpg: number;
  careerRpg: number;
  careerApg: number;
  rand: () => number;
}): number {
  const {
    overall,
    mvps,
    dpoys,
    finalsMvps,
    championships,
    allStars,
    allNba,
    scoringTitles,
    reboundTitles,
    assistTitles,
    yearsPlayed,
    peakPpg,
    peakRpg,
    peakApg,
    careerPpg,
    careerRpg,
    careerApg,
    rand,
  } = args;

  const peakLoad = peakPpg + peakRpg * 0.55 + peakApg * 0.65;
  const careerLoad = careerPpg + careerRpg * 0.55 + careerApg * 0.65;

  let rank =
    175 -
    overall * 0.4 -
    mvps * 16 -
    finalsMvps * 7 -
    championships * 6 -
    dpoys * 7 -
    allNba * 2.8 -
    allStars * 1.3 -
    scoringTitles * 2.4 -
    reboundTitles * 2 -
    assistTitles * 2 -
    Math.max(0, peakPpg - 18) * 1.5 -
    Math.max(0, peakRpg - 7) * 1.35 -
    Math.max(0, peakApg - 5) * 1.25 -
    Math.max(0, careerPpg - 15) * 1.1 -
    Math.max(0, careerLoad - 24) * 0.8 -
    Math.max(0, peakLoad - 30) * 0.65 -
    Math.max(0, yearsPlayed - 10) * 0.45;

  rank += (rand() - 0.5) * 8;
  rank = Math.round(rank);

  // Hard floors: hardware + peak have to actually belong on that rung.
  const elitePeak = peakPpg >= 29 && peakLoad >= 40;
  const greatPeak = peakPpg >= 27 || peakLoad >= 38;

  if (!(mvps >= 5 && championships >= 5 && finalsMvps >= 4 && elitePeak)) {
    rank = Math.max(rank, 2);
  }
  if (!(mvps >= 4 && championships >= 4 && (elitePeak || peakPpg >= 27))) {
    rank = Math.max(rank, 4);
  }
  if (mvps < 3) rank = Math.max(rank, 7);
  if (mvps < 3 && championships < 4) rank = Math.max(rank, 11);
  if (mvps < 2) rank = Math.max(rank, 15);
  if (mvps < 2 && championships < 3) rank = Math.max(rank, 17);

  if (mvps <= 1) {
    if (!elitePeak || championships < 3) rank = Math.max(rank, 19);
    if (!greatPeak) rank = Math.max(rank, 22);
    if (peakPpg < 26) rank = Math.max(rank, 26);
    if (peakLoad < 32) rank = Math.max(rank, 32);
  }

  if (mvps === 0) {
    if (finalsMvps >= 2 && championships >= 2) rank = Math.max(rank, 28);
    else if (championships >= 3) rank = Math.max(rank, 32);
    else rank = Math.max(rank, 45);
  }

  if (allNba < 3 && mvps < 2) rank = Math.max(rank, 42);
  if (allStars < 5 && mvps < 2) rank = Math.max(rank, 38);

  return clamp(rank, 1, 500);
}

function peakLabel(overall: number): string {
  if (overall >= 94) return "Generational peak";
  if (overall >= 88) return "MVP-caliber peak";
  if (overall >= 80) return "All-NBA peak";
  if (overall >= 72) return "All-Star peak";
  if (overall >= 64) return "Solid starter peak";
  if (overall >= 55) return "Role-player peak";
  return "Fringe / cup-of-coffee peak";
}

function inferPosition(picks: AttributePick[]): string {
  const votes: Record<string, number> = {
    PG: 0,
    SG: 0,
    SF: 0,
    PF: 0,
    C: 0,
  };
  for (const pick of picks) {
    const weight =
      pick.attribute === "handles" ||
      pick.attribute === "iq" ||
      pick.attribute === "playmaking"
        ? 1.4
        : pick.attribute === "rebounding"
          ? 1.3
          : pick.attribute === "scoring"
            ? 1.15
            : pick.attribute === "body"
              ? 1.1
              : 1;
    for (const pos of pick.player.positions) {
      votes[pos] = (votes[pos] ?? 0) + weight;
    }
  }
  return (
    Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "SF"
  );
}

function countAwards(
  score: number,
  rand: () => number,
  softCap: number,
  threshold: number,
): number {
  if (score < threshold) return 0;
  const expected =
    ((score - threshold) / (100 - threshold)) * softCap * (0.75 + rand() * 0.5);
  let n = Math.floor(expected);
  if (rand() < expected - n) n += 1;
  return clamp(n, 0, softCap);
}

function buildBackstory(
  grade: string,
  awards: SuperstarCareer["awards"],
  hof: boolean,
  picks: AttributePick[],
  position: string,
): string {
  const n = (key: AttributeKey) =>
    picks.find((p) => p.attribute === key)!.player.playerName;

  const note = hof
    ? "Made the Hall of Fame."
    : awards.allNba >= 3
      ? `Earned ${awards.allNba} All-NBA nods.`
      : awards.allStars >= 1
        ? `Made ${awards.allStars} All-Star team${awards.allStars === 1 ? "" : "s"}.`
        : "Solid pro career.";

  return `${position}. Scoring from ${n("scoring")}. Defense from ${n("defense")}. Handles from ${n("handles")}. Playmaking from ${n("playmaking")}. Body from ${n("body")}. IQ from ${n("iq")}. Rebounding from ${n("rebounding")}. Grade ${grade}. ${note}`;
}

export function simulateSuperstarCareer(
  picks: AttributePick[],
): SuperstarCareer {
  if (picks.length !== ATTRIBUTES.length) {
    throw new Error(`Need all ${ATTRIBUTES.length} attributes filled.`);
  }

  const seed = hashSeed(
    picks
      .map((p) => `${p.attribute}:${p.player.id}:${p.score}`)
      .sort()
      .join("|"),
  );
  const rand = mulberry32(seed);

  const attrs = ATTRIBUTES.map((key) => {
    const pick = picks.find((p) => p.attribute === key)!;
    return {
      key,
      label: ATTRIBUTE_LABELS[key],
      score: Math.round(pick.score),
      from: pick.player.playerName,
    };
  });

  const byKey = Object.fromEntries(attrs.map((a) => [a.key, a.score])) as Record<
    AttributeKey,
    number
  >;

  const overall = clamp(
    Math.round(
      byKey.scoring * 0.22 +
        byKey.defense * 0.16 +
        byKey.playmaking * 0.14 +
        byKey.handles * 0.12 +
        byKey.iq * 0.12 +
        byKey.rebounding * 0.12 +
        byKey.body * 0.12,
    ),
    35,
    99,
  );

  const offense = (byKey.scoring + byKey.handles + byKey.playmaking) / 3;
  const defense = byKey.defense;
  const glass = byKey.rebounding;
  const durability = byKey.body;

  // Career length from body grade + donor availability (injury-prone seasons → shorter careers).
  const bodyPick = picks.find((p) => p.attribute === "body")!;
  const gamesRate = clamp(bodyPick.player.games / 82, 0.3, 1);
  const injuryDrag =
    gamesRate < 0.72 ? (0.72 - gamesRate) * 16 : 0;
  let yearsPlayed = Math.round(
    8.5 +
      durability / 14 +
      overall / 40 +
      (rand() - 0.4) * 5 -
      injuryDrag,
  );
  yearsPlayed = clamp(yearsPlayed, 6, 20);
  if (gamesRate < 0.5) yearsPlayed = Math.min(yearsPlayed, 11);
  else if (gamesRate < 0.6) yearsPlayed = Math.min(yearsPlayed, 13);
  else if (gamesRate < 0.7) yearsPlayed = Math.min(yearsPlayed, 15);
  if (durability < 70) yearsPlayed = Math.min(yearsPlayed, 12);
  else if (durability < 78) yearsPlayed = Math.min(yearsPlayed, 14);
  else if (durability < 85) yearsPlayed = Math.min(yearsPlayed, 16);
  else if (durability < 90) yearsPlayed = Math.min(yearsPlayed, 18);
  // 19–20 only for truly durable ironmen.
  if (durability < 92 || gamesRate < 0.88) {
    yearsPlayed = Math.min(yearsPlayed, 18);
  }

  const position = inferPosition(picks);
  const pos = position;
  const isGuard = pos === "PG" || pos === "SG";
  const isWing = pos === "SF" || pos === "SG";
  const isBig = pos === "PF" || pos === "C";

  const lengthDrag = clamp(1 - (yearsPlayed - 7) * 0.02, 0.7, 0.93);
  const ageWell = 0.9 + (byKey.body / 100) * 0.1;
  const careerFactor = lengthDrag * ageWell;

  const rebPos =
    pos === "C" ? 1.02 : pos === "PF" ? 0.92 : pos === "SF" ? 0.72 : pos === "SG" ? 0.52 : 0.45;
  const astPos =
    pos === "PG" ? 1.05 : pos === "SG" ? 0.85 : pos === "SF" ? 0.7 : pos === "PF" ? 0.55 : 0.45;
  const blkPos =
    pos === "C" ? 1.05 : pos === "PF" ? 0.85 : pos === "SF" ? 0.55 : 0.35;
  const stlPos = isGuard || isWing ? 1.05 : 0.75;
  const ptsPos = isBig ? 0.92 : 1;

  // Tentative averages first — awards must match production. Peak ignores career drag.
  const overallTier = clamp(overall / 100, 0.5, 1);
  let ppg = curve(byKey.scoring, 74, 0.085, 8, 26) * ptsPos;
  let rpg = curve(byKey.rebounding, 74, 0.08, 2.2, 12.5) * rebPos;
  let apg = curve((byKey.playmaking + byKey.handles) / 2, 74, 0.085, 1.5, 10.5) * astPos;
  let spg = curve(byKey.defense, 72, 0.08, 0.4, 2.2) * stlPos;
  let bpg = curve((byKey.defense * 0.45 + byKey.rebounding * 0.25 + byKey.body * 0.3), 72, 0.08, 0.15, 2.6) * blkPos;

  let peakPpg = ppg * (1.12 + overallTier * 0.08);
  let peakRpg = rpg * (1.1 + overallTier * 0.06);
  let peakApg = apg * (1.1 + overallTier * 0.06);
  let peakSpg = spg * (1.08 + overallTier * 0.05);
  let peakBpg = bpg * (1.08 + overallTier * 0.05);

  ppg *= careerFactor;
  rpg *= careerFactor;
  apg *= careerFactor;
  spg *= careerFactor * 0.96;
  bpg *= careerFactor * 0.94;

  ppg *= 0.88 + overallTier * 0.14;
  rpg *= 0.9 + overallTier * 0.1;
  apg *= 0.9 + overallTier * 0.1;
  peakPpg *= 0.92 + overallTier * 0.12;
  peakRpg *= 0.93 + overallTier * 0.1;
  peakApg *= 0.93 + overallTier * 0.1;

  if (isGuard) {
    rpg = Math.min(rpg, 6.8);
    bpg = Math.min(bpg, 0.9);
    peakRpg = Math.min(peakRpg, 7.4);
    peakBpg = Math.min(peakBpg, 1.05);
  } else if (pos === "SF") {
    rpg = Math.min(rpg, 8.8);
    bpg = Math.min(bpg, 1.6);
    peakRpg = Math.min(peakRpg, 9.6);
    peakBpg = Math.min(peakBpg, 1.85);
  }
  if (isBig) {
    apg = Math.min(apg, 5.5);
    spg = Math.min(spg, 1.6);
    peakApg = Math.min(peakApg, 6.4);
    peakSpg = Math.min(peakSpg, 1.85);
  }

  const production = ppg * 1.2 + rpg * 0.95 + apg * 0.95;
  // MVP is rare — driven by scoring/overall, soft-capped well below "everyone gets 6".
  // Use attribute star-power (raw overall is diluted by reb/body and rank-bumped later).
  const mvpTier = clamp(
    Math.round(
      byKey.scoring * 0.4 + overall * 0.35 + offense * 0.25,
    ),
    0,
    99,
  );
  const mvpSignal = clamp(
    mvpTier * 0.7 + byKey.iq * 0.15 + byKey.scoring * 0.15,
    0,
    100,
  );

  let mvps = countAwards(mvpSignal, rand, 3, 83);
  // Mild floors — rand so similar builds don't all clone the same trophy case.
  if (mvpTier >= 95 && rand() > 0.3) mvps = Math.max(mvps, 2);
  else if (mvpTier >= 91 && rand() > 0.4) mvps = Math.max(mvps, 1);
  else if (mvpTier >= 87 && rand() > 0.55) mvps = Math.max(mvps, 1);
  // Occasional 4th for generational runs only.
  if (mvpTier >= 96 && mvps >= 3 && rand() > 0.65) mvps = 4;
  // Hard caps by tier so "good" builds don't all look like Russell/Kareem.
  if (mvpTier < 84) mvps = 0;
  else if (mvpTier < 88) mvps = Math.min(mvps, 1);
  else if (mvpTier < 92) mvps = Math.min(mvps, 2);
  else if (mvpTier < 96) mvps = Math.min(mvps, 3);
  else mvps = Math.min(mvps, 4);

  let dpoys = countAwards(defense * 0.75 + overall * 0.15, rand, 4, 84);
  if (defense >= 92 && overall >= 84 && rand() > 0.35) dpoys = Math.max(dpoys, 1);
  if (defense < 80) dpoys = 0;
  if (defense < 88) dpoys = Math.min(dpoys, 2);

  let scoringTitles = countAwards(byKey.scoring, rand, 5, 82);
  if (ppg >= 28 && rand() > 0.4) scoringTitles = Math.max(scoringTitles, 2);
  else if (ppg >= 25 && rand() > 0.45) scoringTitles = Math.max(scoringTitles, 1);
  if (ppg < 20) scoringTitles = 0;
  if (ppg < 24) scoringTitles = Math.min(scoringTitles, 2);

  let reboundTitles = countAwards(glass, rand, 4, 86);
  if (rpg >= 12 && rand() > 0.4) reboundTitles = Math.max(reboundTitles, 2);
  else if (rpg >= 10 && rand() > 0.5) reboundTitles = Math.max(reboundTitles, 1);
  if (rpg < 8 || isGuard) reboundTitles = 0;

  let assistTitles = countAwards(
    (byKey.playmaking + byKey.handles + byKey.iq) / 3,
    rand,
    4,
    84,
  );
  if (apg >= 10 && rand() > 0.4) assistTitles = Math.max(assistTitles, 2);
  else if (apg >= 8.5 && rand() > 0.5) assistTitles = Math.max(assistTitles, 1);
  if (apg < 6.5) assistTitles = 0;

  let allStars = countAwards(overall * 0.65 + production * 0.35, rand, yearsPlayed - 1, 66);
  if (overall >= 90) allStars = Math.max(allStars, Math.min(yearsPlayed - 3, 7));
  else if (overall >= 84) allStars = Math.max(allStars, Math.min(yearsPlayed - 5, 5));
  else if (overall >= 78) allStars = Math.max(allStars, Math.min(3, yearsPlayed - 4));
  if (mvps > 0) allStars = Math.max(allStars, mvps + 2);
  allStars = clamp(allStars, 0, yearsPlayed);

  let allNba = countAwards(overall * 0.6 + offense * 0.25 + production * 0.15, rand, 10, 72);
  if (mvps >= 1) allNba = Math.max(allNba, mvps + 1);
  if (overall >= 90) allNba = Math.max(allNba, 4);
  else if (overall >= 84) allNba = Math.max(allNba, 2);
  if (overall < 76) allNba = Math.min(allNba, 1);

  let allDefense = countAwards(defense, rand, 8, 78);
  if (dpoys > 0) allDefense = Math.max(allDefense, dpoys + 1);
  if (defense < 74) allDefense = Math.min(allDefense, 1);

  let championships = countAwards(
    overall * 0.4 + byKey.iq * 0.3 + defense * 0.15 + offense * 0.15,
    rand,
    5,
    80,
  );
  if (overall < 82) championships = Math.min(championships, 1);
  if (overall < 78) championships = Math.min(championships, 0);

  // Finals MVPs should track rings — alpha scorers win FMVP on most of their titles.
  let finalsMvps = 0;
  if (championships > 0) {
    const alpha =
      byKey.scoring >= 88 || offense >= 88 || (overall >= 90 && byKey.scoring >= 84);
    const sidekick = !alpha && byKey.scoring < 82;
    const share = alpha
      ? 0.6 + rand() * 0.35
      : sidekick
        ? 0.05 + rand() * 0.25
        : 0.3 + rand() * 0.35;
    finalsMvps = clamp(Math.round(championships * share), 0, championships);
    if (alpha && championships >= 2) {
      finalsMvps = Math.max(finalsMvps, championships - 1);
    }
    if (alpha && championships >= 3 && overall >= 90) {
      finalsMvps = Math.max(finalsMvps, Math.ceil(championships * 0.67));
    }
    if (sidekick) {
      finalsMvps = Math.min(finalsMvps, Math.max(0, Math.floor(championships / 3)));
    }
  }

  const rookiesOfYear =
    overall >= 82 ? rand() > 0.4 : overall >= 74 ? rand() > 0.7 : false;

  const hofScore =
    mvps * 22 +
    dpoys * 16 +
    finalsMvps * 14 +
    championships * 10 +
    allStars * 3.5 +
    allNba * 4 +
    scoringTitles * 5 +
    overall * 0.55 +
    yearsPlayed * 1.2 +
    production * 0.35;
  const hallOfFame =
    hofScore >= 118 ||
    (overall >= 90 && allStars >= 6) ||
    mvps >= 2 ||
    (mvps >= 1 && allNba >= 5);

  const awards = {
    mvps,
    dpoys,
    finalsMvps,
    scoringTitles,
    reboundTitles,
    assistTitles,
    allStars,
    allNba,
    allDefense,
    championships,
    rookiesOfYear,
  };

  // Final average caps still track the résumé (career stricter than peak).
  if (allNba === 0 && !hallOfFame) {
    ppg = Math.min(ppg, 16.5);
    rpg = Math.min(rpg, 6.5);
    apg = Math.min(apg, 5.2);
    peakPpg = Math.min(peakPpg, 19);
    peakRpg = Math.min(peakRpg, 7.5);
    peakApg = Math.min(peakApg, 6);
  } else if (allNba < 3 && !hallOfFame) {
    ppg = Math.min(ppg, 20);
    rpg = Math.min(rpg, 8);
    apg = Math.min(apg, 6.8);
    peakPpg = Math.min(peakPpg, 23);
    peakRpg = Math.min(peakRpg, 9.2);
    peakApg = Math.min(peakApg, 7.8);
  }
  if (allStars < 3) {
    ppg = Math.min(ppg, 18.5);
    peakPpg = Math.min(peakPpg, 21.5);
  }
  if (scoringTitles === 0) {
    ppg = Math.min(ppg, 22.5);
    peakPpg = Math.min(peakPpg, 26.5);
  }
  if (reboundTitles === 0) {
    rpg = Math.min(rpg, 10.2);
    peakRpg = Math.min(peakRpg, 12);
  }
  if (assistTitles === 0) {
    apg = Math.min(apg, 8.8);
    peakApg = Math.min(peakApg, 10.2);
  }
  if (mvps === 0) {
    ppg = Math.min(ppg, 23.5);
    peakPpg = Math.min(peakPpg, 27.5);
  }

  if (!hallOfFame && overall < 88) {
    if (ppg >= 10 && rpg >= 10 && apg >= 10) {
      const overflow = Math.min(ppg, rpg, apg) - 9.2;
      ppg -= overflow;
      rpg -= overflow;
      apg -= overflow;
    }
    if (peakPpg >= 11 && peakRpg >= 11 && peakApg >= 11) {
      const overflow = Math.min(peakPpg, peakRpg, peakApg) - 10.2;
      peakPpg -= overflow;
      peakRpg -= overflow;
      peakApg -= overflow;
    }
  }

  // Peak must sit clearly above career averages.
  peakPpg = Math.max(peakPpg, ppg + 1.4);
  peakRpg = Math.max(peakRpg, rpg + 0.5);
  peakApg = Math.max(peakApg, apg + 0.5);
  peakSpg = Math.max(peakSpg, spg + 0.1);
  peakBpg = Math.max(peakBpg, bpg + 0.08);

  const careerAverages = {
    ppg: round1(clamp(ppg, 5, 27)),
    rpg: round1(clamp(rpg, 1.5, 12.5)),
    apg: round1(clamp(apg, 1.2, 10.5)),
    spg: round1(clamp(spg, 0.3, 2.3)),
    bpg: round1(clamp(bpg, 0.1, 2.7)),
  };

  const peakAverages = {
    ppg: round1(clamp(peakPpg, careerAverages.ppg + 0.8, 32)),
    rpg: round1(clamp(peakRpg, careerAverages.rpg + 0.3, 14.5)),
    apg: round1(clamp(peakApg, careerAverages.apg + 0.3, 12.5)),
    spg: round1(clamp(peakSpg, careerAverages.spg + 0.05, 2.8)),
    bpg: round1(clamp(peakBpg, careerAverages.bpg + 0.05, 3.2)),
  };

  const allTimeRank = rankAllTime({
    overall,
    mvps,
    dpoys,
    finalsMvps,
    championships,
    allStars,
    allNba,
    scoringTitles,
    reboundTitles,
    assistTitles,
    yearsPlayed,
    peakPpg: peakAverages.ppg,
    peakRpg: peakAverages.rpg,
    peakApg: peakAverages.apg,
    careerPpg: careerAverages.ppg,
    careerRpg: careerAverages.rpg,
    careerApg: careerAverages.apg,
    rand,
  });

  let finalOverall = overall;
  if (allTimeRank === 1) finalOverall = Math.max(finalOverall, 94);
  else if (allTimeRank <= 5) finalOverall = Math.max(finalOverall, 93);
  else if (allTimeRank <= 15) finalOverall = Math.max(finalOverall, 90);
  else if (allTimeRank <= 30) finalOverall = Math.max(finalOverall, 86);
  else if (allTimeRank <= 50) finalOverall = Math.max(finalOverall, 82);
  finalOverall = clamp(finalOverall, 35, 99);

  const grade = gradeFromCareer(finalOverall, allTimeRank);
  const rankContext = buildRankContext(allTimeRank);
  const legacyLine =
    allTimeRank <= 10
      ? "Inner-circle all-time great"
      : allTimeRank <= 25
        ? "Mount Rushmore adjacent"
        : allTimeRank <= 50
          ? "Clear Hall of Fame trajectory"
          : allTimeRank <= 100
            ? "Franchise cornerstone legacy"
            : allTimeRank <= 200
              ? "Very good career, debated greatness"
              : "Remembered more by teammates than banners";

  return {
    overall: finalOverall,
    grade,
    peak: peakLabel(finalOverall),
    yearsPlayed,
    position,
    attributes: attrs,
    awards,
    hallOfFame,
    allTimeRank,
    rankContext,
    legacyLine,
    backstory: buildBackstory(
      grade,
      awards,
      hallOfFame,
      picks,
      position,
    ),
    careerAverages,
    peakAverages,
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
