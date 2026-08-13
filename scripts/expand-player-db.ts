/**
 * Fetch Basketball-Reference per-game stats (1980–2026), drop absolute
 * role players, map franchises onto our team abbreviations, and write
 * prisma/data/players.json for seeding.
 *
 * Usage: npx tsx scripts/expand-player-db.ts
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const CACHE_DIR = join(ROOT, "scripts/data/bref");
const OUT_JSON = join(ROOT, "prisma/data/players.json");
const START_YEAR = 1980;
const END_YEAR = 2026;

/** BRef / historical abbreviations → our Team.abbreviation */
const TEAM_MAP: Record<string, string> = {
  ATL: "ATL",
  BOS: "BOS",
  BRK: "BKN",
  BKN: "BKN",
  NJN: "NJN",
  NYN: "NJN",
  CHA: "CHA",
  CHH: "CHA",
  CHO: "CHA",
  CHI: "CHI",
  CLE: "CLE",
  DAL: "DAL",
  DEN: "DEN",
  DET: "DET",
  GSW: "GSW",
  HOU: "HOU",
  IND: "IND",
  LAC: "LAC",
  SDC: "LAC",
  LAL: "LAL",
  MEM: "MEM",
  VAN: "MEM",
  MIA: "MIA",
  MIL: "MIL",
  MIN: "MIN",
  NOP: "NOP",
  NOH: "NOP",
  NOK: "NOP",
  NYK: "NYK",
  OKC: "OKC",
  SEA: "SEA",
  ORL: "ORL",
  PHI: "PHI",
  PHO: "PHX",
  PHX: "PHX",
  POR: "POR",
  SAC: "SAC",
  KCK: "SAC",
  SAS: "SAS",
  TOR: "TOR",
  UTA: "UTA",
  WAS: "WAS",
  WSB: "WAS",
};

/** Champion franchise name fragment → abbreviation for that era */
const CHAMP_NAME_TO_ABBR: { match: RegExp; abbr: string }[] = [
  { match: /celtics/i, abbr: "BOS" },
  { match: /lakers/i, abbr: "LAL" },
  { match: /bulls/i, abbr: "CHI" },
  { match: /spurs/i, abbr: "SAS" },
  { match: /heat/i, abbr: "MIA" },
  { match: /warriors/i, abbr: "GSW" },
  { match: /cavaliers|cavs/i, abbr: "CLE" },
  { match: /mavericks/i, abbr: "DAL" },
  { match: /pistons/i, abbr: "DET" },
  { match: /rockets/i, abbr: "HOU" },
  { match: /sixers|76ers|seventy/i, abbr: "PHI" },
  { match: /supersonics|sonics/i, abbr: "SEA" },
  { match: /thunder/i, abbr: "OKC" },
  { match: /nuggets/i, abbr: "DEN" },
  { match: /bucks/i, abbr: "MIL" },
  { match: /raptors/i, abbr: "TOR" },
  { match: /blazers|trail/i, abbr: "POR" },
  { match: /knicks/i, abbr: "NYK" },
  { match: /wizards|bullets/i, abbr: "WAS" },
  { match: /kings/i, abbr: "SAC" },
  { match: /suns/i, abbr: "PHX" },
  { match: /pacers/i, abbr: "IND" },
  { match: /hawks/i, abbr: "ATL" },
  { match: /nets/i, abbr: "BKN" }, // modern; NJN handled via year
  { match: /magic/i, abbr: "ORL" },
  { match: /hornets/i, abbr: "CHA" },
  { match: /pelicans/i, abbr: "NOP" },
  { match: /grizzlies/i, abbr: "MEM" },
  { match: /timberwolves|wolves/i, abbr: "MIN" },
  { match: /clippers/i, abbr: "LAC" },
  { match: /jazz/i, abbr: "UTA" },
];

export type PlayerSeed = {
  playerName: string;
  year: number;
  teamAbbr: string;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  games: number;
  mpg: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  fgPct?: number;
  accolades?: string[];
  allStar?: boolean;
  mvp?: boolean;
  dpoy?: boolean;
  champion?: boolean;
};

type RawRow = {
  playerName: string;
  teamRaw: string;
  pos: string;
  games: number;
  mpg: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  fgPct: number | null;
  awards: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripTags(s: string) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

/** ASCII-ish names to match existing seed (Jokic, Doncic, …). */
function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, " ")
    .trim();
}

function num(s: string | undefined | null): number {
  if (s == null || s === "") return 0;
  const n = Number(stripTags(s));
  return Number.isFinite(n) ? n : 0;
}

function mapPos(raw: string): PlayerSeed["position"] {
  const p = stripTags(raw).toUpperCase().split("-")[0]!.trim();
  if (p === "PG" || p === "SG" || p === "SF" || p === "PF" || p === "C") {
    return p;
  }
  if (p.includes("G")) return p.startsWith("S") ? "SG" : "PG";
  if (p.includes("F")) return p.startsWith("P") ? "PF" : "SF";
  return "SF";
}

function mapTeam(raw: string, year: number): string | null {
  const t = stripTags(raw).toUpperCase();
  if (!t || t === "TOT" || /^\d+TM$/.test(t)) return null;
  // New Jersey Nets before Brooklyn move
  if ((t === "NJN" || t === "NYN" || t === "BRK" || t === "BKN") && year < 2013) {
    if (t === "BRK" || t === "BKN") return year >= 2013 ? "BKN" : "NJN";
    return "NJN";
  }
  if ((t === "BRK" || t === "BKN") && year >= 2013) return "BKN";
  // Seattle vs OKC
  if (t === "SEA") return "SEA";
  if (t === "OKC") return "OKC";
  return TEAM_MAP[t] ?? null;
}

function isRotationPlayer(r: RawRow): boolean {
  // Injured stars who still started when healthy (e.g. Cade 2023: 12 GP @ 33 MPG).
  if (r.games >= 8 && r.mpg >= 28 && (r.ppg >= 12 || r.apg >= 5 || r.rpg >= 8)) {
    return true;
  }
  if (r.games >= 10 && r.mpg >= 24) return true;

  // Absolute role players: tiny minutes or cup-of-coffee games.
  if (r.games < 15) return false;
  if (r.mpg < 12) return false;
  if (r.games >= 20 && r.mpg >= 12) return true;
  if (r.games >= 40 && r.mpg >= 12) return true;
  return false;
}

function parseAwards(awards: string) {
  const a = awards.toUpperCase();
  const accolades: string[] = [];
  const allStar = /\bAS\b/.test(a) || a.includes("ALL-STAR");
  const mvp = /\bMVP-1\b/.test(a) || a.includes("MVP");
  // Only treat as season MVP if MVP-1 (first place) when numbered
  const seasonMvp = /\bMVP-1\b/.test(a);
  const dpoy = /\bDPOY-1\b/.test(a) || /\bDPOY\b/.test(a) && !/\bDPOY-\d/.test(a);
  const seasonDpoy = /\bDPOY-1\b/.test(a);
  if (allStar) accolades.push("All-Star");
  if (seasonMvp) accolades.push("MVP");
  if (seasonDpoy) accolades.push("DPOY");
  if (/\bNBA1\b/.test(a)) accolades.push("All-NBA 1st");
  if (/\bNBA2\b/.test(a)) accolades.push("All-NBA 2nd");
  if (/\bNBA3\b/.test(a)) accolades.push("All-NBA 3rd");
  if (/\bDEF1\b/.test(a)) accolades.push("All-Defense 1st");
  if (/\bDEF2\b/.test(a)) accolades.push("All-Defense 2nd");
  if (/\bCPOY-1\b/.test(a)) accolades.push("Clutch Player");
  if (/\bMIP-1\b/.test(a)) accolades.push("MIP");
  if (/\bROY-1\b/.test(a) || /\bROY\b/.test(a)) accolades.push("ROY");
  return {
    accolades,
    allStar,
    mvp: seasonMvp || (mvp && !/\bMVP-\d/.test(a)),
    dpoy: seasonDpoy,
  };
}

