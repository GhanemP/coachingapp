-- CreateTable
CREATE TABLE "AgentMetric" (
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
    CONSTRAINT "AgentMetric_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentMetric_agentId_month_year_key" ON "AgentMetric"("agentId", "month", "year");
