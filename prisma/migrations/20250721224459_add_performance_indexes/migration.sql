-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "service" INTEGER NOT NULL DEFAULT 1,
    "productivity" INTEGER NOT NULL DEFAULT 1,
    "quality" INTEGER NOT NULL DEFAULT 1,
    "assiduity" INTEGER NOT NULL DEFAULT 1,
    "performance" INTEGER NOT NULL DEFAULT 1,
    "adherence" INTEGER NOT NULL DEFAULT 1,
    "lateness" INTEGER NOT NULL DEFAULT 1,
    "breakExceeds" INTEGER NOT NULL DEFAULT 1,
    "serviceWeight" REAL NOT NULL DEFAULT 1.0,
    "productivityWeight" REAL NOT NULL DEFAULT 1.0,
    "qualityWeight" REAL NOT NULL DEFAULT 1.0,
    "assiduityWeight" REAL NOT NULL DEFAULT 1.0,
    "performanceWeight" REAL NOT NULL DEFAULT 1.0,
    "adherenceWeight" REAL NOT NULL DEFAULT 1.0,
    "latenessWeight" REAL NOT NULL DEFAULT 1.0,
    "breakExceedsWeight" REAL NOT NULL DEFAULT 1.0,
    "totalScore" REAL,
    "percentage" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentMetric_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AgentMetric" ("adherence", "adherenceWeight", "agentId", "assiduity", "assiduityWeight", "breakExceeds", "breakExceedsWeight", "createdAt", "id", "lateness", "latenessWeight", "month", "notes", "percentage", "performance", "performanceWeight", "productivity", "productivityWeight", "quality", "qualityWeight", "service", "serviceWeight", "totalScore", "updatedAt", "year") SELECT "adherence", "adherenceWeight", "agentId", "assiduity", "assiduityWeight", "breakExceeds", "breakExceedsWeight", "createdAt", "id", "lateness", "latenessWeight", "month", "notes", "percentage", "performance", "performanceWeight", "productivity", "productivityWeight", "quality", "qualityWeight", "service", "serviceWeight", "totalScore", "updatedAt", "year" FROM "AgentMetric";
DROP TABLE "AgentMetric";
ALTER TABLE "new_AgentMetric" RENAME TO "AgentMetric";
CREATE INDEX "AgentMetric_agentId_idx" ON "AgentMetric"("agentId");
CREATE INDEX "AgentMetric_year_month_idx" ON "AgentMetric"("year", "month");
CREATE INDEX "AgentMetric_createdAt_idx" ON "AgentMetric"("createdAt");
CREATE UNIQUE INDEX "AgentMetric_agentId_month_year_key" ON "AgentMetric"("agentId", "month", "year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CoachingSession_agentId_idx" ON "CoachingSession"("agentId");

-- CreateIndex
CREATE INDEX "CoachingSession_teamLeaderId_idx" ON "CoachingSession"("teamLeaderId");

-- CreateIndex
CREATE INDEX "CoachingSession_status_idx" ON "CoachingSession"("status");

-- CreateIndex
CREATE INDEX "CoachingSession_scheduledDate_idx" ON "CoachingSession"("scheduledDate");

-- CreateIndex
CREATE INDEX "CoachingSession_sessionDate_idx" ON "CoachingSession"("sessionDate");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_supervisedBy_idx" ON "User"("supervisedBy");

-- CreateIndex
CREATE INDEX "User_managedBy_idx" ON "User"("managedBy");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
