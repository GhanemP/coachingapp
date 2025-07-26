#!/usr/bin/env node

/**
 * Test Socket.IO Connection
 * 
 * This script helps debug Socket.IO connection issues by:
 * 1. Checking if the server is running
 * 2. Attempting to connect as a client
 * 3. Verifying authentication flow
 */

import { io } from 'socket.io-client';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002';
const API_URL = process.env.NEXTAUTH_URL || 'http://localhost:3002';

async function testConnection() {
  console.log('🔍 Testing Socket.IO Connection...\n');
  console.log(`Socket URL: ${SOCKET_URL}`);
  console.log(`API URL: ${API_URL}\n`);

  // Step 1: Check if server is reachable
  console.log('1️⃣  Checking if server is reachable...');
  try {
    const response = await fetch(`${API_URL}/api/socket`);
    const text = await response.text();
    console.log(`✅ Server responded: ${text}`);
  } catch (error) {
    console.log(`❌ Server not reachable: ${error instanceof Error ? error.message : String(error)}`);
    console.log('   Make sure to run: node server.js');
    return;
  }

  // Step 2: Test Socket.IO connection
  console.log('\n2️⃣  Testing Socket.IO connection...');
  
  const socket = io(SOCKET_URL, {
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    auth: {
      sessionId: 'test-user-123', // Mock session ID
    },
  });

  // Set up event handlers
  socket.on('connect', () => {
    console.log('✅ Socket connected successfully!');
    console.log(`   Socket ID: ${socket.id}`);
    
    // Test authentication
    socket.emit('authenticate', {
      userId: 'test-user-123',
      role: 'TEAM_LEADER'
    });
  });

  socket.on('authenticated', (data) => {
    if (data.success) {
      console.log('✅ Authentication successful!');
    } else {
      console.log('❌ Authentication failed:', data.error);
    }
    
    // Clean up
    socket.disconnect();
    process.exit(0);
  });

  socket.on('connect_error', (error) => {
    console.log(`❌ Connection error: ${error.message}`);
    console.log('\nPossible causes:');
    console.log('- Server not running (use: node server.js)');
    console.log('- Wrong port (check PORT env variable)');
    console.log('- CORS issues');
    console.log('- Firewall blocking connection');
    process.exit(1);
  });

  socket.on('disconnect', (reason) => {
    console.log(`\n📡 Disconnected: ${reason}`);
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    console.log('\n⏱️  Connection timeout after 10 seconds');
    socket.disconnect();
    process.exit(1);
  }, 10000);
}

// Run the test
console.log('Socket.IO Connection Test\n');
console.log('Prerequisites:');
console.log('- Make sure the server is running: node server.js');
console.log('- Check your .env.local file has NEXT_PUBLIC_SOCKET_URL set\n');

testConnection().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});