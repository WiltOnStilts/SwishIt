export type PuzzleGroup = {
  label: string;
  /** 1 easiest → 10 Insane Ball Knowledge */
  difficulty: number;
  members: [string, string, string, string];
};

export type PuzzleSeed = {
  puzzleDate?: string | null;
  /** Internal only — never shown in-game (avoids hints). */
  title?: string;
  groups: PuzzleGroup[];
};

/** Dated puzzles + rotation bank. Prefer mixed player groups; coaches only when they belong in a theme. */
export const puzzles: PuzzleSeed[] = [
  {
    puzzleDate: "2026-08-11",
    title: "internal-0811",
    groups: [
      {
        label: "MVP winners",
        difficulty: 1,
        members: ["Nikola Jokic", "Shai Gilgeous-Alexander", "Giannis Antetokounmpo", "LeBron James"],
      },
      {
        label: "People associated with the 2017 Warriors",
        difficulty: 2,
        members: ["Kevin Durant", "Stephen Curry", "Klay Thompson", "Steve Kerr"],
      },
      {
        label: "Finals MVPs who weren't that season's MVP",
        difficulty: 5,
        members: ["Kawhi Leonard", "Jaylen Brown", "Dwyane Wade", "Andre Iguodala"],
      },
      {
        label: "28+ PPG seasons in the SwishIt database",
        difficulty: 7,
        members: ["Michael Jordan", "Allen Iverson", "Luka Doncic", "Kobe Bryant"],
      },
    ],
  },
  {
    puzzleDate: "2026-08-10",
    title: "internal-0810",
    groups: [
      {
        label: "Bulls dynasty names",
        difficulty: 1,
        members: ["Michael Jordan", "Scottie Pippen", "Dennis Rodman", "Horace Grant"],
      },
      {
        label: "Spurs cornerstone eras",
        difficulty: 3,
        members: ["Tim Duncan", "Tony Parker", "Manu Ginobili", "David Robinson"],
      },
      {
        label: "People associated with the 2012 Heat",
        difficulty: 4,
        members: ["LeBron James", "Dwyane Wade", "Chris Bosh", "Erik Spoelstra"],
      },
      {
        label: "Elite shot-blockers",
        difficulty: 8,
        members: ["Hakeem Olajuwon", "Dikembe Mutombo", "Dwight Howard", "Ben Wallace"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "bank-a",
    groups: [
      {
        label: "1980s Lakers",
        difficulty: 1,
        members: ["Magic Johnson", "Kareem Abdul-Jabbar", "James Worthy", "Byron Scott"],
      },
      {
        label: "1989 Pistons Bad Boys",
        difficulty: 2,
        members: ["Isiah Thomas", "Joe Dumars", "Dennis Rodman", "Bill Laimbeer"],
      },
      {
        label: "Sixth Man award winners",
        difficulty: 6,
        members: ["Kevin McHale", "Bill Walton", "Toni Kukoc", "Aaron McKie"],
      },
      {
        label: "Assist machines",
        difficulty: 4,
        members: ["John Stockton", "Steve Nash", "Rajon Rondo", "Jason Kidd"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "bank-b",
    groups: [
      {
        label: "2024 Celtics rotation pieces",
        difficulty: 2,
        members: ["Jayson Tatum", "Jaylen Brown", "Derrick White", "Jrue Holiday"],
      },
      {
        label: "Nuggets title core",
        difficulty: 3,
        members: ["Nikola Jokic", "Jamal Murray", "Aaron Gordon", "Michael Porter Jr."],
      },
      {
        label: "OKC modern stars",
        difficulty: 3,
        members: ["Shai Gilgeous-Alexander", "Jalen Williams", "Chet Holmgren", "Lu Dort"],
      },
      {
        label: "People associated with Seven Seconds or Less Suns",
        difficulty: 5,
        members: ["Steve Nash", "Amar'e Stoudemire", "Shawn Marion", "Mike D'Antoni"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "bank-c",
    groups: [
      {
        label: "MVP winners",
        difficulty: 1,
        members: ["Allen Iverson", "Kevin Durant", "Karl Malone", "Kevin Garnett"],
      },
      {
        label: "2011 Mavericks title pieces",
        difficulty: 4,
        members: ["Dirk Nowitzki", "Jason Terry", "Tyson Chandler", "Peja Stojakovic"],
      },
      {
        label: "Lakers champions across eras",
        difficulty: 5,
        members: ["Kobe Bryant", "Shaquille O'Neal", "Anthony Davis", "Magic Johnson"],
      },
      {
        label: "Bigs who can slide up a position",
        difficulty: 9,
        members: ["Tim Duncan", "Chris Bosh", "Pau Gasol", "Draymond Green"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "bank-d",
    groups: [
      {
        label: "Scoring guards",
        difficulty: 2,
        members: ["Allen Iverson", "Kobe Bryant", "Dwyane Wade", "Klay Thompson"],
      },
      {
        label: "Rebound monsters",
        difficulty: 3,
        members: ["Dennis Rodman", "Kevin Garnett", "Charles Oakley", "Dwight Howard"],
      },
      {
        label: "1994 Rockets",
        difficulty: 4,
        members: ["Hakeem Olajuwon", "Kenny Smith", "Robert Horry", "Sam Cassell"],
      },
      {
        label: "People associated with the 2020 Lakers",
        difficulty: 6,
        members: ["LeBron James", "Anthony Davis", "Rajon Rondo", "Frank Vogel"],
      },
    ],
  },
];
