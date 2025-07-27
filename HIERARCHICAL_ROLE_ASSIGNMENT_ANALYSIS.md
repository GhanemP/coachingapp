# Hierarchical Role Assignment System Analysis & Design

## Current System Analysis

### Database Schema ✅
The system already has the necessary database structure for hierarchical relationships:

```sql
-- User table with hierarchical fields
User {
  managedBy: String?           // Points to manager's user ID
  teamLeaderId: String?        // Points to team leader's user ID
  
  // Relations
  manager: User?               // Manager relationship
  managedUsers: User[]         // Users managed by this user
  teamLeader: User?            // Team leader relationship  
  agents: User[]               // Agents managed by this team leader
}
```

### Current User Distribution
- **ADMIN**: 2 users
- **MANAGER**: 3 users  
- **TEAM_LEADER**: 4 users
- **AGENT**: 8 users

### Existing Relationships
Based on the database analysis:
- Some team leaders are assigned to managers (partial setup)
- Hierarchical structure is partially implemented
- Assignment gaps exist (unassigned users)

## Current Admin Interface Assessment

### ✅ What Exists
1. **User Management Page** (`/admin/users`)
   - Lists all users with roles
   - Basic CRUD operations
   - Role filtering and search
   - Permission-based access control

2. **User Edit Page** (`/admin/users/[id]/edit`)
   - Edit user details and roles
   - Password management
   - Delete functionality
   - **Missing**: Hierarchical assignment fields

### ❌ What's Missing
1. **Hierarchical Assignment Interface**
   - No way to assign agents to team leaders
   - No way to assign team leaders to managers
   - No visual hierarchy representation
   - No bulk assignment capabilities

## Proposed Enhancement Design

### 1. Enhanced User Edit Interface

#### Add Hierarchical Assignment Fields
```typescript
// Additional form fields for user edit page
interface HierarchicalAssignments {
  managerId?: string;      // For TEAM_LEADER role
  teamLeaderId?: string;   // For AGENT role
  assignedAgents?: string[]; // For TEAM_LEADER role (multi-select)
  assignedTeamLeaders?: string[]; // For MANAGER role (multi-select)
}
```

#### Role-Specific Assignment Logic
- **AGENT**: Can be assigned to a Team Leader
- **TEAM_LEADER**: Can be assigned to a Manager + can manage multiple Agents
- **MANAGER**: Can manage multiple Team Leaders (and their agents)
- **ADMIN**: Full access to all assignments

### 2. New Hierarchy Management Page

#### Visual Hierarchy Tree (`/admin/hierarchy`)
```
📋 Manager: Sarah Johnson
├── 👨‍💼 Team Leader: Emily Rodriguez
│   ├── 👤 Agent: John Smith
│   ├── 👤 Agent: Maria Garcia
│   └── 👤 Agent: Ahmed Hassan
└── 👨‍💼 Team Leader: David Kim
    ├── 👤 Agent: Jennifer Lee
    └── 👤 Agent: Robert Wilson

⚠️ UNASSIGNED USERS:
├── 👨‍💼 Team Leader: Lisa Chen (No Manager)
└── 👤 Agent: Anna Kowalski (No Team Leader)
```

#### Drag & Drop Assignment Interface
- Visual drag-and-drop for reassignments
- Bulk selection and assignment
- Assignment validation rules
- Real-time hierarchy updates

### 3. Assignment Validation Rules

#### Business Logic Constraints
```typescript
const assignmentRules = {
  // An agent can only have one team leader
  AGENT_TO_TEAM_LEADER: "one-to-one",
  
  // A team leader can have multiple agents
  TEAM_LEADER_TO_AGENTS: "one-to-many",
  
  // A team leader can only have one manager
  TEAM_LEADER_TO_MANAGER: "one-to-one",
  
  // A manager can have multiple team leaders
  MANAGER_TO_TEAM_LEADERS: "one-to-many",
  
  // Prevent circular assignments
  CIRCULAR_ASSIGNMENT: "forbidden",
  
  // Role hierarchy validation
  ROLE_HIERARCHY: "ADMIN > MANAGER > TEAM_LEADER > AGENT"
};
```

## Implementation Plan

### Phase 1: Enhanced User Edit Interface ⭐ Priority

#### 1.1 Update User Edit Form
- Add conditional assignment fields based on user role
- Implement dropdown selectors for managers/team leaders
- Add multi-select for agents (team leaders) and team leaders (managers)

#### 1.2 Update API Endpoints
- Modify `/api/users/[id]` to handle hierarchical assignments
- Add validation for assignment rules
- Update database relationships atomically

