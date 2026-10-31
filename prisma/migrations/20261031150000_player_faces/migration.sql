-- CreateTable
CREATE TABLE "PlayerFace" (
    "playerName" TEXT NOT NULL PRIMARY KEY,
    "faceJson" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
