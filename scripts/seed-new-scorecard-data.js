import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Import calculation functions (simplified versions for Node.js)
function calculateScheduleAdherence(actualHours, scheduledHours) {
  if (scheduledHours <= 0) {return 0;}
  return Math.min(100, Math.max(0, (actualHours / scheduledHours) * 100));
}

function calculateAttendanceRate(daysPresent, scheduledDays) {
  if (scheduledDays <= 0) {return 0;}
  return Math.min(100, Math.max(0, (daysPresent / scheduledDays) * 100));
}

function calculatePunctualityScore(onTimeArrivals, totalShifts) {
  if (totalShifts <= 0) {return 0;}
  return Math.min(100, Math.max(0, (onTimeArrivals / totalShifts) * 100));
}

function calculateBreakCompliance(breaksWithinLimit, totalBreaks) {
  if (totalBreaks <= 0) {return 100;}
  return Math.min(100, Math.max(0, (breaksWithinLimit / totalBreaks) * 100));
}

function calculateTaskCompletionRate(tasksCompleted, tasksAssigned) {
  if (tasksAssigned <= 0) {return 0;}
  return Math.min(100, Math.max(0, (tasksCompleted / tasksAssigned) * 100));
}

function calculateProductivityIndex(actualOutput, expectedOutput) {
  if (expectedOutput <= 0) {return 0;}
  return Math.min(100, Math.max(0, (actualOutput / expectedOutput) * 100));
}

function calculateQualityScore(errorFreeTasks, totalTasks) {
  if (totalTasks <= 0) {return 0;}
  return Math.min(100, Math.max(0, (errorFreeTasks / totalTasks) * 100));
}

function calculateEfficiencyRate(standardTime, actualTimeSpent) {
  if (actualTimeSpent <= 0) {return 0;}
  return Math.min(100, Math.max(0, (standardTime / actualTimeSpent) * 100));
}

function calculateNewScorecardTotalScore(metrics) {
  const weights = {
    scheduleAdherenceWeight: 1.0,
    attendanceRateWeight: 0.5,
    punctualityScoreWeight: 0.5,
    breakComplianceWeight: 0.5,
    taskCompletionRateWeight: 1.5,
    productivityIndexWeight: 1.5,
    qualityScoreWeight: 1.5,
    efficiencyRateWeight: 1.0,
  };

  const weightedMetrics = [
    { score: metrics.scheduleAdherence, weight: weights.scheduleAdherenceWeight },
    { score: metrics.attendanceRate, weight: weights.attendanceRateWeight },
    { score: metrics.punctualityScore, weight: weights.punctualityScoreWeight },
    { score: metrics.breakCompliance, weight: weights.breakComplianceWeight },
    { score: metrics.taskCompletionRate, weight: weights.taskCompletionRateWeight },
    { score: metrics.productivityIndex, weight: weights.productivityIndexWeight },
    { score: metrics.qualityScore, weight: weights.qualityScoreWeight },
    { score: metrics.efficiencyRate, weight: weights.efficiencyRateWeight },
  ];

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const metric of weightedMetrics) {
    const validScore = Math.min(100, Math.max(0, metric.score));
    const weight = Math.max(0, metric.weight || 0);
    
    totalWeightedScore += validScore * weight;
    totalWeight += weight;
  }

  const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  
  return {
    totalScore: Math.round(averageScore * 100) / 100,
    percentage: Math.round(averageScore * 100) / 100,
  };
}

