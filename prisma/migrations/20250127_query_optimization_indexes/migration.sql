-- Query Optimization Indexes Migration
-- This migration adds composite indexes to improve query performance
-- Based on analysis of common query patterns in the application

-- User table optimizations
-- Composite index for team leader agent lookups (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_teamLeaderId_role_isActive_idx" ON "User"("teamLeaderId", "role", "isActive");

-- Composite index for role-based filtering with activity status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_role_isActive_createdAt_idx" ON "User"("role", "isActive", "createdAt");

-- ActionItem table optimizations
-- Composite index for agent-based filtering with status and due date
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ActionItem_agentId_status_dueDate_idx" ON "ActionItem"("agentId", "status", "dueDate");

-- Composite index for assignee-based filtering with status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ActionItem_assignedTo_status_priority_idx" ON "ActionItem"("assignedTo", "status", "priority");

-- Composite index for creator-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ActionItem_createdBy_status_createdAt_idx" ON "ActionItem"("createdBy", "status", "createdAt");

-- Composite index for session-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ActionItem_sessionId_status_idx" ON "ActionItem"("sessionId", "status");

-- QuickNote table optimizations
-- Composite index for agent-based filtering with privacy and category
CREATE INDEX CONCURRENTLY IF NOT EXISTS "QuickNote_agentId_isPrivate_category_idx" ON "QuickNote"("agentId", "isPrivate", "category");

-- Composite index for author-based filtering with creation date
CREATE INDEX CONCURRENTLY IF NOT EXISTS "QuickNote_authorId_createdAt_idx" ON "QuickNote"("authorId", "createdAt");

-- Composite index for category and privacy filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "QuickNote_category_isPrivate_createdAt_idx" ON "QuickNote"("category", "isPrivate", "createdAt");

-- CoachingSession table optimizations
-- Composite index for agent sessions with status and date
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CoachingSession_agentId_status_sessionDate_idx" ON "CoachingSession"("agentId", "status", "sessionDate");

-- Composite index for team leader sessions with status and date
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CoachingSession_teamLeaderId_status_sessionDate_idx" ON "CoachingSession"("teamLeaderId", "status", "sessionDate");

-- Composite index for scheduled date with status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CoachingSession_scheduledDate_status_idx" ON "CoachingSession"("scheduledDate", "status");

-- AgentMetric table optimizations
-- Composite index for agent metrics by month/year
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AgentMetric_agentId_year_month_idx" ON "AgentMetric"("agentId", "year", "month");

-- Composite index for recent metrics lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AgentMetric_agentId_createdAt_idx" ON "AgentMetric"("agentId", "createdAt");

-- AuditLog table optimizations (for the new audit system)
-- Composite index for user-based audit filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_userId_createdAt_action_idx" ON "AuditLog"("userId", "createdAt", "action");

-- Composite index for resource-based audit filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_resource_resourceId_createdAt_idx" ON "AuditLog"("resource", "resourceId", "createdAt");

-- Composite index for time-based audit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_createdAt_action_resource_idx" ON "AuditLog"("createdAt", "action", "resource");

-- Notification table optimizations
-- Composite index for user notifications with read status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- Composite index for notification type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- Performance table optimizations
-- Composite index for agent performance by period
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Performance_agentId_period_metricType_idx" ON "Performance"("agentId", "period", "metricType");

-- Composite index for performance metrics by period
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Performance_period_metricType_score_idx" ON "Performance"("period", "metricType", "score");

-- Permission and Role optimizations
-- Composite index for role permissions
CREATE INDEX CONCURRENTLY IF NOT EXISTS "RolePermission_role_permissionId_idx" ON "RolePermission"("role", "permissionId");

-- Composite index for permission resources
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Permission_resource_action_idx" ON "Permission"("resource", "action");

-- ActionPlan table optimizations
-- Composite index for agent action plans with status and dates
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ActionPlan_agentId_status_startDate_idx" ON "ActionPlan"("agentId", "status", "startDate");

-- Composite index for action plan date ranges
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ActionPlan_startDate_endDate_status_idx" ON "ActionPlan"("startDate", "endDate", "status");

-- ActionPlanItem table optimizations
-- Composite index for action plan items with status and due date
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ActionPlanItem_actionPlanId_status_dueDate_idx" ON "ActionPlanItem"("actionPlanId", "status", "dueDate");

-- Composite index for due date filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ActionPlanItem_dueDate_status_idx" ON "ActionPlanItem"("dueDate", "status");

-- SessionMetric table optimizations
-- Composite index for session metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SessionMetric_sessionId_metricName_idx" ON "SessionMetric"("sessionId", "metricName");

-- Add comments for documentation
COMMENT ON INDEX "User_teamLeaderId_role_isActive_idx" IS 'Optimizes team leader agent lookups - most common query pattern';
COMMENT ON INDEX "ActionItem_agentId_status_dueDate_idx" IS 'Optimizes agent action item filtering with status and due date sorting';
COMMENT ON INDEX "QuickNote_agentId_isPrivate_category_idx" IS 'Optimizes quick note filtering by agent with privacy and category filters';
COMMENT ON INDEX "CoachingSession_agentId_status_sessionDate_idx" IS 'Optimizes coaching session queries by agent with status and date filtering';
COMMENT ON INDEX "AuditLog_userId_createdAt_action_idx" IS 'Optimizes audit log queries by user with time-based filtering';
COMMENT ON INDEX "Notification_userId_isRead_createdAt_idx" IS 'Optimizes notification queries with read status filtering';