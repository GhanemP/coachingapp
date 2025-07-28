import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSampleData() {
  try {
    console.log('🌱 Seeding sample performance data...');

    // Get all agents
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' },
      include: { agentProfile: true }
    });

    if (agents.length === 0) {
      console.log('❌ No agents found. Please create some agents first.');
      return;
    }

    console.log(`📊 Found ${agents.length} agents. Creating sample metrics...`);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Generate sample data for the last 6 months
    for (const agent of agents) {
      console.log(`📈 Creating metrics for agent: ${agent.name}`);

      for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
        let targetMonth = currentMonth - monthOffset;
        let targetYear = currentYear;

        // Handle year rollover
        if (targetMonth <= 0) {
          targetMonth += 12;
          targetYear -= 1;
        }

        // Generate realistic performance scores (1-5 scale)
        const basePerformance = 3 + Math.random() * 1.5; // 3.0 to 4.5 base
        const variation = (Math.random() - 0.5) * 0.5; // ±0.25 variation

        const metrics = {
          service: Math.max(1, Math.min(5, basePerformance + variation)),
          productivity: Math.max(1, Math.min(5, basePerformance + (Math.random() - 0.5) * 0.4)),
          quality: Math.max(1, Math.min(5, basePerformance + (Math.random() - 0.5) * 0.3)),
          assiduity: Math.max(1, Math.min(5, basePerformance + (Math.random() - 0.5) * 0.6)),
          performance: Math.max(1, Math.min(5, basePerformance + (Math.random() - 0.5) * 0.4)),
          adherence: Math.max(1, Math.min(5, basePerformance + (Math.random() - 0.5) * 0.5)),
          lateness: Math.max(1, Math.min(5, 4 - (Math.random() * 1.5))), // Lower is better for lateness
          breakExceeds: Math.max(1, Math.min(5, 4 - (Math.random() * 1.5))), // Lower is better for break exceeds
        };

        // Calculate total score and percentage
        const totalScore = (
          metrics.service + metrics.productivity + metrics.quality + metrics.assiduity +
          metrics.performance + metrics.adherence + metrics.lateness + metrics.breakExceeds
        );
        const percentage = (totalScore / 40) * 100; // 40 is max possible score (8 metrics × 5)

        // Check if metric already exists
        const existingMetric = await prisma.agentMetric.findUnique({
          where: {
            agentId_month_year: {
              agentId: agent.id,
              month: targetMonth,
              year: targetYear,
            },
          },
        });

        if (!existingMetric) {
          await prisma.agentMetric.create({
            data: {
              agentId: agent.id,
              month: targetMonth,
              year: targetYear,
              service: parseFloat(metrics.service.toFixed(2)),
              productivity: parseFloat(metrics.productivity.toFixed(2)),
              quality: parseFloat(metrics.quality.toFixed(2)),
              assiduity: parseFloat(metrics.assiduity.toFixed(2)),
              performance: parseFloat(metrics.performance.toFixed(2)),
              adherence: parseFloat(metrics.adherence.toFixed(2)),
              lateness: parseFloat(metrics.lateness.toFixed(2)),
              breakExceeds: parseFloat(metrics.breakExceeds.toFixed(2)),
              totalScore: parseFloat(totalScore.toFixed(2)),
              percentage: parseFloat(percentage.toFixed(2)),
              notes: `Sample performance data for ${new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
            },
          });

          console.log(`  ✅ Created metrics for ${new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - Score: ${percentage.toFixed(1)}%`);
        } else {
          console.log(`  ⏭️  Metrics already exist for ${new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
        }
      }
    }

    console.log('✅ Sample data seeding completed!');
    console.log('📊 You can now view performance scorecards with charts and data.');
    
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedSampleData();