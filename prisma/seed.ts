import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Define enum values manually since we can't import them from client during build
const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER', 
  TEAM_LEADER: 'TEAM_LEADER',
  AGENT: 'AGENT'
} as const;

const SessionStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.sessionMetric.deleteMany();
  await prisma.coachingSession.deleteMany();
  await prisma.agentMetric.deleteMany();
  await prisma.performance.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.teamLeader.deleteMany();
  await prisma.manager.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create admin
  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@company.com',
      hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  // Create manager
  const manager = await prisma.user.create({
    data: {
      name: 'Sarah Johnson',
      email: 'manager@company.com',
      hashedPassword,
      role: UserRole.MANAGER,
      managedBy: admin.id,
    },
  });

  await prisma.manager.create({
    data: {
      userId: manager.id,
      department: 'Customer Service',
    },
  });

  // Create team leaders
  const teamLeader1 = await prisma.user.create({
    data: {
      name: 'Michael Chen',
      email: 'teamleader1@company.com',
      hashedPassword,
      role: UserRole.TEAM_LEADER,
      managedBy: manager.id,
    },
  });

  const teamLeader2 = await prisma.user.create({
    data: {
      name: 'Emily Rodriguez',
      email: 'teamleader2@company.com',
      hashedPassword,
      role: UserRole.TEAM_LEADER,
      managedBy: manager.id,
    },
  });

  await prisma.teamLeader.create({
    data: {
      userId: teamLeader1.id,
      teamName: 'Customer Service Team A',
    },
  });

  await prisma.teamLeader.create({
    data: {
      userId: teamLeader2.id,
      teamName: 'Technical Support Team',
    },
  });

  // Create agents
  const agents = await Promise.all([
    prisma.user.create({
      data: {
        name: 'David Wilson',
        email: 'agent1@company.com',
        hashedPassword,
        role: UserRole.AGENT,
        supervisedBy: teamLeader1.id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Jessica Martinez',
        email: 'agent2@company.com',
        hashedPassword,
        role: UserRole.AGENT,
        supervisedBy: teamLeader1.id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Ryan Thompson',
        email: 'agent3@company.com',
        hashedPassword,
        role: UserRole.AGENT,
        supervisedBy: teamLeader2.id,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sophia Lee',
        email: 'agent4@company.com',
        hashedPassword,
        role: UserRole.AGENT,
        supervisedBy: teamLeader2.id,
      },
    }),
  ]);

  // Create agent profiles with performance metrics
  const agentProfiles = await Promise.all([
    prisma.agent.create({
      data: {
        userId: agents[0].id,
        employeeId: 'EMP001',
        department: 'Customer Service',
        hireDate: new Date('2023-03-15'),
      },
    }),
    prisma.agent.create({
      data: {
        userId: agents[1].id,
        employeeId: 'EMP002',
        department: 'Customer Service',
        hireDate: new Date('2023-06-20'),
      },
    }),
    prisma.agent.create({
      data: {
        userId: agents[2].id,
        employeeId: 'EMP003',
        department: 'Technical Support',
        hireDate: new Date('2023-09-10'),
      },
    }),
    prisma.agent.create({
      data: {
        userId: agents[3].id,
        employeeId: 'EMP004',
        department: 'Technical Support',
        hireDate: new Date('2024-01-05'),
      },
    }),
  ]);

  // Define the 8 KPI metrics
  const kpiMetrics = [
    'communication_skills',
    'problem_resolution',
    'customer_service',
    'process_adherence',
    'product_knowledge',
    'call_handling',
    'customer_satisfaction',
    'resolution_rate',
  ];

  // Create performance data for each agent
  for (const agent of agentProfiles) {
    // Create performance data for the last 3 months
    const periods = ['2024-11', '2024-12', '2025-01'];
    
    for (const period of periods) {
      for (const metric of kpiMetrics) {
        // Generate realistic scores with some variation
        let baseScore = 70 + Math.random() * 20; // Base score between 70-90
        
        // Add some realistic patterns
        if (metric === 'customer_satisfaction' && agent.employeeId === 'EMP002') {
          baseScore = 85 + Math.random() * 10; // Jessica is great with customers
        }
        if (metric === 'product_knowledge' && agent.employeeId === 'EMP003') {
          baseScore = 80 + Math.random() * 15; // Ryan has strong technical knowledge
        }
        
        await prisma.performance.create({
          data: {
            agentId: agent.id,
            metricType: metric,
            score: Math.round(baseScore),
            period: period,
            notes: period === '2025-01' ? 'Current month performance' : null,
          },
        });
      }
    }
  }

  // Create coaching sessions
  const sessions = await Promise.all([
    prisma.coachingSession.create({
      data: {
        agentId: agents[0].id,
        teamLeaderId: teamLeader1.id,
        sessionDate: new Date('2025-01-15'),
        scheduledDate: new Date('2025-01-15'),
        status: SessionStatus.COMPLETED,
        previousScore: 75,
        currentScore: 85,
        preparationNotes: 'Focus on communication skills and call handling',
        sessionNotes: 'Agent showed improvement in active listening and empathy',
        actionItems: JSON.stringify([
          { task: 'Complete advanced communication training', dueDate: '2025-02-15' },
          { task: 'Practice de-escalation techniques', dueDate: '2025-01-30' },
        ]),
        followUpDate: new Date('2025-02-15'),
        duration: 45,
      },
    }),
    prisma.coachingSession.create({
      data: {
        agentId: agents[1].id,
        teamLeaderId: teamLeader1.id,
        sessionDate: new Date('2025-01-20'),
        scheduledDate: new Date('2025-01-20'),
        status: SessionStatus.COMPLETED,
        previousScore: 80,
        currentScore: 88,
        preparationNotes: 'Review customer satisfaction scores and call quality',
        sessionNotes: 'Strong performance, focus on maintaining consistency',
        actionItems: JSON.stringify([
          { task: 'Mentor new team member', dueDate: '2025-02-10' },
          { task: 'Share best practices in team meeting', dueDate: '2025-02-05' },
        ]),
        followUpDate: new Date('2025-02-20'),
        duration: 30,
      },
    }),
    prisma.coachingSession.create({
      data: {
        agentId: agents[2].id,
        teamLeaderId: teamLeader2.id,
        sessionDate: new Date('2025-01-25'),
        scheduledDate: new Date('2025-01-25'),
        status: SessionStatus.SCHEDULED,
        preparationNotes: 'Technical skills assessment and product knowledge review',
        duration: 60,
      },
    }),
  ]);

  // Add session metrics for completed sessions
  for (const session of sessions) {
    if (session.status === SessionStatus.COMPLETED) {
      for (const metric of kpiMetrics) {
        await prisma.sessionMetric.create({
          data: {
            sessionId: session.id,
            metricName: metric,
            score: 70 + Math.round(Math.random() * 25), // Score between 70-95
            comments: `Evaluation for ${metric.replace(/_/g, ' ')} during coaching session`,
          },
        });
      }
    }
  }

  // Create AgentMetric data for scorecards
  console.log('📊 Creating agent metrics for scorecards...');
  
  // We'll skip metrics creation for now to test the main seeding
  // Metrics can be created through the UI once the app is running

  console.log('✅ Database seeded successfully!');
  console.log('👥 Created users:');
  console.log('   - admin@company.com (Admin)');
  console.log('   - manager@company.com (Manager)');
  console.log('   - teamleader1@company.com (Team Leader)');
  console.log('   - teamleader2@company.com (Team Leader)');
  console.log('   - agent1@company.com (Agent)');
  console.log('   - agent2@company.com (Agent)');
  console.log('   - agent3@company.com (Agent)');
  console.log('   - agent4@company.com (Agent)');
  console.log('🔑 All passwords: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });