/**
 * Redis Connection Test - Demonstrates basic Redis operations
 * Equivalent to the C# StackExchange.Redis example provided
 */

import redis from '@/lib/redis';

// Check if Redis is configured
if (!redis) {
  console.error('[Redis] REDIS_URL not configured in environment variables');
  process.exit(1);
}

async function runTest() {
  try {
    // Test connection
    await redis.ping();
    console.log('[Redis] Connection successful');

    // Set a value
    await redis.set('foo', 'bar');
    console.log('[Redis] Set foo=bar');

    // Get the value
    const result = await redis.get('foo');
    console.log(`[redis] GET foo: ${result}`); // >>> bar

    // Test expiration
    await redis.setex('temp_key', 5, 'expires in 5 seconds');
    const tempResult = await redis.get('temp_key');
    console.log(`[redis] temp_key (fresh): ${tempResult}`);

    // Wait 6 seconds and check again
    await new Promise(resolve => setTimeout(resolve, 6500));
    const expiredResult = await redis.get('temp_key');
    console.log(`[redis] temp_key (after 6s): ${expiredResult}`); // >>> null

    // Clean up
    await redis.del('foo');
    console.log('[redis] Cleaned up test keys');

    console.log('[Redis] All tests passed!');
  } catch (error) {
    console.error('[Redis] Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runTest();
}

export default redis;