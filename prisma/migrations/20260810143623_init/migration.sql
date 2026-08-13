-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "conference" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerSeason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "games" INTEGER NOT NULL DEFAULT 82,
    "mpg" REAL NOT NULL DEFAULT 0,
    "ppg" REAL NOT NULL DEFAULT 0,
    "rpg" REAL NOT NULL DEFAULT 0,
    "apg" REAL NOT NULL DEFAULT 0,
    "spg" REAL NOT NULL DEFAULT 0,
    "bpg" REAL NOT NULL DEFAULT 0,
    "fgPct" REAL,
    "accolades" TEXT NOT NULL DEFAULT '[]',
    "allStar" BOOLEAN NOT NULL DEFAULT false,
    "mvp" BOOLEAN NOT NULL DEFAULT false,
    "dpoy" BOOLEAN NOT NULL DEFAULT false,
    "champion" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PlayerSeason_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "teams" TEXT NOT NULL DEFAULT '[]',
    "startYear" INTEGER,
    "endYear" INTEGER,
    "accolades" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "DetectivePuzzle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "puzzleDate" TEXT,
    "title" TEXT,
    "groups" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PlayerSeason_year_teamId_idx" ON "PlayerSeason"("year", "teamId");

-- CreateIndex
CREATE INDEX "PlayerSeason_playerName_idx" ON "PlayerSeason"("playerName");

-- CreateIndex
CREATE INDEX "PlayerSeason_year_position_idx" ON "PlayerSeason"("year", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_name_key" ON "Coach"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DetectivePuzzle_puzzleDate_key" ON "DetectivePuzzle"("puzzleDate");
