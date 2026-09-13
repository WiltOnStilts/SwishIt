type CourtPos = "PG" | "SG" | "SF" | "PF" | "C";

const ALL: CourtPos[] = ["PG", "SG", "SF", "PF", "C"];

/**
 * Manual extras beyond primary + career-derived eligibility.
 * Cross-checked against BRef career listings + common NBA role history.
 */
export const EXTRA_POSITIONS: Record<string, CourtPos[]> = {
  "A.C. Green": ["PF", "C"],
  "Aaron Gordon": ["PF", "SF"],
  "Al Horford": ["C", "PF"],
  "Allen Iverson": ["PG", "SG"],
  "Alonzo Mourning": ["C", "PF"],
  "Amar'e Stoudemire": ["PF", "C"],
  "Amen Thompson": ["SG", "SF", "PG"],
  "Andre Drummond": ["C", "PF"],
  "Andre Iguodala": ["SF", "SG", "PF"],
  "Andrew Bogut": ["C", "PF"],
  "Anfernee Hardaway": ["PG", "SG", "SF"],
  "Anthony Davis": ["PF", "C"],
  "Anthony Edwards": ["SG", "SF"],
  "Antawn Jamison": ["PF", "SF"],
  "Artis Gilmore": ["C", "PF"],
  "Arvydas Sabonis": ["C", "PF"],
  "Ausar Thompson": ["SF", "SG"],
  "Bam Adebayo": ["C", "PF"],
  "Ben Wallace": ["C", "PF"],
  "Bill Laimbeer": ["C", "PF"],
  "Bill Walton": ["C", "PF"],
  "Blake Griffin": ["PF", "C"],
  "Bob Lanier": ["C", "PF"],
  "Boris Diaw": ["PF", "C", "SF"],
  "Brad Daugherty": ["C", "PF"],
  "Brook Lopez": ["C", "PF"],
  "Byron Scott": ["SG", "PG"],
  "Cade Cunningham": ["PG", "SG", "SF"],
  "Carlos Boozer": ["PF", "C"],
  "Carmelo Anthony": ["SF", "PF"],
  "Charles Barkley": ["PF", "C", "SF"],
  "Chauncey Billups": ["PG", "SG"],
  "Chet Holmgren": ["C", "PF"],
  "Chris Bosh": ["PF", "C"],
  "Chris Paul": ["PG", "SG"],
  "Chris Webber": ["PF", "C"],
  "Clint Capela": ["C", "PF"],
  "Clyde Drexler": ["SG", "SF"],
  "Cooper Flagg": ["SF", "PF"],
  "Damian Lillard": ["PG", "SG"],
  "Dave Cowens": ["C", "PF"],
  "David Robinson": ["C", "PF"],
  "David West": ["PF", "C"],
  "DeAndre Jordan": ["C", "PF"],
  "Deandre Ayton": ["C", "PF"],
  "Dennis Rodman": ["PF", "SF", "C"],
  "Deron Williams": ["PG", "SG"],
  "Derrick White": ["PG", "SG"],
  "Detlef Schrempf": ["SF", "PF"],
  "Devin Booker": ["SG", "SF"],
  "Dikembe Mutombo": ["C", "PF"],
  "Dirk Nowitzki": ["PF", "C"],
  "Domantas Sabonis": ["PF", "C"],
  "Donovan Mitchell": ["SG", "PG"],
  "Draymond Green": ["PF", "C", "SF"],
  "Dwight Howard": ["C", "PF"],
  "Dwyane Wade": ["PG", "SG"],
  "Elton Brand": ["PF", "C"],
  "Evan Mobley": ["PF", "C"],
  "Franz Wagner": ["SF", "SG"],
  "Gary Payton": ["PG", "SG"],
  "Giannis Antetokounmpo": ["PF", "SF", "C"],
  "Grant Hill": ["SF", "SG"],
  "Hakeem Olajuwon": ["C", "PF"],
  "Hassan Whiteside": ["C", "PF"],
  "Horace Grant": ["PF", "C"],
  "Isiah Thomas": ["PG", "SG"],
  "Ivica Zubac": ["C", "PF"],
  "Ja Morant": ["PG", "SG"],
  "Jack Sikma": ["C", "PF"],
  "Jalen Williams": ["SG", "SF", "PG"],
  "Jamal Murray": ["PG", "SG"],
  "James Harden": ["SG", "PG"],
  "James Worthy": ["SF", "PF"],
  "Jaren Jackson Jr.": ["PF", "C"],
  "Jarrett Allen": ["C", "PF"],
  "Jason Kidd": ["PG", "SG"],
  "Jaylen Brown": ["SG", "SF"],
  "Jayson Tatum": ["SF", "PF"],
  "Jimmy Butler": ["SF", "SG"],
  "Joakim Noah": ["C", "PF"],
  "Joe Dumars": ["SG", "PG"],
  "Joel Embiid": ["C", "PF"],
  "John Stockton": ["PG", "SG"],
  "Jonas Valanciunas": ["C", "PF"],
  "Jordan Poole": ["SG", "PG"],
  "Jrue Holiday": ["PG", "SG"],
  "Julius Randle": ["PF", "C"],
  "Jusuf Nurkic": ["C", "PF"],
  "Kareem Abdul-Jabbar": ["C", "PF"],
  "Karl Malone": ["PF", "C"],
  "Karl-Anthony Towns": ["C", "PF"],
  "Kawhi Leonard": ["SF", "SG"],
  "Kevin Durant": ["SF", "PF", "SG"],
  "Kevin Garnett": ["PF", "C"],
  "Kevin McHale": ["PF", "C"],
  "Klay Thompson": ["SG", "SF"],
  "Kobe Bryant": ["SG", "SF"],
  "Kristaps Porzingis": ["PF", "C"],
  "Kurt Rambis": ["PF", "C"],
  "Kyrie Irving": ["PG", "SG"],
  "LaMarcus Aldridge": ["PF", "C"],
  "Lamar Odom": ["PF", "SF", "C"],
  "Larry Bird": ["SF", "PF"],
  "Larry Nance": ["PF", "C"],
  "LeBron James": ["SF", "PF", "SG", "PG"],
  "Luka Doncic": ["SG", "SF"],
  "Magic Johnson": ["SG", "SF"],
  "Manu Ginobili": ["SG", "SF", "PG"],
  "Manute Bol": ["C", "PF"],
  "Marc Gasol": ["C", "PF"],
  "Marcus Camby": ["C", "PF"],
  "Mark Eaton": ["C", "PF"],
  "Michael Jordan": ["SG", "SF"],
  "Mikal Bridges": ["SF", "SG"],
  "Mitchell Robinson": ["C", "PF"],
  "Moses Malone": ["C", "PF"],
  "Myles Turner": ["C", "PF"],
  "Nic Claxton": ["C", "PF"],
  "Nikola Jokic": ["C", "PF"],
  "Nikola Vucevic": ["C", "PF"],
  "Norm Nixon": ["PG", "SG"],
  "OG Anunoby": ["SF", "PF"],
  "Paolo Banchero": ["PF", "SF"],
  "Pascal Siakam": ["PF", "SF", "C"],
  "Patrick Ewing": ["C", "PF"],
  "Pau Gasol": ["PF", "C"],
  "Paul George": ["SF", "SG"],
  "Paul Millsap": ["PF", "C"],
  "Peja Stojakovic": ["SF", "PF"],
  "Rajon Rondo": ["PG", "SG"],
  "Ralph Sampson": ["C", "PF"],
  "Rasheed Wallace": ["PF", "C"],
  "Rick Fox": ["SF", "SG"],
  "Rik Smits": ["C", "PF"],
  "Robert Horry": ["PF", "SF"],
  "Robert Parish": ["C", "PF"],
  "Robert Williams": ["C", "PF"],
  "Robin Lopez": ["C", "PF"],
  "Roy Hibbert": ["C", "PF"],
  "Rudy Gobert": ["C", "PF"],
  "Russell Westbrook": ["SG"],
  "Sam Bowie": ["C", "PF"],
  "Sam Lacey": ["C", "PF"],
  "Sam Perkins": ["PF", "C"],
  "Scottie Barnes": ["SF", "PF", "SG"],
  "Scottie Pippen": ["SF", "SG", "PF"],
  "Serge Ibaka": ["PF", "C"],
  "Shaquille O'Neal": ["C", "PF"],
  "Shareef Abdur-Rahim": ["PF", "C"],
  "Shai Gilgeous-Alexander": ["SG"],
  "Shawn Bradley": ["C", "PF"],
  "Shawn Kemp": ["PF", "C"],
  "Stephen Curry": ["PG", "SG"],
  "Steve Nash": ["PG", "SG"],
  "Steven Adams": ["C", "PF"],
  "Thaddeus Young": ["PF", "SF"],
  "Tim Duncan": ["PF", "C"],
  "Tobias Harris": ["PF", "SF"],
  "Toni Kukoc": ["SF", "PF"],
  "Tony Parker": ["PG", "SG"],
  "Tracy McGrady": ["SG", "SF"],
  "Trae Young": ["PG", "SG"],
  "Tree Rollins": ["C", "PF"],
  "Tyrese Haliburton": ["PG", "SG"],
  "Tyson Chandler": ["C", "PF"],
  "Victor Wembanyama": ["C", "PF"],
  "Vince Carter": ["SG", "SF"],
  "Vlade Divac": ["C", "PF"],
  "Walker Kessler": ["C", "PF"],
  "Wes Unseld": ["C", "PF"],
  "Yao Ming": ["C", "PF"],
  "Zion Williamson": ["PF", "C"],
};

type SeasonLike = {
  playerName: string;
  position: CourtPos;
  mpg: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  dpoy?: boolean;
  accolades?: string[];
};

function ordered(primary: CourtPos, set: Set<CourtPos>): CourtPos[] {
  const rest = ALL.filter((p) => p !== primary && set.has(p));
  return [primary, ...rest];
}

/**
 * Build career position sets from every BRef-listed primary across seasons.
 * A player listed as PF some years and C others becomes eligible at both.
 */
export function buildCareerPositions(
  seasons: SeasonLike[],
): Map<string, Set<CourtPos>> {
  const map = new Map<string, Set<CourtPos>>();
  for (const s of seasons) {
    let set = map.get(s.playerName);
    if (!set) {
      set = new Set();
      map.set(s.playerName, set);
    }
    set.add(s.position);
  }
  return map;
}

/**
 * Resolve full Undefeated eligibility for one season.
 * Sources: BRef primary, career primaries across our corpus, manual extras,
 * and role/stat adjacent slots (especially PF↔C for under-listed bigs).
 */
export function resolvePositions(
  season: SeasonLike,
  career: Set<CourtPos> | undefined,
): CourtPos[] {
  const set = new Set<CourtPos>([season.position]);
  if (career) {
    for (const p of career) set.add(p);
  }
  for (const extra of EXTRA_POSITIONS[season.playerName] ?? []) {
    set.add(extra);
  }

  const primary = season.position;
  const mpg = season.mpg;
  const stocks = season.spg + season.bpg;
  const hasDefAccolade =
    !!season.dpoy ||
    (season.accolades ?? []).some((a) => /def/i.test(a));

  // Adjacent wing/guard flexibility — do NOT cascade wings into C.
  if (set.has("PG") && (career?.has("SG") || season.apg >= 4 || season.ppg >= 18)) {
    set.add("SG");
  }
  if (set.has("SG") && (career?.has("PG") || season.apg >= 5)) {
    set.add("PG");
  }
  if (
    (primary === "SG" || career?.has("SF")) &&
    (career?.has("SF") || season.rpg >= 5.5 || (season.ppg >= 20 && season.rpg >= 4.5))
  ) {
    set.add("SF");
  }
  if (
    (primary === "SF" || career?.has("SG")) &&
    (career?.has("SG") || season.apg >= 3 || season.spg >= 1.4)
  ) {
    set.add("SG");
  }
  if (
    (primary === "SF" || career?.has("PF")) &&
    (career?.has("PF") ||
      (primary === "SF" && (season.rpg >= 8 || season.bpg >= 1.0)))
  ) {
    set.add("PF");
  }
  // PF→SF only with forward history in extras/career — not high-assist centers.
  if (
    career?.has("SF") ||
    (EXTRA_POSITIONS[season.playerName] ?? []).includes("SF")
  ) {
    if (set.has("PF") || primary === "SF") set.add("SF");
  }

  // Bigs: PF↔C for real bigs only. Wing PF extras (Grant Hill, etc.) must not unlock C.
  const careerHasPf = !!career?.has("PF");
  const careerHasC = !!career?.has("C");
  const extras = EXTRA_POSITIONS[season.playerName] ?? [];

  if (careerHasPf) set.add("PF");
  if (careerHasC || extras.includes("C")) set.add("C");

  const rimProtector =
    season.bpg >= 0.9 ||
    (season.bpg >= 0.6 && season.rpg >= 8) ||
    stocks >= 1.8 ||
    hasDefAccolade;
  const faceUpBig =
    season.apg >= 1.8 ||
    season.ppg >= 14 ||
    (season.rpg >= 6 && season.apg >= 1.2);
  const traditionalBig =
    mpg >= 18 && (season.rpg >= 7 || season.bpg >= 0.6);

  // PF→C only on PF-primary seasons with real big-man signals — not scoring wings.
  if (primary === "PF") {
    if (
      careerHasC ||
      extras.includes("C") ||
      season.bpg >= 1.0 ||
      (season.rpg >= 10 && season.bpg >= 0.5) ||
      (season.rpg >= 9 && season.bpg >= 0.8)
    ) {
      set.add("C");
    }
  }
  if (primary === "C" || extras.includes("C") || careerHasC) {
    set.add("C");
    if (careerHasPf || extras.includes("PF") || faceUpBig || traditionalBig) {
      set.add("PF");
    }
  }

  // Safety: perimeter primaries never become centers unless BRef/extras say so.
  if (
    (primary === "PG" || primary === "SG" || primary === "SF") &&
    !careerHasC &&
    !extras.includes("C")
  ) {
    set.delete("C");
  }

  return ordered(primary, set);
}