async function seedNewScorecardData() {
  try {
    console.log('🌱 Seeding NEW scorecard sample data...');

    // Get all agents from the database
    const agents = await prisma.user.findMany({
      where: {
        role: 'AGENT'
      },
      include: {
        agentProfile: true
      }
    });

    if (agents.length === 0) {
      console.log('❌ No agents found in the database. Please create some agents first.');
      return;
    }

    console.log(`📊 Found ${agents.length} agents. Generating NEW scorecard performance data...`);

    // Generate 6 months of historical data
    const currentDate = new Date();
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        month: date.getMonth() + 1,
        year: date.getFullYear()
      });
    }

    let totalRecords = 0;

    for (const agent of agents) {
      console.log(`👤 Generating NEW scorecard data for ${agent.name} (${agent.agentProfile?.employeeId || 'No ID'})...`);
      
      for (const { month, year } of months) {
        // Check if data already exists
        const existingMetric = await prisma.agentMetric.findUnique({
          where: {
            agentId_month_year: {
              agentId: agent.id,
              month,
              year
            }
          }
        });

        if (existingMetric) {
          console.log(`  ⏭️  Skipping ${month}/${year} - data already exists`);
          continue;
        }

        // Generate realistic raw data for the month
        const daysInMonth = new Date(year, month, 0).getDate();
        const workingDays = Math.floor(daysInMonth * 0.7); // ~70% working days
        
        // Generate base performance level (70-95% range)
        const basePerformance = 0.7 + Math.random() * 0.25;
        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        
        // Time & Attendance raw data
        const scheduledHours = workingDays * 8; // 8 hours per day
        const actualHours = scheduledHours * (basePerformance + variation + (Math.random() - 0.5) * 0.05);
        const scheduledDays = workingDays;
        const daysPresent = Math.floor(scheduledDays * (0.9 + Math.random() * 0.1)); // 90-100% attendance
        const totalShifts = daysPresent;
        const onTimeArrivals = Math.floor(totalShifts * (0.8 + Math.random() * 0.2)); // 80-100% punctuality
        const totalBreaks = daysPresent * 2; // 2 breaks per day
        const breaksWithinLimit = Math.floor(totalBreaks * (0.85 + Math.random() * 0.15)); // 85-100% compliance
        
        // Performance & Productivity raw data
        const tasksAssigned = Math.floor(workingDays * (8 + Math.random() * 4)); // 8-12 tasks per day
        const tasksCompleted = Math.floor(tasksAssigned * (basePerformance + variation + (Math.random() - 0.5) * 0.1));
        const expectedOutput = tasksCompleted * (80 + Math.random() * 40); // Expected units per task
        const actualOutput = Math.floor(expectedOutput * (basePerformance + variation + (Math.random() - 0.5) * 0.1));
        const totalTasks = tasksCompleted;
        const errorRate = 0.02 + Math.random() * 0.08; // 2-10% error rate
        const errorFreeTasks = Math.floor(totalTasks * (1 - errorRate));
        const standardTime = tasksCompleted * (30 + Math.random() * 30); // 30-60 minutes per task
        const actualTimeSpent = standardTime / (basePerformance + variation + (Math.random() - 0.5) * 0.1);

        // Calculate metrics from raw data
        const scheduleAdherence = calculateScheduleAdherence(actualHours, scheduledHours);
        const attendanceRate = calculateAttendanceRate(daysPresent, scheduledDays);
        const punctualityScore = calculatePunctualityScore(onTimeArrivals, totalShifts);
        const breakCompliance = calculateBreakCompliance(breaksWithinLimit, totalBreaks);
        const taskCompletionRate = calculateTaskCompletionRate(tasksCompleted, tasksAssigned);
        const productivityIndex = calculateProductivityIndex(actualOutput, expectedOutput);
        const qualityScore = calculateQualityScore(errorFreeTasks, totalTasks);
        const efficiencyRate = calculateEfficiencyRate(standardTime, actualTimeSpent);

        const calculatedMetrics = {
          scheduleAdherence,
          attendanceRate,
          punctualityScore,
          breakCompliance,
          taskCompletionRate,
          productivityIndex,
          qualityScore,
          efficiencyRate,
        };

        // Calculate total score
        const { totalScore, percentage } = calculateNewScorecardTotalScore(calculatedMetrics);

        // Generate some notes occasionally
        const notes = Math.random() > 0.7 ? [
          'Excellent performance across all new metrics. Strong schedule adherence and task completion.',
          'Outstanding productivity index and quality scores. Keep up the great work!',
          'Minor improvements needed in punctuality, but overall solid performance.',
          'Exceptional efficiency rate and break compliance this month.',
          'Quality metrics exceeded expectations with minimal errors.',
          'Consistent high performance in attendance and task completion.',
          'Some challenges with schedule adherence, addressed in coaching session.',
          'Remarkable improvement in productivity index and efficiency this month.'
        ][Math.floor(Math.random() * 8)] : null;

        // Create the metric record with new structure
        await prisma.agentMetric.create({
          data: {
            agentId: agent.id,
            month,
            year,
            
            // New scorecard metrics (percentages)
            scheduleAdherence: Math.round(scheduleAdherence * 100) / 100,
            attendanceRate: Math.round(attendanceRate * 100) / 100,
            punctualityScore: Math.round(punctualityScore * 100) / 100,
            breakCompliance: Math.round(breakCompliance * 100) / 100,
            taskCompletionRate: Math.round(taskCompletionRate * 100) / 100,
            productivityIndex: Math.round(productivityIndex * 100) / 100,
            qualityScore: Math.round(qualityScore * 100) / 100,
            efficiencyRate: Math.round(efficiencyRate * 100) / 100,
            
            // Raw data fields
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
            scheduleAdherenceWeight: 1.0,
            attendanceRateWeight: 0.5,
            punctualityScoreWeight: 0.5,
            breakComplianceWeight: 0.5,
            taskCompletionRateWeight: 1.5,
            productivityIndexWeight: 1.5,
            qualityScoreWeight: 1.5,
            efficiencyRateWeight: 1.0,
            
            totalScore: Math.round(totalScore * 100) / 100,
            percentage: Math.round(percentage * 100) / 100,
            notes
          }
        });

        totalRecords++;
        console.log(`  ✅ Created NEW scorecard metric for ${month}/${year} (Score: ${Math.round(totalScore * 100) / 100}%)`);
        console.log(`     📊 Key metrics: Attendance ${Math.round(attendanceRate)}%, Tasks ${Math.round(taskCompletionRate)}%, Quality ${Math.round(qualityScore)}%`);
      }
    }

    console.log(`\n🎉 NEW scorecard sample data seeding completed!`);
    console.log(`📈 Generated ${totalRecords} performance records for ${agents.length} agents`);
    console.log(`📅 Data spans ${months.length} months (${months[0].month}/${months[0].year} to ${months[months.length-1].month}/${months[months.length-1].year})`);
    console.log(`\n💡 New scorecard features:`);
    console.log(`   🎯 8 new percentage-based metrics`);
    console.log(`   📊 Raw data tracking for transparency`);
    console.log(`   ⚖️  Impact-based weighting system`);
    console.log(`   📋 Excel import ready structure`);
    console.log(`\n🚀 You can now view the enhanced performance scorecards!`);

  } catch (error) {
    console.error('❌ Error seeding NEW scorecard sample data:', error);
    throw error;
  }
}

// Run the seeding function
seedNewScorecardData()
  .catch((e) => {
    console.error('❌ NEW scorecard seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });