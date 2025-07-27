const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testScorecardAPI() {
  try {
    const agentId = 'cmdl4mtlm000z73fslf3suyot'; // Test Agent
    const year = 2024;
    
    console.log('Testing scorecard API logic...');
    console.log('Agent ID:', agentId);
    console.log('Year:', year);
    
    // Get agent details (simulating the API logic)
    const agentData = await prisma.user.findUnique({
      where: {
        id: agentId,
        role: 'AGENT'
      },
      include: {
        agentProfile: true,
      },
    });
    
    console.log('\nAgent Data:', {
      id: agentData?.id,
      name: agentData?.name,
      email: agentData?.email,
      hasProfile: !!agentData?.agentProfile
    });
    
    // Get metrics
    const metrics = await prisma.agentMetric.findMany({
      where: {
        agentId: agentId,
        year: year,
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });
    
    console.log('\nMetrics found:', metrics.length);
    metrics.forEach(metric => {
      console.log(`- Month ${metric.month}: Score ${metric.totalScore}, Percentage ${metric.percentage}%`);
      console.log(`  Service: ${metric.service}, Quality: ${metric.quality}, Performance: ${metric.performance}`);
    });
    
    // Calculate yearly average
    if (metrics.length > 0) {
      const avgMetrics = {
        service: 0,
        productivity: 0,
        quality: 0,
        assiduity: 0,
        performance: 0,
        adherence: 0,
        lateness: 0,
        breakExceeds: 0,
        totalScore: 0,
        percentage: 0,
      };

      metrics.forEach((metric) => {
        avgMetrics.service += metric.service;
        avgMetrics.productivity += metric.productivity;
        avgMetrics.quality += metric.quality;
        avgMetrics.assiduity += metric.assiduity;
        avgMetrics.performance += metric.performance;
        avgMetrics.adherence += metric.adherence;
        avgMetrics.lateness += metric.lateness;
        avgMetrics.breakExceeds += metric.breakExceeds;
        avgMetrics.totalScore += metric.totalScore || 0;
        avgMetrics.percentage += metric.percentage || 0;
      });

      const count = metrics.length;
      const yearlyAverage = {
        service: (avgMetrics.service / count).toFixed(2),
        productivity: (avgMetrics.productivity / count).toFixed(2),
        quality: (avgMetrics.quality / count).toFixed(2),
        assiduity: (avgMetrics.assiduity / count).toFixed(2),
        performance: (avgMetrics.performance / count).toFixed(2),
        adherence: (avgMetrics.adherence / count).toFixed(2),
        lateness: (avgMetrics.lateness / count).toFixed(2),
        breakExceeds: (avgMetrics.breakExceeds / count).toFixed(2),
        totalScore: (avgMetrics.totalScore / count).toFixed(2),
        percentage: (avgMetrics.percentage / count).toFixed(2),
      };
      
      console.log('\nYearly Average:', yearlyAverage);
    }
    
    // Simulate the API response
    const apiResponse = {
      agent: agentData,
      metrics,
      trends: {},
      yearlyAverage: metrics.length > 0 ? 'calculated above' : null,
      year,
      month: null,
    };
    
    console.log('\nAPI Response structure:');
    console.log('- agent:', !!apiResponse.agent);
    console.log('- metrics count:', apiResponse.metrics.length);
    console.log('- has yearlyAverage:', !!apiResponse.yearlyAverage);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testScorecardAPI();