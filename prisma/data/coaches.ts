export type CoachSeed = {
  name: string;
  teams: string[];
  startYear?: number;
  endYear?: number;
  accolades?: string[];
};

export const coaches: CoachSeed[] = [
  { name: "Phil Jackson", teams: ["Chicago Bulls", "Los Angeles Lakers"], startYear: 1989, endYear: 2011, accolades: ["11× Champion coach", "NBA Coach of the Year"] },
  { name: "Gregg Popovich", teams: ["San Antonio Spurs"], startYear: 1996, endYear: 2025, accolades: ["5× Champion coach", "NBA Coach of the Year"] },
  { name: "Pat Riley", teams: ["Los Angeles Lakers", "New York Knicks", "Miami Heat"], startYear: 1981, endYear: 2008, accolades: ["5× Champion coach", "NBA Coach of the Year"] },
  { name: "Red Auerbach", teams: ["Boston Celtics"], startYear: 1950, endYear: 1966, accolades: ["9× Champion coach"] },
  { name: "Steve Kerr", teams: ["Golden State Warriors"], startYear: 2014, endYear: 2026, accolades: ["4× Champion coach", "NBA Coach of the Year"] },
  { name: "Erik Spoelstra", teams: ["Miami Heat"], startYear: 2008, endYear: 2026, accolades: ["2× Champion coach"] },
  { name: "Doc Rivers", teams: ["Orlando Magic", "Boston Celtics", "LA Clippers", "Philadelphia 76ers", "Milwaukee Bucks"], startYear: 1999, endYear: 2026, accolades: ["Champion coach"] },
  { name: "Tyronn Lue", teams: ["Cleveland Cavaliers", "LA Clippers"], startYear: 2016, endYear: 2026, accolades: ["Champion coach"] },
  { name: "Nick Nurse", teams: ["Toronto Raptors", "Philadelphia 76ers"], startYear: 2018, endYear: 2026, accolades: ["Champion coach", "NBA Coach of the Year"] },
  { name: "Mike Budenholzer", teams: ["Atlanta Hawks", "Milwaukee Bucks", "Phoenix Suns"], startYear: 2013, endYear: 2024, accolades: ["Champion coach", "NBA Coach of the Year"] },
  { name: "Michael Malone", teams: ["Denver Nuggets"], startYear: 2015, endYear: 2025, accolades: ["Champion coach"] },
  { name: "Joe Mazzulla", teams: ["Boston Celtics"], startYear: 2022, endYear: 2026, accolades: ["Champion coach"] },
  { name: "Mark Daigneault", teams: ["Oklahoma City Thunder"], startYear: 2020, endYear: 2026, accolades: ["NBA Coach of the Year", "Champion coach"] },
  { name: "Chuck Daly", teams: ["Detroit Pistons", "New Jersey Nets", "Orlando Magic"], startYear: 1983, endYear: 1999, accolades: ["2× Champion coach"] },
  { name: "Larry Brown", teams: ["Denver Nuggets", "Indiana Pacers", "Philadelphia 76ers", "Detroit Pistons", "New York Knicks"], startYear: 1979, endYear: 2010, accolades: ["Champion coach", "NBA Coach of the Year"] },
  { name: "Lenny Wilkens", teams: ["Seattle SuperSonics", "Cleveland Cavaliers", "Atlanta Hawks", "Toronto Raptors", "New York Knicks"], startYear: 1969, endYear: 2005, accolades: ["Champion coach", "NBA Coach of the Year"] },
  { name: "Don Nelson", teams: ["Milwaukee Bucks", "Golden State Warriors", "New York Knicks", "Dallas Mavericks"], startYear: 1976, endYear: 2010, accolades: ["NBA Coach of the Year"] },
  { name: "Jerry Sloan", teams: ["Chicago Bulls", "Utah Jazz"], startYear: 1979, endYear: 2011, accolades: ["Hall of Fame coach"] },
  { name: "Rudy Tomjanovich", teams: ["Houston Rockets", "Los Angeles Lakers"], startYear: 1992, endYear: 2005, accolades: ["2× Champion coach"] },
  { name: "Rick Carlisle", teams: ["Detroit Pistons", "Indiana Pacers", "Dallas Mavericks"], startYear: 2001, endYear: 2026, accolades: ["Champion coach", "NBA Coach of the Year"] },
  { name: "Brad Stevens", teams: ["Boston Celtics"], startYear: 2013, endYear: 2021, accolades: ["Executive later"] },
  { name: "Tom Thibodeau", teams: ["Chicago Bulls", "Minnesota Timberwolves", "New York Knicks"], startYear: 2010, endYear: 2025, accolades: ["NBA Coach of the Year"] },
  { name: "Rick Adelman", teams: ["Portland Trail Blazers", "Golden State Warriors", "Sacramento Kings", "Houston Rockets", "Minnesota Timberwolves"], startYear: 1988, endYear: 2014, accolades: ["Hall of Fame coach"] },
  { name: "George Karl", teams: ["Seattle SuperSonics", "Milwaukee Bucks", "Denver Nuggets", "Sacramento Kings"], startYear: 1984, endYear: 2016, accolades: ["NBA Coach of the Year"] },
  { name: "Flip Saunders", teams: ["Minnesota Timberwolves", "Detroit Pistons", "Washington Wizards"], startYear: 1995, endYear: 2015, accolades: ["Longtime head coach"] },
  { name: "Stan Van Gundy", teams: ["Miami Heat", "Orlando Magic", "Detroit Pistons"], startYear: 2003, endYear: 2020, accolades: ["Finals coach"] },
  { name: "Jeff Van Gundy", teams: ["New York Knicks", "Houston Rockets"], startYear: 1996, endYear: 2007, accolades: ["Finals coach"] },
  { name: "Mike D'Antoni", teams: ["Phoenix Suns", "New York Knicks", "Los Angeles Lakers", "Houston Rockets"], startYear: 2003, endYear: 2020, accolades: ["NBA Coach of the Year"] },
  { name: "Nate McMillan", teams: ["Seattle SuperSonics", "Portland Trail Blazers", "Indiana Pacers", "Atlanta Hawks"], startYear: 2000, endYear: 2023, accolades: ["Longtime head coach"] },
  { name: "Monty Williams", teams: ["New Orleans Pelicans", "Phoenix Suns", "Detroit Pistons"], startYear: 2010, endYear: 2024, accolades: ["NBA Coach of the Year"] },
  { name: "Frank Vogel", teams: ["Indiana Pacers", "Orlando Magic", "Los Angeles Lakers", "Phoenix Suns"], startYear: 2011, endYear: 2024, accolades: ["Champion coach"] },
  { name: "Jason Kidd", teams: ["Brooklyn Nets", "Milwaukee Bucks", "Dallas Mavericks"], startYear: 2013, endYear: 2026, accolades: ["Champion coach"] },
  { name: "Ime Udoka", teams: ["Boston Celtics", "Houston Rockets"], startYear: 2021, endYear: 2026, accolades: ["Finals coach"] },
  { name: "Mike Brown", teams: ["Cleveland Cavaliers", "Los Angeles Lakers", "Sacramento Kings"], startYear: 2005, endYear: 2026, accolades: ["NBA Coach of the Year"] },
  { name: "Kenny Atkinson", teams: ["Brooklyn Nets", "Cleveland Cavaliers"], startYear: 2016, endYear: 2026, accolades: ["NBA Coach of the Year"] },
  { name: "JJ Redick", teams: ["Los Angeles Lakers"], startYear: 2024, endYear: 2026, accolades: ["Current Lakers coach"] },
  { name: "Charles Lee", teams: ["Charlotte Hornets"], startYear: 2024, endYear: 2026, accolades: ["Current Hornets coach"] },
  { name: "Willie Green", teams: ["New Orleans Pelicans"], startYear: 2021, endYear: 2026, accolades: ["Current Pelicans coach"] },
  { name: "Chris Finch", teams: ["Minnesota Timberwolves"], startYear: 2021, endYear: 2026, accolades: ["Current Timberwolves coach"] },
  { name: "Taylor Jenkins", teams: ["Memphis Grizzlies"], startYear: 2019, endYear: 2025, accolades: ["Grizzlies coach"] },
];