function extractChampionAbbr(html: string, year: number): string | null {
  const href =
    html.match(
      /League Champion<\/strong>:\s*<a href=['"]\/teams\/([A-Z]{3})\/\d+\.html['"]/i,
    ) ||
    html.match(
      /League Champion:\s*<a href=['"]\/teams\/([A-Z]{3})\/\d+\.html['"]/i,
    );
  if (href?.[1]) {
    return mapTeam(href[1], year);
  }
  const m =
    html.match(/League Champion<\/strong>:\s*<a[^>]*>([^<]+)<\/a>/i) ||
    html.match(/League Champion:\s*<a[^>]*>([^<]+)<\/a>/i);
  if (!m) return null;
  const name = stripTags(m[1]!);
  for (const row of CHAMP_NAME_TO_ABBR) {
    if (row.match.test(name)) {
      if (/nets/i.test(name)) return year < 2013 ? "NJN" : "BKN";
      return row.abbr;
    }
  }
  return null;
}

function cell(rowHtml: string, stat: string): string {
  const re = new RegExp(
    `data-stat="${stat}"[^>]*>([\\s\\S]*?)</t[dh]>`,
    "i",
  );
  const m = rowHtml.match(re);
  return m ? m[1]! : "";
}

function parseSeasonHtml(html: string, year: number): RawRow[] {
  const tableMatch = html.match(
    /<table[^>]*id="per_game_stats"[\s\S]*?<\/table>/i,
  );
  if (!tableMatch) {
    console.warn(`No per_game_stats table for ${year}`);
    return [];
  }
  const table = tableMatch[0];
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const out: RawRow[] = [];

  for (const rm of rows) {
    const row = rm[1]!;
    // Support both modern and legacy BRef stat keys
    const nameHtml =
      cell(row, "name_display") || cell(row, "player") || cell(row, "name_full");
    if (!nameHtml || !/href=.*\/players\//i.test(nameHtml)) continue;

    const teamHtml =
      cell(row, "team_name_abbr") || cell(row, "team_id") || cell(row, "team");
    const pos = cell(row, "pos");
    const games = num(cell(row, "games") || cell(row, "g"));
    const mpg = num(cell(row, "mp_per_g") || cell(row, "mp"));
    const ppg = num(cell(row, "pts_per_g") || cell(row, "pts"));
    const rpg = num(cell(row, "trb_per_g") || cell(row, "trb"));
    const apg = num(cell(row, "ast_per_g") || cell(row, "ast"));
    const spg = num(cell(row, "stl_per_g") || cell(row, "stl"));
    const bpg = num(cell(row, "blk_per_g") || cell(row, "blk"));
    const fgRaw = cell(row, "fg_pct");
    const fgPct = fgRaw && stripTags(fgRaw) !== "" ? num(fgRaw) : null;
    const awards = stripTags(cell(row, "awards"));

    out.push({
      playerName: normalizeName(stripTags(nameHtml)),
      teamRaw: stripTags(teamHtml),
      pos: stripTags(pos),
      games,
      mpg,
      ppg,
      rpg,
      apg,
      spg,
      bpg,
      fgPct,
      awards,
    });
  }
  return out;
}

async function fetchYearHtml(year: number): Promise<{ html: string; fromCache: boolean }> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${year}.html`);
  if (existsSync(cachePath)) {
    const cached = readFileSync(cachePath, "utf8");
    if (cached.includes("per_game_stats") && cached.length > 50_000) {
      return { html: cached, fromCache: true };
    }
  }
  const url = `https://www.basketball-reference.com/leagues/NBA_${year}_per_game.html`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch ${year} failed: ${res.status}`);
  }
  const html = await res.text();
  writeFileSync(cachePath, html);
  return { html, fromCache: false };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

async function main() {
  const players: PlayerSeed[] = [];
  const yearTeams = new Map<number, Set<string>>();

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    process.stdout.write(`Fetching ${year}… `);
    let html: string;
    let fromCache = false;
    try {
      const fetched = await fetchYearHtml(year);
      html = fetched.html;
      fromCache = fetched.fromCache;
    } catch (e) {
      console.log("FAILED", e);
      continue;
    }

    const champ = extractChampionAbbr(html, year);
    const rows = parseSeasonHtml(html, year);
    let kept = 0;
    const teams = new Set<string>();

    for (const r of rows) {
      if (!isRotationPlayer(r)) continue;
      const teamAbbr = mapTeam(r.teamRaw, year);
      if (!teamAbbr) continue;

      const awards = parseAwards(r.awards);
      const seed: PlayerSeed = {
        playerName: r.playerName,
        year,
        teamAbbr,
        position: mapPos(r.pos),
        games: r.games,
        mpg: round1(r.mpg),
        ppg: round1(r.ppg),
        rpg: round1(r.rpg),
        apg: round1(r.apg),
        spg: round1(r.spg),
        bpg: round1(r.bpg),
      };
      if (r.fgPct != null && r.fgPct > 0) seed.fgPct = round3(r.fgPct);
      if (awards.accolades.length) seed.accolades = awards.accolades;
      if (awards.allStar) seed.allStar = true;
      if (awards.mvp) seed.mvp = true;
      if (awards.dpoy) seed.dpoy = true;
      if (champ && teamAbbr === champ) {
        seed.champion = true;
        seed.accolades = [...(seed.accolades ?? []), "Champion"].filter(
          (v, i, a) => a.indexOf(v) === i,
        );
      }

      players.push(seed);
      teams.add(teamAbbr);
      kept += 1;
    }

    yearTeams.set(year, teams);
    console.log(
      `${rows.length} rows → ${kept} kept, ${teams.size} teams` +
        (champ ? `, champ ${champ}` : ""),
    );
    if (!fromCache) await sleep(2200);
  }

  // Deduplicate identical player/year/team (shouldn't happen often)
  const seen = new Set<string>();
  const deduped: PlayerSeed[] = [];
  for (const p of players) {
    const key = `${p.year}|${p.teamAbbr}|${p.playerName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }

  writeFileSync(OUT_JSON, JSON.stringify(deduped));
  console.log(`\nWrote ${deduped.length} players → ${OUT_JSON}`);

  // Coverage report
  for (let y = START_YEAR; y <= END_YEAR; y++) {
    const t = yearTeams.get(y);
    if (!t) {
      console.log(`${y}: MISSING`);
      continue;
    }
    console.log(`${y}: ${t.size} teams`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