#### 1.3 Assignment Fields by Role
```typescript
// For AGENT role
<Select>
  <option value="">No Team Leader</option>
  {teamLeaders.map(tl => (
    <option key={tl.id} value={tl.id}>{tl.name}</option>
  ))}
</Select>

// For TEAM_LEADER role  
<Select>
  <option value="">No Manager</option>
  {managers.map(m => (
    <option key={m.id} value={m.id}>{m.name}</option>
  ))}
</Select>

// Multi-select for agents (when editing team leader)
<MultiSelect>
  {agents.map(agent => (
    <option key={agent.id} value={agent.id}>{agent.name}</option>
  ))}
</MultiSelect>
```

### Phase 2: Hierarchy Management Dashboard

#### 2.1 New Route: `/admin/hierarchy`
- Visual tree representation
- Assignment statistics
- Unassigned users alerts
- Quick assignment actions

#### 2.2 Interactive Features
- Click to expand/collapse branches
- Hover for user details
- Right-click context menus for assignments
- Search and filter capabilities

### Phase 3: Advanced Features

#### 3.1 Bulk Operations
- Bulk assign multiple agents to a team leader
- Bulk transfer agents between team leaders
- Bulk reassign team leaders to different managers

#### 3.2 Assignment History & Audit
- Track assignment changes
- Show assignment history per user
- Audit log for compliance

#### 3.3 Performance Insights
- Team performance by hierarchy
- Manager effectiveness metrics
- Team leader workload distribution

## Database Queries for Implementation

### Get Hierarchical Data
```sql
-- Get complete hierarchy for a manager
SELECT 
  m.id as manager_id, m.name as manager_name,
  tl.id as team_leader_id, tl.name as team_leader_name,
  a.id as agent_id, a.name as agent_name
FROM User m
LEFT JOIN User tl ON tl.managedBy = m.id AND tl.role = 'TEAM_LEADER'
LEFT JOIN User a ON a.teamLeaderId = tl.id AND a.role = 'AGENT'
WHERE m.role = 'MANAGER'
ORDER BY m.name, tl.name, a.name;
```

### Get Unassigned Users
```sql
-- Team leaders without managers
SELECT * FROM User 
WHERE role = 'TEAM_LEADER' AND managedBy IS NULL;

-- Agents without team leaders  
SELECT * FROM User 
WHERE role = 'AGENT' AND teamLeaderId IS NULL;
```

### Assignment Statistics
```sql
-- Manager workload
SELECT 
  m.name as manager_name,
  COUNT(DISTINCT tl.id) as team_leaders_count,
  COUNT(DISTINCT a.id) as total_agents_count
FROM User m
LEFT JOIN User tl ON tl.managedBy = m.id
LEFT JOIN User a ON a.teamLeaderId = tl.id
WHERE m.role = 'MANAGER'
GROUP BY m.id, m.name;
```

## API Endpoints to Create/Modify

### 1. Enhanced User Update
```typescript
// PUT /api/users/[id]
interface UpdateUserRequest {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  // New hierarchical fields
  managedBy?: string | null;
  teamLeaderId?: string | null;
  assignedAgentIds?: string[];
  assignedTeamLeaderIds?: string[];
}
```

### 2. Hierarchy Management
```typescript
// GET /api/admin/hierarchy
interface HierarchyResponse {
  managers: ManagerWithTeams[];
  unassignedTeamLeaders: User[];
  unassignedAgents: User[];
  statistics: HierarchyStats;
}

// POST /api/admin/hierarchy/assign
interface BulkAssignRequest {
  assignments: {
    userId: string;
    assignTo: string;
    assignmentType: 'MANAGER' | 'TEAM_LEADER';
  }[];
}
```

### 3. Assignment Validation
```typescript
// POST /api/admin/hierarchy/validate
interface ValidateAssignmentRequest {
  userId: string;
  assignTo: string;
  assignmentType: string;
}

interface ValidateAssignmentResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

## Security Considerations

### Permission Requirements
- **VIEW_HIERARCHY**: View hierarchical relationships
- **MANAGE_ASSIGNMENTS**: Modify user assignments
- **BULK_ASSIGN**: Perform bulk assignment operations

### Role-Based Restrictions
- **ADMIN**: Full hierarchy management
- **MANAGER**: Can only manage their own team leaders and agents
- **TEAM_LEADER**: Can view their agents, cannot modify assignments
- **AGENT**: Can view their team leader, cannot modify assignments

## Next Steps

1. **Immediate**: Enhance user edit interface with assignment fields
2. **Short-term**: Create hierarchy management dashboard
3. **Medium-term**: Add bulk operations and advanced features
4. **Long-term**: Performance analytics and reporting

This design provides a comprehensive solution for hierarchical role assignment while building on the existing infrastructure and maintaining security best practices.