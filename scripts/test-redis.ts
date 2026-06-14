// Redis Connection Test
// Run with: npx ts-node scripts/test-redis.ts

import redis from '../lib/redis.js';

async function testRedis() {
  console.log('Testing Redis Cloud connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1. Testing connection...');
    await redis.ping();
    console.log('   ✓ Connected to Redis Cloud\n');

    // Test 2: Set and get
    console.log('2. Testing set/get...');
    await redis.set('test:key', 'Hello from ZamSchool OS!');
    const value = await redis.get('test:key');
    console.log(`   ✓ Set/Get works: "${value}"\n`);

    // Test 3: Expiration
    console.log('3. Testing expiration (5 seconds)...');
    await redis.setex('test:expiring', 5, 'This will expire');
    console.log('   ✓ Set with TTL\n');

    // Test 4: JSON caching
    console.log('4. Testing JSON cache...');
    const testData = { userId: '123', role: 'admin', timestamp: Date.now() };
    await redis.set('test:json', JSON.stringify(testData));
    const cached = await redis.get('test:json');
    console.log(`   ✓ JSON cached: ${cached}\n`);

    // Test 5: Pattern deletion
    console.log('5. Testing pattern cleanup...');
    const keys = await redis.keys('test:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`   ✓ Cleaned up ${keys.length} test keys\n`);
    }

    // Server info
    console.log('6. Redis server info:');
    const info = await redis.info('server');
    const version = info.match(/redis_version:(.+)/)?.[1];
    console.log(`   ✓ Redis version: ${version?.trim()}\n`);

    console.log('✅ All Redis tests passed!');
  } catch (err) {
    console.error('❌ Redis test failed:', err);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

testRedis();
