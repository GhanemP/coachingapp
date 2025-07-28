import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting comprehensive database seeding...')

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 12)
  const userPassword = await bcrypt.hash('password123', 12)

  // Create comprehensive test users
  const testUsers = [
    // Admin user (ghanemp)
    {
      email: 'ghanemp@smartsource.com',
      name: 'Ghanem P',
      hashedPassword: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
    // Managers
    {
      email: 'manager1@smartsource.com',
      name: 'Sarah Johnson',
      hashedPassword: userPassword,
      role: 'MANAGER',
      isActive: true,
    },
    {
      email: 'manager2@smartsource.com',
      name: 'Michael Chen',
      hashedPassword: userPassword,
      role: 'MANAGER',
      isActive: true,
    },
    // Team Leaders
    {
      email: 'teamleader1@smartsource.com',
      name: 'Emily Rodriguez',
      hashedPassword: userPassword,
      role: 'TEAM_LEADER',
      isActive: true,
    },
    {
      email: 'teamleader2@smartsource.com',
      name: 'David Kim',
      hashedPassword: userPassword,
      role: 'TEAM_LEADER',
      isActive: true,
    },
    {
      email: 'teamleader3@smartsource.com',
      name: 'Lisa Thompson',
      hashedPassword: userPassword,
      role: 'TEAM_LEADER',
      isActive: true,
    },
    // Agents
    {
      email: 'agent1@smartsource.com',
      name: 'John Smith',
      hashedPassword: userPassword,
      role: 'AGENT',
      isActive: true,
    },
    {
      email: 'agent2@smartsource.com',
      name: 'Maria Garcia',
      hashedPassword: userPassword,
      role: 'AGENT',
      isActive: true,
    },
    {
      email: 'agent3@smartsource.com',
      name: 'Ahmed Hassan',
      hashedPassword: userPassword,
      role: 'AGENT',
      isActive: true,
    },
    {
      email: 'agent4@smartsource.com',
      name: 'Jennifer Lee',
      hashedPassword: userPassword,
      role: 'AGENT',
      isActive: true,
    },
    {
      email: 'agent5@smartsource.com',
      name: 'Robert Wilson',
      hashedPassword: userPassword,
      role: 'AGENT',
      isActive: true,
    },
    {
      email: 'agent6@smartsource.com',
      name: 'Anna Kowalski',
      hashedPassword: userPassword,
      role: 'AGENT',
      isActive: true,
    },
    // Legacy test users for compatibility
    {
      email: 'admin@example.com',
      name: 'Admin User',
      hashedPassword: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
    {
      email: 'agent@test.com',
      name: 'Test Agent',
      hashedPassword: userPassword,
      role: 'AGENT',
      isActive: true,
    },
    {
      email: 'teamleader@test.com',
      name: 'Test Team Leader',
      hashedPassword: userPassword,
      role: 'TEAM_LEADER',
      isActive: true,
    },
    {
      email: 'manager@test.com',
      name: 'Test Manager',
      hashedPassword: userPassword,
      role: 'MANAGER',
      isActive: true,
    },
  ]

  console.log('👤 Creating users and profiles...')
  
  const createdUsers = []
  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    })
    createdUsers.push(user)
    
    console.log(`✅ Created user: ${user.email} (${user.role})`)

    // Create role-specific profiles
    if (user.role === 'AGENT') {
      await prisma.agent.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          employeeId: `EMP${user.id.slice(-6)}`,
          department: 'Customer Service',
          hireDate: new Date('2023-01-15'),
        },
      })
      console.log(`  📋 Created Agent profile for ${user.email}`)
    }

    if (user.role === 'TEAM_LEADER') {
      await prisma.teamLeader.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          department: 'Customer Service',
        },
      })
      console.log(`  👥 Created Team Leader profile for ${user.email}`)
    }

    if (user.role === 'MANAGER') {
      await prisma.manager.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
        },
      })
      console.log(`  🏢 Created Manager profile for ${user.email}`)
    }
  }

  // Set up management relationships
  console.log('🔗 Setting up management relationships...')
  
  const agents = createdUsers.filter(u => u.role === 'AGENT')
  const teamLeaders = createdUsers.filter(u => u.role === 'TEAM_LEADER')
  const managers = createdUsers.filter(u => u.role === 'MANAGER')

  // Assign agents to team leaders
  for (let i = 0; i < agents.length; i++) {
    const teamLeader = teamLeaders[i % teamLeaders.length]
    await prisma.user.update({
      where: { id: agents[i].id },
      data: { teamLeaderId: teamLeader.id }
    })
    console.log(`  🔗 Assigned ${agents[i].name} to team leader ${teamLeader.name}`)
  }

  // Assign team leaders to managers
  for (let i = 0; i < teamLeaders.length; i++) {
    const manager = managers[i % managers.length]
    await prisma.user.update({
      where: { id: teamLeaders[i].id },
      data: { managedBy: manager.id }
    })
    console.log(`  🔗 Assigned team leader ${teamLeaders[i].name} to manager ${manager.name}`)
  }

  // Create comprehensive permissions
  const permissions = [
    // Dashboard permissions
    { name: 'view_dashboard', description: 'View dashboard', resource: 'dashboard', action: 'read' },
    { name: 'view_admin_dashboard', description: 'View admin dashboard', resource: 'admin_dashboard', action: 'read' },
    
    // User management
    { name: 'manage_users', description: 'Manage users', resource: 'users', action: 'write' },
    { name: 'view_users', description: 'View users', resource: 'users', action: 'read' },
    
    // Agent management
    { name: 'manage_agents', description: 'Manage agents', resource: 'agents', action: 'write' },
    { name: 'view_agents', description: 'View agents', resource: 'agents', action: 'read' },
    
    // Session management
    { name: 'manage_sessions', description: 'Manage coaching sessions', resource: 'sessions', action: 'write' },
    { name: 'view_sessions', description: 'View coaching sessions', resource: 'sessions', action: 'read' },
    { name: 'conduct_sessions', description: 'Conduct coaching sessions', resource: 'sessions', action: 'execute' },
    
    // Reports and analytics
    { name: 'view_reports', description: 'View reports', resource: 'reports', action: 'read' },
    { name: 'generate_reports', description: 'Generate reports', resource: 'reports', action: 'write' },
    { name: 'view_analytics', description: 'View analytics', resource: 'analytics', action: 'read' },
    
    // Scorecards
    { name: 'view_scorecards', description: 'View scorecards', resource: 'scorecards', action: 'read' },
    { name: 'manage_scorecards', description: 'Manage scorecards', resource: 'scorecards', action: 'write' },
    
    // Action items and plans
    { name: 'manage_action_items', description: 'Manage action items', resource: 'action_items', action: 'write' },
    { name: 'view_action_items', description: 'View action items', resource: 'action_items', action: 'read' },
    
    // Quick notes
    { name: 'manage_quick_notes', description: 'Manage quick notes', resource: 'quick_notes', action: 'write' },
    { name: 'view_quick_notes', description: 'View quick notes', resource: 'quick_notes', action: 'read' },
    
    // System administration
    { name: 'system_admin', description: 'System administration', resource: 'system', action: 'admin' },
    { name: 'manage_permissions', description: 'Manage permissions', resource: 'permissions', action: 'write' },
  ]

  console.log('🔐 Creating permissions...')
  const createdPermissions = []
  for (const permData of permissions) {
    const permission = await prisma.permission.upsert({
      where: { name: permData.name },
      update: {},
      create: permData,
    })
    createdPermissions.push(permission)
    console.log(`✅ Created permission: ${permission.name}`)
  }

  // Create coaching sessions
  console.log('📚 Creating coaching sessions...')
  const sessionStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  
  for (let i = 0; i < 20; i++) {
    const agent = agents[i % agents.length]
    const teamLeader = teamLeaders[i % teamLeaders.length]
    const sessionDate = new Date()
    sessionDate.setDate(sessionDate.getDate() - Math.floor(Math.random() * 30))
    
    const _session = await prisma.coachingSession.create({
      data: {
        agentId: agent.id,
        teamLeaderId: teamLeader.id,
        sessionDate: sessionDate,
        scheduledDate: sessionDate,
        duration: 30 + Math.floor(Math.random() * 60), // 30-90 minutes
        status: sessionStatuses[i % sessionStatuses.length],
        sessionNotes: `Coaching session notes for ${agent.name}. Discussed performance metrics and improvement areas.`,
        preparationNotes: `Preparation notes for coaching session with ${agent.name}.`,
        actionItems: `Action items: Improve customer satisfaction scores and reduce call handling time.`,
        previousScore: Math.random() * 100,
        currentScore: Math.random() * 100,
      }
    })
    
    if (i % 5 === 0) {
      console.log(`✅ Created coaching session for ${agent.name}`)
    }
  }

  // Create action plans
  console.log('📋 Creating action plans...')
  for (let i = 0; i < 10; i++) {
    const agent = agents[i % agents.length]
    const teamLeader = teamLeaders[i % teamLeaders.length]
    const startDate = new Date()
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    
    const actionPlan = await prisma.actionPlan.create({
      data: {
        agentId: agent.id,
        createdBy: teamLeader.id,
        title: `Performance Improvement Plan - ${agent.name}`,
        description: `Comprehensive action plan to improve performance metrics and customer satisfaction.`,
        startDate: startDate,
        endDate: endDate,
        status: ['DRAFT', 'ACTIVE', 'COMPLETED'][i % 3],
      }
    })

    // Create action plan items for each plan
    const actionItemTitles = [
      'Complete customer service training module',
      'Practice active listening techniques',
      'Review product knowledge materials'
    ]

    for (let j = 0; j < 3; j++) {
      await prisma.actionPlanItem.create({
        data: {
          actionPlanId: actionPlan.id,
          title: actionItemTitles[j % actionItemTitles.length],
          description: `Detailed description for ${actionItemTitles[j % actionItemTitles.length]}`,
          targetMetric: 'Customer Satisfaction Score',
          targetValue: 85.0,
          currentValue: 70.0 + Math.random() * 15,
          dueDate: new Date(Date.now() + (j + 1) * 7 * 24 * 60 * 60 * 1000), // Weekly intervals
          status: ['PENDING', 'IN_PROGRESS', 'COMPLETED'][j % 3],
        }
      })
    }

    if (i % 3 === 0) {
      console.log(`✅ Created action plan: ${actionPlan.title}`)
    }
  }

  // Create action items (standalone)
  console.log('📝 Creating standalone action items...')
  for (let i = 0; i < 15; i++) {
    const agent = agents[i % agents.length]
    const teamLeader = teamLeaders[i % teamLeaders.length]
    
    await prisma.actionItem.create({
      data: {
        agentId: agent.id,
        title: `Action Item ${i + 1} for ${agent.name}`,
        description: `Detailed description for action item ${i + 1}`,
        priority: ['LOW', 'MEDIUM', 'HIGH'][i % 3],
        status: ['PENDING', 'IN_PROGRESS', 'COMPLETED'][i % 3],
        dueDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000), // Daily intervals
        createdBy: teamLeader.id,
        assignedTo: agent.id,
      }
    })

    if (i % 5 === 0) {
      console.log(`✅ Created action items batch ${Math.floor(i / 5) + 1}`)
    }
  }

  // Create quick notes
  console.log('📝 Creating quick notes...')
  const noteCategories = ['PERFORMANCE', 'BEHAVIOR', 'TRAINING', 'OTHER']
  
  for (let i = 0; i < 25; i++) {
    const agent = agents[i % agents.length]
    const author = [...teamLeaders, ...managers][i % (teamLeaders.length + managers.length)]
    
    await prisma.quickNote.create({
      data: {
        agentId: agent.id,
        authorId: author.id,
        category: noteCategories[i % noteCategories.length],
        content: `Quick note about ${agent.name}: ${i % 2 === 0 ? 'Positive feedback' : 'Area for improvement'} regarding recent performance.`,
        isPrivate: i % 3 === 0,
      }
    })

    if (i % 10 === 0) {
      console.log(`✅ Created quick note for ${agent.name}`)
    }
  }

  // Create agent metrics with new scorecard structure
  console.log('📊 Creating agent metrics with NEW scorecard structure...')
  for (const agent of agents) {
    for (let month = 1; month <= 6; month++) {
      const year = 2024
      
      // Generate realistic raw data
      const workingDays = 20 + Math.floor(Math.random() * 5); // 20-25 working days
      const basePerformance = 0.75 + Math.random() * 0.2; // 75-95% base performance
      
      // Raw data
      const scheduledHours = workingDays * 8;
      const actualHours = scheduledHours * (basePerformance + (Math.random() - 0.5) * 0.1);
      const scheduledDays = workingDays;
      const daysPresent = Math.floor(scheduledDays * (0.9 + Math.random() * 0.1));
      const totalShifts = daysPresent;
      const onTimeArrivals = Math.floor(totalShifts * (0.8 + Math.random() * 0.2));
      const totalBreaks = daysPresent * 2;
      const breaksWithinLimit = Math.floor(totalBreaks * (0.85 + Math.random() * 0.15));
      const tasksAssigned = Math.floor(workingDays * (8 + Math.random() * 4));
      const tasksCompleted = Math.floor(tasksAssigned * (basePerformance + (Math.random() - 0.5) * 0.1));
      const expectedOutput = tasksCompleted * (80 + Math.random() * 40);
      const actualOutput = Math.floor(expectedOutput * (basePerformance + (Math.random() - 0.5) * 0.1));
      const totalTasks = tasksCompleted;
      const errorFreeTasks = Math.floor(totalTasks * (0.9 + Math.random() * 0.1));
      const standardTime = tasksCompleted * (30 + Math.random() * 30);
      const actualTimeSpent = standardTime / (basePerformance + (Math.random() - 0.5) * 0.1);
      
      // Calculate percentages
      const scheduleAdherence = Math.min(100, Math.max(0, (actualHours / scheduledHours) * 100));
      const attendanceRate = Math.min(100, Math.max(0, (daysPresent / scheduledDays) * 100));
      const punctualityScore = Math.min(100, Math.max(0, (onTimeArrivals / totalShifts) * 100));
      const breakCompliance = Math.min(100, Math.max(0, (breaksWithinLimit / totalBreaks) * 100));
      const taskCompletionRate = Math.min(100, Math.max(0, (tasksCompleted / tasksAssigned) * 100));
      const productivityIndex = Math.min(100, Math.max(0, (actualOutput / expectedOutput) * 100));
      const qualityScore = Math.min(100, Math.max(0, (errorFreeTasks / totalTasks) * 100));
      const efficiencyRate = Math.min(100, Math.max(0, (standardTime / actualTimeSpent) * 100));
      
      // Calculate weighted total score
      const weights = {
        scheduleAdherence: 1.0,
        attendanceRate: 0.5,
        punctualityScore: 0.5,
        breakCompliance: 0.5,
        taskCompletionRate: 1.5,
        productivityIndex: 1.5,
        qualityScore: 1.5,
        efficiencyRate: 1.0,
      };
      
      const totalWeightedScore =
        scheduleAdherence * weights.scheduleAdherence +
        attendanceRate * weights.attendanceRate +
        punctualityScore * weights.punctualityScore +
        breakCompliance * weights.breakCompliance +
        taskCompletionRate * weights.taskCompletionRate +
        productivityIndex * weights.productivityIndex +
        qualityScore * weights.qualityScore +
        efficiencyRate * weights.efficiencyRate;
      
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      const totalScore = totalWeightedScore / totalWeight;
      
      await prisma.agentMetric.upsert({
        where: {
          agentId_month_year: {
            agentId: agent.id,
            month: month,
            year: year
          }
        },
        update: {},
        create: {
          agentId: agent.id,
          month: month,
          year: year,
          
          // New scorecard metrics
          scheduleAdherence: Math.round(scheduleAdherence * 100) / 100,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
          punctualityScore: Math.round(punctualityScore * 100) / 100,
          breakCompliance: Math.round(breakCompliance * 100) / 100,
          taskCompletionRate: Math.round(taskCompletionRate * 100) / 100,
          productivityIndex: Math.round(productivityIndex * 100) / 100,
          qualityScore: Math.round(qualityScore * 100) / 100,
          efficiencyRate: Math.round(efficiencyRate * 100) / 100,
          
          // Raw data
          scheduledHours: Math.round(scheduledHours * 100) / 100,
          actualHours: Math.round(actualHours * 100) / 100,
          scheduledDays,
          daysPresent,
          totalShifts,
          onTimeArrivals,
          totalBreaks,
          breaksWithinLimit,
          tasksAssigned,
          tasksCompleted,
          expectedOutput: Math.round(expectedOutput),
          actualOutput: Math.round(actualOutput),
          totalTasks,
          errorFreeTasks,
          standardTime: Math.round(standardTime * 100) / 100,
          actualTimeSpent: Math.round(actualTimeSpent * 100) / 100,
          
          // New weights
          scheduleAdherenceWeight: weights.scheduleAdherence,
          attendanceRateWeight: weights.attendanceRate,
          punctualityScoreWeight: weights.punctualityScore,
          breakComplianceWeight: weights.breakCompliance,
          taskCompletionRateWeight: weights.taskCompletionRate,
          productivityIndexWeight: weights.productivityIndex,
          qualityScoreWeight: weights.qualityScore,
          efficiencyRateWeight: weights.efficiencyRate,
          
          // Legacy fields (for backward compatibility)
          service: 70 + Math.random() * 30,
          productivity: 75 + Math.random() * 25,
          quality: 80 + Math.random() * 20,
          assiduity: 85 + Math.random() * 15,
          performance: 78 + Math.random() * 22,
          adherence: 82 + Math.random() * 18,
          lateness: Math.random() * 10,
          breakExceeds: Math.random() * 15,
          serviceWeight: 1.0,
          productivityWeight: 1.0,
          qualityWeight: 1.0,
          assiduityWeight: 1.0,
          performanceWeight: 1.0,
          adherenceWeight: 1.0,
          latenessWeight: 1.0,
          breakExceedsWeight: 1.0,
          
          totalScore: Math.round(totalScore * 100) / 100,
          percentage: Math.round(totalScore * 100) / 100,
          notes: `NEW scorecard performance data for ${agent.name} - ${month}/${year}`,
        }
      })
    }
    console.log(`✅ Created NEW scorecard agent metrics for ${agent.name}`)
  }

  // Create performance records
  console.log('📈 Creating performance records...')
  const metricTypes = [
    'Customer Satisfaction Score',
    'Average Handle Time',
    'First Call Resolution',
    'Quality Score',
    'Attendance Rate',
    'Sales Conversion',
    'Upselling Success',
    'Compliance Score'
  ]

  for (const agent of agents) {
    for (let month = 1; month <= 6; month++) {
      for (const metricType of metricTypes) {
        const baseValue = Math.random() * 100
        const value = Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * 20))
        
        await prisma.performance.upsert({
          where: {
            agentId_metricType_period: {
              agentId: agent.id,
              metricType,
              period: `2024-${month.toString().padStart(2, '0')}`,
            }
          },
          update: {},
          create: {
            agentId: agent.id,
            metricType,
            score: parseFloat(value.toFixed(2)),
            target: 85.0,
            period: `2024-${month.toString().padStart(2, '0')}`,
          }
        })
      }
    }
    console.log(`✅ Created performance records for ${agent.name}`)
  }

  // Create notifications
  console.log('🔔 Creating notifications...')
  const notificationTypes = ['session_reminder', 'action_item_due', 'performance_alert', 'system_update']
  const notificationMessages = [
    'You have a coaching session scheduled for tomorrow',
    'Action item is due in 2 days',
    'Performance metrics need attention',
    'System maintenance scheduled for this weekend'
  ]

  for (let i = 0; i < 30; i++) {
    const user = createdUsers[i % createdUsers.length]
    
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: notificationTypes[i % notificationTypes.length],
        title: `Notification ${i + 1}`,
        message: notificationMessages[i % notificationMessages.length],
        isRead: i % 3 === 0,
      }
    })

    if (i % 10 === 0) {
      console.log(`✅ Created notifications batch ${Math.floor(i / 10) + 1}`)
    }
  }

  // Create role permissions
  console.log('🔐 Setting up role permissions...')
  
  const rolePermissions = {
    ADMIN: [
      'view_dashboard', 'view_admin_dashboard', 'manage_users', 'view_users',
      'manage_agents', 'view_agents', 'manage_sessions', 'view_sessions', 'conduct_sessions',
      'view_reports', 'generate_reports', 'view_analytics', 'view_scorecards', 'manage_scorecards',
      'manage_action_items', 'view_action_items', 'manage_quick_notes', 'view_quick_notes',
      'system_admin', 'manage_permissions'
    ],
    MANAGER: [
      'view_dashboard', 'view_users', 'manage_agents', 'view_agents', 'manage_sessions',
      'view_sessions', 'conduct_sessions', 'view_reports', 'generate_reports', 'view_analytics',
      'view_scorecards', 'manage_scorecards', 'manage_action_items', 'view_action_items',
      'manage_quick_notes', 'view_quick_notes'
    ],
    TEAM_LEADER: [
      'view_dashboard', 'view_agents', 'manage_sessions', 'view_sessions', 'conduct_sessions',
      'view_reports', 'view_analytics', 'view_scorecards', 'manage_scorecards',
      'manage_action_items', 'view_action_items', 'manage_quick_notes', 'view_quick_notes'
    ],
    AGENT: [
      'view_dashboard', 'view_sessions', 'view_action_items', 'view_quick_notes', 'view_scorecards'
    ]
  }

  const permissionMap = new Map(createdPermissions.map(p => [p.name, p.id]))

  for (const [role, permissionNames] of Object.entries(rolePermissions)) {
    console.log(`  Setting up permissions for ${role}...`)
    
    for (const permissionName of permissionNames) {
      const permissionId = permissionMap.get(permissionName)
      
      if (!permissionId) {
        console.log(`    ❌ Permission not found: ${permissionName}`)
        continue
      }

      try {
        await prisma.rolePermission.upsert({
          where: {
            role_permissionId: {
              role,
              permissionId,
            }
          },
          update: {},
          create: {
            role,
            permissionId,
          }
        })
      } catch (error) {
        console.log(`    ❌ Failed to assign ${permissionName}: ${error}`)
      }
    }
    console.log(`  ✅ Completed permissions for ${role}`)
  }

  console.log('🎉 Comprehensive database seeding completed successfully!')
  console.log('\n📋 User Credentials:')
  console.log('🔑 ADMIN: ghanemp@smartsource.com / admin123')
  console.log('🔑 ADMIN: admin@example.com / admin123')
  console.log('👥 MANAGERS:')
  console.log('   - manager1@smartsource.com / password123')
  console.log('   - manager2@smartsource.com / password123')
  console.log('   - manager@test.com / password123')
  console.log('👨‍💼 TEAM LEADERS:')
  console.log('   - teamleader1@smartsource.com / password123')
  console.log('   - teamleader2@smartsource.com / password123')
  console.log('   - teamleader3@smartsource.com / password123')
  console.log('   - teamleader@test.com / password123')
  console.log('👤 AGENTS:')
  console.log('   - agent1@smartsource.com / password123')
  console.log('   - agent2@smartsource.com / password123')
  console.log('   - agent3@smartsource.com / password123')
  console.log('   - agent4@smartsource.com / password123')
  console.log('   - agent5@smartsource.com / password123')
  console.log('   - agent6@smartsource.com / password123')
  console.log('   - agent@test.com / password123')
  console.log('\n📊 Created:')
  console.log(`   - ${createdUsers.length} users with role-specific profiles`)
  console.log(`   - ${createdPermissions.length} permissions`)
  console.log('   - Role permissions for all user roles')
  console.log('   - 20 coaching sessions')
  console.log('   - 10 action plans with 30 action plan items')
  console.log('   - 15 standalone action items')
  console.log('   - 25 quick notes')
  console.log(`   - ${agents.length * 6} agent metrics records`)
  console.log(`   - ${agents.length * 6 * metricTypes.length} performance records`)
  console.log('   - 30 notifications')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })