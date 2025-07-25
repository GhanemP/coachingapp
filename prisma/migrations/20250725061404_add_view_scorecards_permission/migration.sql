-- DropIndex
DROP INDEX "AgentMetric_agentId_year_idx";

-- DropIndex
DROP INDEX "AgentMetric_month_year_idx";

-- CreateTable
CREATE TABLE "MetricWeight" (
    "id" TEXT NOT NULL,
    "serviceWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "productivityWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "qualityWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "assiduityWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "performanceWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "adherenceWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "latenessWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "breakExceedsWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricWeight_pkey" PRIMARY KEY ("id")
);
