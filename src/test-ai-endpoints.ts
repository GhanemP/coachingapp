import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAIEndpoints() {
  console.log('🧪 Testing AI Endpoints...\n');

  // Test data
  const testUserId = 'test-user-id';
  const testAgentId = 'test-agent-id';
  const testSessionId = 'test-session-id';

  // Base URL for API calls
  const baseUrl = 'http://localhost:3000/api/ai';

  // Helper function to make API calls
  async function testEndpoint(
    name: string,
    endpoint: string,
    method: string,
    body?: Record<string, unknown>
  ) {
    console.log(`\n📍 Testing ${name}...`);
    console.log(`   Endpoint: ${method} ${endpoint}`);
    
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          // Add a mock authorization header for testing
          'Authorization': 'Bearer test-token',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Success (${response.status})`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
      } else {
        console.log(`   ❌ Error (${response.status})`);
        console.log(`   Error:`, data.error || data);
        
        // Check if it's an API key error
        if (data.error?.includes('API key')) {
          console.log(`   ℹ️  Note: This is expected if OPENAI_API_KEY is not set`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Request failed:`, error);
    }
  }

  // Test 1: Coaching Recommendations
  await testEndpoint(
    'Coaching Recommendations',
    '/recommendations',
    'POST',
    {
      userId: testUserId,
      agentId: testAgentId,
      context: 'Agent is struggling with customer objections',
    }
  );

  // Test 2: Session Insights
  await testEndpoint(
    'Session Insights',
    '/session-insights',
    'POST',
    {
      sessionId: testSessionId,
      metrics: {
        service: 85,
        productivity: 75,
        quality: 90,
      },
    }
  );

  // Test 3: Action Items
  await testEndpoint(
    'Action Items',
    '/action-items',
    'POST',
    {
      sessionId: testSessionId,
      notes: 'Agent needs to work on active listening and empathy',
    }
  );

  // Test 4: Performance Summary
  await testEndpoint(
    'Performance Summary',
    '/performance-summary',
    'POST',
    {
      agentId: testAgentId,
      timeframe: 'month',
    }
  );

  console.log('\n\n✅ AI Endpoint testing complete!');
  console.log('\nℹ️  Note: If you see API key errors, that\'s expected.');
  console.log('   To test with real AI responses, add your OpenAI API key to .env.local');
  console.log('   OPENAI_API_KEY="your-actual-api-key"');
  
  await prisma.$disconnect();
}

// Run the tests
testAIEndpoints().catch(console.error);