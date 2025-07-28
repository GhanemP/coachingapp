// import { RateLimiterMemory } from 'rate-limiter-flexible'; // Unused import

function resetRateLimits() {
  try {
    console.log('Resetting rate limits...');

    // Since RateLimiterMemory stores data in memory,
    // restarting the server will reset the limits.
    // This script is just a placeholder to inform users.

    console.log('ℹ️  Rate limits are stored in memory and will be reset when the server restarts.');
    console.log('ℹ️  To reset rate limits immediately, restart your development server.');
    console.log('ℹ️  The rate limits have been updated to be more lenient:');
    console.log('   - General API endpoints: 100 requests per minute');
    console.log('   - Auth endpoints: 20 requests per minute');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the reset
resetRateLimits();
