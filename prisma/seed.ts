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
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Create metrics for each agent for the last 3 months
  for (let agentIndex = 0; agentIndex < agents.length; agentIndex++) {
    const agent = agents[agentIndex];
    
    for (let i = 2; i >= 0; i--) {
      let month = currentMonth - i;
      let year = currentYear;
      
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      
      // Generate realistic performance scores based on agent index for consistency
      const baseScore = 3 + (agentIndex * 0.5); // Agent 1: ~3, Agent 2: ~3.5, etc.
      const variation = (Math.random() - 0.5) * 0.5; // Small random variation
      
      const metrics = {
        service: Math.max(1, Math.min(5, Math.round(baseScore + variation))),
        productivity: Math.max(1, Math.min(5, Math.round(baseScore + 0.2 + variation))),
        quality: Math.max(1, Math.min(5, Math.round(baseScore - 0.1 + variation))),
        assiduity: Math.max(1, Math.min(5, Math.round(baseScore + 0.3 + variation))),
        performance: Math.max(1, Math.min(5, Math.round(baseScore + 0.1 + variation))),
        adherence: Math.max(1, Math.min(5, Math.round(baseScore + 0.4 + variation))),
        lateness: Math.max(1, Math.min(5, Math.round(baseScore + variation))),
        breakExceeds: Math.max(1, Math.min(5, Math.round(baseScore + 0.2 + variation))),
      };
      
      // Calculate weights and scores
      const weights = {
        serviceWeight: 1.0,
        productivityWeight: 1.0,
        qualityWeight: 1.0,
        assiduityWeight: 1.0,
        performanceWeight: 1.0,
        adherenceWeight: 1.0,
        latenessWeight: 1.0,
        breakExceedsWeight: 1.0,
      };
      
      const totalScore =
        metrics.service * weights.serviceWeight +
        metrics.productivity * weights.productivityWeight +
        metrics.quality * weights.qualityWeight +
        metrics.assiduity * weights.assiduityWeight +
        metrics.performance * weights.performanceWeight +
        metrics.adherence * weights.adherenceWeight +
        metrics.lateness * weights.latenessWeight +
        metrics.breakExceeds * weights.breakExceedsWeight;
      
      const maxPossibleScore = 5 * 8; // 5 points * 8 metrics
      const percentage = (totalScore / maxPossibleScore) * 100;
      
      try {
        await prisma.agentMetric.create({
          data: {
            agentId: agent.id,
            month,
            year,
            ...metrics,
            ...weights,
            totalScore,
            percentage: Number(percentage.toFixed(2)),
            notes: i === 0 ? 'Current month performance metrics' : null,
          },
        });
      } catch (error) {
        console.error(`Error creating metrics for agent ${agent.name}:`, error);
      }
    }
  }

  // Create coaching sessions
  console.log('🎯 Creating coaching sessions...');
  
  const teamLeaderIds = [teamLeader1.id, teamLeader2.id];
  const sessionStatuses = [SessionStatus.SCHEDULED, SessionStatus.COMPLETED, SessionStatus.IN_PROGRESS];
  
  // Create sessions for each agent
  for (let agentIndex = 0; agentIndex < agents.length; agentIndex++) {
    const agent = agents[agentIndex];
    const teamLeaderId = teamLeaderIds[agentIndex % 2]; // Alternate between team leaders
    
    // Create 2-3 sessions per agent
    const sessionCount = 2 + Math.floor(Math.random() * 2);
    
    for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex++) {
      const daysAgo = sessionIndex * 14 + Math.floor(Math.random() * 7); // Sessions 2 weeks apart
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - daysAgo);
      
      const scheduledDate = new Date(sessionDate);
      if (sessionIndex === 0) {
        // First session is upcoming
        scheduledDate.setDate(scheduledDate.getDate() + 7);
      }
      
      const status = sessionIndex === 0 ? SessionStatus.SCHEDULED : 
                    sessionIndex === 1 ? SessionStatus.COMPLETED : 
                    sessionStatuses[Math.floor(Math.random() * sessionStatuses.length)];
      
      const preparationNotes = JSON.stringify({
        title: `Performance Review - ${agent.name}`,
        objectives: [
          'Review current performance metrics',
          'Identify areas for improvement',
          'Set goals for next period'
        ],
        focusAreas: ['communication_skills', 'customer_service'],
        actionItems: [
          'Complete customer service training module',
          'Practice active listening techniques',
          'Review call handling procedures'
        ],
        notes: `Session focused on improving customer interaction skills and overall performance.`
      });
      
      try {
        const session = await prisma.coachingSession.create({
          data: {
            agentId: agent.id,
            teamLeaderId: teamLeaderId,
            sessionDate: status === SessionStatus.COMPLETED ? sessionDate : scheduledDate,
            scheduledDate: scheduledDate,
            status: status,
            previousScore: sessionIndex > 0 ? 75 + Math.floor(Math.random() * 15) : null,
            currentScore: status === SessionStatus.COMPLETED ? 80 + Math.floor(Math.random() * 15) : null,
            preparationNotes: preparationNotes,
            sessionNotes: status === SessionStatus.COMPLETED ? 
              'Agent showed good understanding of feedback. Improvement noted in communication skills.' : null,
            actionItems: status === SessionStatus.COMPLETED ? 
              'Follow up on training completion, schedule next review in 2 weeks' : null,
            followUpDate: status === SessionStatus.COMPLETED ? 
              new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null, // 2 weeks from now
            duration: 60,
          },
        });

        // Create session metrics for completed sessions
        if (status === SessionStatus.COMPLETED) {
          const sessionMetrics = [
            'communication_skills',
            'problem_resolution', 
            'customer_service',
            'process_adherence',
            'product_knowledge'
          ];
          
          for (const metric of sessionMetrics) {
            await prisma.sessionMetric.create({
              data: {
                sessionId: session.id,
                metricName: metric,
                score: 70 + Math.floor(Math.random() * 25), // Score between 70-95
                comments: `Good progress in ${metric.replace(/_/g, ' ')}. Continue focusing on practical application.`,
              },
            });
          }
        }
      } catch (error) {
        console.error(`Error creating session for agent ${agent.name}:`, error);
      }
    }
  }

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
  console.log('📊 Created 3 months of metrics for each agent');
  console.log('🎯 Created 2-3 coaching sessions per agent');
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