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

/** Rotation bank. Coaches only when the theme is about them. */
export const puzzles: PuzzleSeed[] = [
  {
    puzzleDate: null,
    title: "showtime-and-bad-boys",
    groups: [
      {
        label: "Showtime Lakers",
        difficulty: 3,
        members: ["Magic Johnson", "Kareem Abdul-Jabbar", "James Worthy", "Michael Cooper"],
      },
      {
        label: "1989 Pistons",
        difficulty: 5,
        members: ["Isiah Thomas", "Joe Dumars", "Dennis Rodman", "John Salley"],
      },
      {
        label: "1986 Celtics",
        difficulty: 6,
        members: ["Larry Bird", "Kevin McHale", "Robert Parish", "Dennis Johnson"],
      },
      {
        label: "1983 76ers",
        difficulty: 8,
        members: ["Julius Erving", "Moses Malone", "Maurice Cheeks", "Andrew Toney"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "bulls-spurs-heat",
    groups: [
      {
        label: "90s Bulls",
        difficulty: 3,
        members: ["Michael Jordan", "Scottie Pippen", "Dennis Rodman", "Toni Kukoc"],
      },
      {
        label: "Spurs title core",
        difficulty: 4,
        members: ["Tim Duncan", "Tony Parker", "Manu Ginobili", "Kawhi Leonard"],
      },
      {
        label: "Heatles",
        difficulty: 4,
        members: ["LeBron James", "Dwyane Wade", "Chris Bosh", "Ray Allen"],
      },
      {
        label: "Admiral's Spurs",
        difficulty: 7,
        members: ["David Robinson", "Sean Elliott", "Avery Johnson", "Vinny Del Negro"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "title-teams-00s",
    groups: [
      {
        label: "2001 Lakers",
        difficulty: 4,
        members: ["Shaquille O'Neal", "Kobe Bryant", "Derek Fisher", "Robert Horry"],
      },
      {
        label: "2004 Pistons",
        difficulty: 6,
        members: ["Chauncey Billups", "Richard Hamilton", "Tayshaun Prince", "Ben Wallace"],
      },
      {
        label: "2008 Celtics",
        difficulty: 4,
        members: ["Paul Pierce", "Kevin Garnett", "Ray Allen", "Rajon Rondo"],
      },
      {
        label: "2011 Mavericks",
        difficulty: 6,
        members: ["Dirk Nowitzki", "Jason Terry", "Tyson Chandler", "Jason Kidd"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "modern-champs",
    groups: [
      {
        label: "2016 Cavaliers",
        difficulty: 4,
        members: ["LeBron James", "Kyrie Irving", "Kevin Love", "Tristan Thompson"],
      },
      {
        label: "2017 Warriors",
        difficulty: 3,
        members: ["Stephen Curry", "Kevin Durant", "Klay Thompson", "Draymond Green"],
      },
      {
        label: "2019 Raptors",
        difficulty: 5,
        members: ["Kawhi Leonard", "Kyle Lowry", "Pascal Siakam", "Marc Gasol"],
      },
      {
        label: "2021 Bucks",
        difficulty: 5,
        members: ["Giannis Antetokounmpo", "Jrue Holiday", "Khris Middleton", "Brook Lopez"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "recent-cores",
    groups: [
      {
        label: "2023 Nuggets",
        difficulty: 4,
        members: ["Nikola Jokic", "Jamal Murray", "Aaron Gordon", "Michael Porter Jr."],
      },
      {
        label: "2024 Celtics",
        difficulty: 4,
        members: ["Jayson Tatum", "Jaylen Brown", "Derrick White", "Jrue Holiday"],
      },
      {
        label: "2022 Warriors",
        difficulty: 5,
        members: ["Stephen Curry", "Klay Thompson", "Andrew Wiggins", "Draymond Green"],
      },
      {
        label: "2020 Lakers",
        difficulty: 5,
        members: ["LeBron James", "Anthony Davis", "Danny Green", "Alex Caruso"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "rockets-and-lakers",
    groups: [
      {
        label: "1994 Rockets",
        difficulty: 6,
        members: ["Hakeem Olajuwon", "Kenny Smith", "Robert Horry", "Sam Cassell"],
      },
      {
        label: "2008 Rockets",
        difficulty: 7,
        members: ["Yao Ming", "Tracy McGrady", "Luis Scola", "Shane Battier"],
      },
      {
        label: "2009 Lakers",
        difficulty: 5,
        members: ["Kobe Bryant", "Pau Gasol", "Lamar Odom", "Trevor Ariza"],
      },
      {
        label: "Twin Towers Rockets",
        difficulty: 8,
        members: ["Ralph Sampson", "Lewis Lloyd", "Robert Reid", "John Lucas"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "styles-of-play",
    groups: [
      {
        label: "Assist machines",
        difficulty: 4,
        members: ["John Stockton", "Steve Nash", "Chris Paul", "Jason Kidd"],
      },
      {
        label: "Volume scorers",
        difficulty: 4,
        members: ["Allen Iverson", "Kobe Bryant", "Carmelo Anthony", "James Harden"],
      },
      {
        label: "Rebound monsters",
        difficulty: 5,
        members: ["Dennis Rodman", "Dwight Howard", "Andre Drummond", "Kevin Love"],
      },
      {
        label: "Elite shot-blockers",
        difficulty: 7,
        members: ["Dikembe Mutombo", "Mark Eaton", "Marcus Camby", "Theo Ratliff"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "identities",
    groups: [
      {
        label: "Seven Seconds or Less Suns",
        difficulty: 6,
        members: ["Steve Nash", "Amar'e Stoudemire", "Shawn Marion", "Boris Diaw"],
      },
      {
        label: "Lob City Clippers",
        difficulty: 6,
        members: ["Chris Paul", "Blake Griffin", "DeAndre Jordan", "Jamal Crawford"],
      },
      {
        label: "Grit and Grind Grizzlies",
        difficulty: 7,
        members: ["Mike Conley", "Marc Gasol", "Zach Randolph", "Tony Allen"],
      },
      {
        label: "We Believe Warriors",
        difficulty: 8,
        members: ["Baron Davis", "Monta Ellis", "Stephen Jackson", "Al Harrington"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "international",
    groups: [
      {
        label: "European MVPs",
        difficulty: 5,
        members: ["Nikola Jokic", "Giannis Antetokounmpo", "Dirk Nowitzki", "Luka Doncic"],
      },
      {
        label: "French stars",
        difficulty: 6,
        members: ["Tony Parker", "Rudy Gobert", "Nicolas Batum", "Evan Fournier"],
      },
      {
        label: "Spanish stars",
        difficulty: 7,
        members: ["Pau Gasol", "Marc Gasol", "Ricky Rubio", "Jose Calderon"],
      },
      {
        label: "African-born stars",
        difficulty: 7,
        members: ["Hakeem Olajuwon", "Dikembe Mutombo", "Joel Embiid", "Pascal Siakam"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "defensive-anchors",
    groups: [
      {
        label: "DPOY bigs",
        difficulty: 5,
        members: ["Ben Wallace", "Dwight Howard", "Rudy Gobert", "Marcus Camby"],
      },
      {
        label: "DPOY wings",
        difficulty: 6,
        members: ["Kawhi Leonard", "Sidney Moncrief", "Michael Cooper", "Gary Payton"],
      },
      {
        label: "All-Defense guards",
        difficulty: 7,
        members: ["Jrue Holiday", "Marcus Smart", "Patrick Beverley", "Tony Allen"],
      },
      {
        label: "Help-side rim protectors",
        difficulty: 8,
        members: ["Hakeem Olajuwon", "David Robinson", "Alonzo Mourning", "Brook Lopez"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "scoring-titles",
    groups: [
      {
        label: "Scoring champs of the 90s",
        difficulty: 6,
        members: ["Michael Jordan", "David Robinson", "Shaquille O'Neal", "Allen Iverson"],
      },
      {
        label: "Scoring champs of the 2000s",
        difficulty: 6,
        members: ["Kobe Bryant", "Tracy McGrady", "Dwyane Wade", "LeBron James"],
      },
      {
        label: "Scoring champs of the 2010s",
        difficulty: 5,
        members: ["Kevin Durant", "James Harden", "Russell Westbrook", "Carmelo Anthony"],
      },
      {
        label: "Scoring champs of the 2020s",
        difficulty: 5,
        members: ["Joel Embiid", "Luka Doncic", "Shai Gilgeous-Alexander", "Stephen Curry"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "point-guards",
    groups: [
      {
        label: "Floor generals",
        difficulty: 4,
        members: ["Magic Johnson", "John Stockton", "Chris Paul", "Steve Nash"],
      },
      {
        label: "Scoring point guards",
        difficulty: 5,
        members: ["Allen Iverson", "Damian Lillard", "Stephen Curry", "Kyrie Irving"],
      },
      {
        label: "Big point guards",
        difficulty: 6,
        members: ["Luka Doncic", "LeBron James", "Ben Simmons", "Penny Hardaway"],
      },
      {
        label: "Defensive point guards",
        difficulty: 8,
        members: ["Gary Payton", "Jrue Holiday", "Mike Conley", "Patrick Beverley"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "wings",
    groups: [
      {
        label: "Two-way wings",
        difficulty: 5,
        members: ["Kawhi Leonard", "Jimmy Butler", "Paul George", "Scottie Pippen"],
      },
      {
        label: "Pure scorers",
        difficulty: 5,
        members: ["Kevin Durant", "Carmelo Anthony", "Klay Thompson", "Devin Booker"],
      },
      {
        label: "3-and-D wings",
        difficulty: 7,
        members: ["Danny Green", "Bruce Bowen", "Trevor Ariza", "Mikal Bridges"],
      },
      {
        label: "Slashing wings",
        difficulty: 6,
        members: ["Dwyane Wade", "Vince Carter", "Clyde Drexler", "Dominique Wilkins"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "bigs",
    groups: [
      {
        label: "Back-to-the-basket bigs",
        difficulty: 5,
        members: ["Hakeem Olajuwon", "Tim Duncan", "Dirk Nowitzki", "Kevin McHale"],
      },
      {
        label: "Stretch bigs",
        difficulty: 6,
        members: ["Chris Bosh", "Pau Gasol", "LaMarcus Aldridge", "Karl-Anthony Towns"],
      },
      {
        label: "Rim-running bigs",
        difficulty: 6,
        members: ["DeAndre Jordan", "Clint Capela", "Tyson Chandler", "Andre Drummond"],
      },
      {
        label: "Playmaking bigs",
        difficulty: 5,
        members: ["Nikola Jokic", "Bam Adebayo", "Draymond Green", "Al Horford"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "draft-and-duos",
    groups: [
      {
        label: "1984 draft class",
        difficulty: 6,
        members: ["Hakeem Olajuwon", "Michael Jordan", "Charles Barkley", "John Stockton"],
      },
      {
        label: "1996 draft class",
        difficulty: 6,
        members: ["Allen Iverson", "Kobe Bryant", "Stephon Marbury", "Steve Nash"],
      },
      {
        label: "2003 draft class",
        difficulty: 5,
        members: ["LeBron James", "Carmelo Anthony", "Dwyane Wade", "Chris Bosh"],
      },
      {
        label: "All-time three-point snipers",
        difficulty: 5,
        members: ["Stephen Curry", "Klay Thompson", "Reggie Miller", "Ray Allen"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "rival-duos-expanded",
    groups: [
      {
        label: "Jordan and his rivals",
        difficulty: 5,
        members: ["Michael Jordan", "Clyde Drexler", "Charles Barkley", "Karl Malone"],
      },
      {
        label: "Kobe and his rivals",
        difficulty: 5,
        members: ["Kobe Bryant", "Tracy McGrady", "Vince Carter", "Allen Iverson"],
      },
      {
        label: "LeBron and his rivals",
        difficulty: 5,
        members: ["LeBron James", "Kevin Durant", "Stephen Curry", "Kawhi Leonard"],
      },
      {
        label: "Jokic and his rivals",
        difficulty: 6,
        members: ["Nikola Jokic", "Joel Embiid", "Giannis Antetokounmpo", "Luka Doncic"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "role-and-sixth",
    groups: [
      {
        label: "Sixth Man winners",
        difficulty: 7,
        members: ["Kevin McHale", "Bill Walton", "Toni Kukoc", "Jamal Crawford"],
      },
      {
        label: "Microwave scorers",
        difficulty: 6,
        members: ["Vinnie Johnson", "Lou Williams", "Jordan Clarkson", "Immanuel Quickley"],
      },
      {
        label: "Glue guys",
        difficulty: 7,
        members: ["Shane Battier", "Boris Diaw", "Draymond Green", "Bruce Bowen"],
      },
      {
        label: "Finals MVPs off the superstar line",
        difficulty: 8,
        members: ["Andre Iguodala", "Jaylen Brown", "Chauncey Billups", "Tony Parker"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "coaches-and-stars",
    groups: [
      {
        label: "Phil Jackson title stars",
        difficulty: 5,
        members: ["Michael Jordan", "Scottie Pippen", "Shaquille O'Neal", "Kobe Bryant"],
      },
      {
        label: "Gregg Popovich stars",
        difficulty: 5,
        members: ["Tim Duncan", "Tony Parker", "Manu Ginobili", "Kawhi Leonard"],
      },
      {
        label: "Steve Kerr Warriors",
        difficulty: 4,
        members: ["Stephen Curry", "Klay Thompson", "Draymond Green", "Kevin Durant"],
      },
      {
        label: "Pat Riley stars",
        difficulty: 7,
        members: ["Magic Johnson", "Kareem Abdul-Jabbar", "Patrick Ewing", "Alonzo Mourning"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "okc-and-rebuilds",
    groups: [
      {
        label: "Thunder big three",
        difficulty: 4,
        members: ["Kevin Durant", "Russell Westbrook", "James Harden", "Serge Ibaka"],
      },
      {
        label: "Current Thunder",
        difficulty: 5,
        members: ["Shai Gilgeous-Alexander", "Jalen Williams", "Chet Holmgren", "Lu Dort"],
      },
      {
        label: "Process Sixers",
        difficulty: 6,
        members: ["Joel Embiid", "Ben Simmons", "Jimmy Butler", "Tobias Harris"],
      },
      {
        label: "213 Clippers",
        difficulty: 6,
        members: ["Kawhi Leonard", "Paul George", "Norman Powell", "Ivica Zubac"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "hometown-hoops",
    groups: [
      {
        label: "Chicago products",
        difficulty: 6,
        members: ["Isiah Thomas", "Dwyane Wade", "Anthony Davis", "Derrick Rose"],
      },
      {
        label: "Los Angeles products",
        difficulty: 6,
        members: ["Paul Pierce", "James Harden", "Russell Westbrook", "Kawhi Leonard"],
      },
      {
        label: "New York products",
        difficulty: 7,
        members: ["Kareem Abdul-Jabbar", "Carmelo Anthony", "Lamar Odom", "Stephon Marbury"],
      },
      {
        label: "Texas products",
        difficulty: 6,
        members: ["Shaquille O'Neal", "Chris Bosh", "LaMarcus Aldridge", "Justise Winslow"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "one-team-legends",
    groups: [
      {
        label: "Lakers legends",
        difficulty: 4,
        members: ["Magic Johnson", "Kobe Bryant", "James Worthy", "Derek Fisher"],
      },
      {
        label: "Celtics legends",
        difficulty: 5,
        members: ["Larry Bird", "Paul Pierce", "Robert Parish", "Kevin McHale"],
      },
      {
        label: "Spurs legends",
        difficulty: 5,
        members: ["Tim Duncan", "Manu Ginobili", "Tony Parker", "David Robinson"],
      },
      {
        label: "Jazz legends",
        difficulty: 6,
        members: ["John Stockton", "Karl Malone", "Deron Williams", "Andrei Kirilenko"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "nicknames-and-eras",
    groups: [
      {
        label: "Bad Boys era",
        difficulty: 6,
        members: ["Isiah Thomas", "Bill Laimbeer", "Joe Dumars", "Rick Mahorn"],
      },
      {
        label: "Run TMC",
        difficulty: 8,
        members: ["Tim Hardaway", "Mitch Richmond", "Chris Mullin", "Sarunas Marciulionis"],
      },
      {
        label: "Twin Towers Rockets",
        difficulty: 7,
        members: ["Hakeem Olajuwon", "Ralph Sampson", "Sleepy Floyd", "Rodney McCray"],
      },
      {
        label: "Baby Bulls",
        difficulty: 8,
        members: ["Derrick Rose", "Joakim Noah", "Luol Deng", "Ben Gordon"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "mvps-by-era",
    groups: [
      {
        label: "80s MVPs",
        difficulty: 6,
        members: ["Larry Bird", "Magic Johnson", "Moses Malone", "Julius Erving"],
      },
      {
        label: "90s MVPs",
        difficulty: 5,
        members: ["Michael Jordan", "Hakeem Olajuwon", "Karl Malone", "David Robinson"],
      },
      {
        label: "2000s MVPs",
        difficulty: 5,
        members: ["Tim Duncan", "Steve Nash", "Kevin Garnett", "Dirk Nowitzki"],
      },
      {
        label: "2010s MVPs",
        difficulty: 4,
        members: ["LeBron James", "Stephen Curry", "Kevin Durant", "Russell Westbrook"],
      },
    ],
  },
  {
    puzzleDate: null,
    title: "finals-mvps",
    groups: [
      {
        label: "Finals MVPs, 80s",
        difficulty: 6,
        members: ["Magic Johnson", "Larry Bird", "James Worthy", "Isiah Thomas"],
      },
      {
        label: "Faces of the 90s Finals",
        difficulty: 6,
        members: ["Michael Jordan", "Scottie Pippen", "Hakeem Olajuwon", "Clyde Drexler"],
      },
      {
        label: "Finals MVPs, 2000s",
        difficulty: 5,
        members: ["Shaquille O'Neal", "Kobe Bryant", "Dwyane Wade", "Paul Pierce"],
      },
      {
        label: "Finals MVPs, 2010s",
        difficulty: 5,
        members: ["LeBron James", "Kawhi Leonard", "Kevin Durant", "Andre Iguodala"],
      },
    ],
  },
];
