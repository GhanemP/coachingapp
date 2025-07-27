-- Add performance indexes for frequently queried combinations
-- SQLite compatible syntax (no IF NOT EXISTS for CREATE INDEX)

-- AgentMetric indexes for scorecard queries
CREATE INDEX "AgentMetric_agentId_year_month_idx" ON "AgentMetric"("agentId", "year", "month");
CREATE INDEX "AgentMetric_year_month_idx" ON "AgentMetric"("year", "month");

-- QuickNote indexes for filtering and pagination
CREATE INDEX "QuickNote_agentId_category_createdAt_idx" ON "QuickNote"("agentId", "category", "createdAt");
CREATE INDEX "QuickNote_authorId_createdAt_idx" ON "QuickNote"("authorId", "createdAt");

-- ActionItem indexes for status and due date queries
CREATE INDEX "ActionItem_agentId_status_dueDate_idx" ON "ActionItem"("agentId", "status", "dueDate");
CREATE INDEX "ActionItem_assignedTo_status_dueDate_idx" ON "ActionItem"("assignedTo", "status", "dueDate");

-- ActionPlan indexes for agent and status queries
CREATE INDEX "ActionPlan_agentId_status_startDate_idx" ON "ActionPlan"("agentId", "status", "startDate");

-- CoachingSession indexes for scheduling and status
CREATE INDEX "CoachingSession_agentId_scheduledDate_status_idx" ON "CoachingSession"("agentId", "scheduledDate", "status");
CREATE INDEX "CoachingSession_teamLeaderId_scheduledDate_status_idx" ON "CoachingSession"("teamLeaderId", "scheduledDate", "status");

-- User indexes for role-based queries
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- RolePermission index for permission checks
CREATE INDEX "RolePermission_role_permissionId_idx" ON "RolePermission"("role", "permissionId");

-- Notification indexes for user queries
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- AuditLog indexes for tracking and reporting
CREATE INDEX "AuditLog_userId_action_createdAt_idx" ON "AuditLog"("userId", "action", "createdAt");
CREATE INDEX "AuditLog_resource_resourceId_createdAt_idx" ON "AuditLog"("resource", "resourceId", "createdAt");