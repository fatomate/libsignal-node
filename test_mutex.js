const assert = require('assert');
const { MutexManager, getInstance } = require('./src/mutex_manager');
const { SessionCache, createCachedStorage } = require('./src/session_cache');
const SessionCipher = require('./src/session_cipher');
const SessionBuilder = require('./src/session_builder');
const ProtocolAddress = require('./src/protocol_address');
const SessionRecord = require('./src/session_record');

console.log('Running Mutex and Cache Tests...\n');

// Test 1: MutexManager Basic Operations
console.log('Test 1: MutexManager Basic Operations');
(async () => {
    try {
        const manager = new MutexManager({ enableMetrics: true });
        
        // Test mutex acquisition and release
        let counter = 0;
        const promises = [];
        
        for (let i = 0; i < 10; i++) {
            promises.push(
                manager.withMutex('test-key', async () => {
                    const current = counter;
                    await new Promise(resolve => setTimeout(resolve, 10));
                    counter = current + 1;
                })
            );
        }
        
        await Promise.all(promises);
        assert.strictEqual(counter, 10, 'Counter should be 10 after mutex protection');
        
        const metrics = manager.getMetrics();
        assert.strictEqual(metrics.totalAcquisitions, 10, 'Should have 10 acquisitions');
        assert.strictEqual(metrics.totalReleases, 10, 'Should have 10 releases');
        
        console.log('✓ MutexManager basic operations work correctly\n');
    } catch (err) {
        console.error('✗ MutexManager basic operations failed:', err, '\n');
    }
})();

// Test 2: MutexManager Timeout Handling
console.log('Test 2: MutexManager Timeout Handling');
(async () => {
    try {
        const manager = new MutexManager({ 
            defaultTimeout: 100,
            enableMetrics: true 
        });
        
        let timeoutOccurred = false;
        
        // Hold mutex for longer than timeout
        const promise1 = manager.withMutex('timeout-test', async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
        });
        
        // Try to acquire same mutex with short timeout
        const promise2 = manager.withMutex('timeout-test', async () => {
            // This should not execute
        }, { timeout: 50 }).catch(err => {
            if (err.name === 'TimeoutError') {
                timeoutOccurred = true;
            }
        });
        
        await Promise.all([promise1, promise2]);
        assert(timeoutOccurred, 'Timeout should have occurred');
        
        const metrics = manager.getMetrics();
        assert(metrics.timeouts > 0, 'Should have recorded timeout');
        
        console.log('✓ MutexManager timeout handling works correctly\n');
    } catch (err) {
        console.error('✗ MutexManager timeout handling failed:', err, '\n');
    }
})();

// Test 3: MutexManager Transaction Support
console.log('Test 3: MutexManager Transaction Support');
(async () => {
    try {
        const manager = new MutexManager({ enableMetrics: true });
        
        let executed = false;
        await manager.transaction(['key1', 'key2', 'key3'], async () => {
            executed = true;
            // Simulate work
            await new Promise(resolve => setTimeout(resolve, 10));
        });
        
        assert(executed, 'Transaction should have executed');
        
        const activeTransactions = manager.getActiveTransactions();
        assert.strictEqual(activeTransactions.length, 0, 'No active transactions should remain');
        
        console.log('✓ MutexManager transaction support works correctly\n');
    } catch (err) {
        console.error('✗ MutexManager transaction support failed:', err, '\n');
    }
})();

// Test 4: SessionCache Basic Operations
console.log('Test 4: SessionCache Basic Operations');
(async () => {
    try {
        // Mock storage
        const mockStorage = {
            sessions: new Map(),
            async loadSession(address) {
                const data = this.sessions.get(address);
                return data ? SessionRecord.deserialize(data) : null;
            },
            async storeSession(address, session) {
                this.sessions.set(address, session.serialize());
            }
        };
        
        const cache = new SessionCache(mockStorage, {
            maxSessions: 10,
            ttl: 1000,
            enableMetrics: true
        });
        
        // Create and store a session
        const record = new SessionRecord();
        await cache.storeSession('test-address', record);
        
        // Load from cache (should be a cache hit)
        const loaded1 = await cache.loadSession('test-address');
        assert(loaded1 instanceof SessionRecord, 'Should load SessionRecord');
        
        // Check metrics
        const stats = cache.getStats();
        assert.strictEqual(stats.hits, 1, 'Should have 1 cache hit');
        assert.strictEqual(stats.misses, 0, 'Should have 0 cache misses');
        
        // Clear cache and load again (should be a cache miss)
        cache.invalidate('test-address');
        const loaded2 = await cache.loadSession('test-address');
        assert(loaded2 instanceof SessionRecord, 'Should load SessionRecord after invalidation');
        
        const stats2 = cache.getStats();
        assert.strictEqual(stats2.misses, 1, 'Should have 1 cache miss after invalidation');
        
        console.log('✓ SessionCache basic operations work correctly\n');
    } catch (err) {
        console.error('✗ SessionCache basic operations failed:', err, '\n');
    }
})();

// Test 5: SessionCache LRU Eviction
console.log('Test 5: SessionCache LRU Eviction');
(async () => {
    try {
        const mockStorage = {
            sessions: new Map(),
            loadCount: 0,
            async loadSession(address) {
                this.loadCount++;
                const data = this.sessions.get(address);
                return data ? SessionRecord.deserialize(data) : null;
            },
            async storeSession(address, session) {
                this.sessions.set(address, session.serialize());
            }
        };
        
        const cache = new SessionCache(mockStorage, {
            maxSessions: 3,
            ttl: 10000,
            enableMetrics: true
        });
        
        // Store 4 sessions (one should be evicted)
        for (let i = 0; i < 4; i++) {
            const record = new SessionRecord();
            await cache.storeSession(`address-${i}`, record);
        }
        
        // First session should have been evicted
        assert(!cache.has('address-0'), 'First session should be evicted');
        assert(cache.has('address-3'), 'Last session should be in cache');
        
        const stats = cache.getStats();
        assert.strictEqual(stats.evictions, 1, 'Should have 1 eviction');
        
        console.log('✓ SessionCache LRU eviction works correctly\n');
    } catch (err) {
        console.error('✗ SessionCache LRU eviction failed:', err, '\n');
    }
})();

// Test 6: Cached Storage Wrapper
console.log('Test 6: Cached Storage Wrapper');
(async () => {
    try {
        const baseStorage = {
            sessions: new Map(),
            identity: { pubKey: Buffer.from('test-identity'), privKey: Buffer.from('test-privkey') },
            registrationId: 12345,
            
            async loadSession(address) {
                return this.sessions.get(address);
            },
            async storeSession(address, session) {
                this.sessions.set(address, session);
            },
            async getOurIdentity() {
                return this.identity;
            },
            async getOurRegistrationId() {
                return this.registrationId;
            },
            async isTrustedIdentity(id, key) {
                return true;
            },
            async loadPreKey(id) {
                return null;
            },
            async removePreKey(id) {
                return;
            },
            async loadSignedPreKey(id) {
                return null;
            }
        };
        
        const cachedStorage = createCachedStorage(baseStorage, {
            maxSessions: 10,
            enableMetrics: true
        });
        
        // Test passthrough methods
        const identity = await cachedStorage.getOurIdentity();
        assert.deepStrictEqual(identity, baseStorage.identity, 'Identity should match');
        
        const regId = await cachedStorage.getOurRegistrationId();
        assert.strictEqual(regId, 12345, 'Registration ID should match');
        
        // Test cached session operations
        const record = new SessionRecord();
        await cachedStorage.storeSession('test-addr', record);
        
        const loaded = await cachedStorage.loadSession('test-addr');
        assert(loaded instanceof SessionRecord, 'Should load SessionRecord');
        
        const stats = cachedStorage.getStats();
        assert(stats.hits > 0, 'Should have cache hits');
        
        console.log('✓ Cached storage wrapper works correctly\n');
    } catch (err) {
        console.error('✗ Cached storage wrapper failed:', err, '\n');
    }
})();

// Test 7: Integration with SessionCipher
console.log('Test 7: Integration with SessionCipher');
(async () => {
    try {
        const mockStorage = {
            sessions: new Map(),
            identity: { 
                pubKey: Buffer.alloc(33, 5), 
                privKey: Buffer.alloc(32, 1) 
            },
            registrationId: 12345,
            
            async loadSession(address) {
                return this.sessions.get(address);
            },
            async storeSession(address, session) {
                this.sessions.set(address, session);
            },
            async getOurIdentity() {
                return this.identity;
            },
            async getOurRegistrationId() {
                return this.registrationId;
            },
            async isTrustedIdentity(id, key) {
                return true;
            }
        };
        
        const address = new ProtocolAddress('test-user', 1);
        const mutexManager = new MutexManager({ enableMetrics: true });
        
        // Create cipher with new features
        const cipher = new SessionCipher(mockStorage, address, {
            mutexManager,
            useLegacyQueue: false,
            enableMetrics: true
        });
        
        // Test that cipher initializes correctly
        assert(cipher.mutexManager, 'Cipher should have mutex manager');
        assert(!cipher.config.useLegacyQueue, 'Should not use legacy queue');
        
        // Test metrics
        const metrics = cipher.getMetrics();
        assert(metrics.address === address.toString(), 'Address should match');
        assert(metrics.mutexMetrics !== null, 'Should have mutex metrics');
        
        console.log('✓ SessionCipher integration works correctly\n');
    } catch (err) {
        console.error('✗ SessionCipher integration failed:', err, '\n');
    }
})();

// Test 8: Integration with SessionBuilder
console.log('Test 8: Integration with SessionBuilder');
(async () => {
    try {
        const mockStorage = {
            sessions: new Map(),
            identity: { 
                pubKey: Buffer.alloc(33, 5), 
                privKey: Buffer.alloc(32, 1) 
            },
            registrationId: 12345,
            
            async loadSession(address) {
                return this.sessions.get(address);
            },
            async storeSession(address, session) {
                this.sessions.set(address, session);
            },
            async getOurIdentity() {
                return this.identity;
            },
            async getOurRegistrationId() {
                return this.registrationId;
            },
            async isTrustedIdentity(id, key) {
                return true;
            },
            async loadPreKey(id) {
                return null;
            },
            async loadSignedPreKey(id) {
                return {
                    pubKey: Buffer.alloc(33, 2),
                    privKey: Buffer.alloc(32, 2)
                };
            }
        };
        
        const address = new ProtocolAddress('test-user', 1);
        const mutexManager = new MutexManager({ enableMetrics: true });
        
        // Create builder with new features
        const builder = new SessionBuilder(mockStorage, address, {
            mutexManager,
            useLegacyQueue: false,
            enableMetrics: true
        });
        
        // Test that builder initializes correctly
        assert(builder.mutexManager, 'Builder should have mutex manager');
        assert(!builder.config.useLegacyQueue, 'Should not use legacy queue');
        
        console.log('✓ SessionBuilder integration works correctly\n');
    } catch (err) {
        console.error('✗ SessionBuilder integration failed:', err, '\n');
    }
})();

// Test 9: Singleton MutexManager
console.log('Test 9: Singleton MutexManager');
(async () => {
    try {
        const instance1 = getInstance({ enableMetrics: true });
        const instance2 = getInstance();
        
        assert.strictEqual(instance1, instance2, 'Should return same instance');
        
        // Test that singleton works correctly
        let counter = 0;
        await instance1.withMutex('singleton-test', async () => {
            counter++;
        });
        
        assert.strictEqual(counter, 1, 'Counter should be 1');
        
        console.log('✓ Singleton MutexManager works correctly\n');
    } catch (err) {
        console.error('✗ Singleton MutexManager failed:', err, '\n');
    }
})();

// Test 10: Concurrent Operations Stress Test
console.log('Test 10: Concurrent Operations Stress Test');
(async () => {
    try {
        const manager = new MutexManager({ 
            enableMetrics: true,
            maxMutexes: 100
        });
        
        const operations = [];
        const results = new Map();
        
        // Simulate 100 concurrent operations on 10 different keys
        for (let i = 0; i < 100; i++) {
            const key = `key-${i % 10}`;
            operations.push(
                manager.withMutex(key, async () => {
                    const current = results.get(key) || 0;
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
                    results.set(key, current + 1);
                })
            );
        }
        
        await Promise.all(operations);
        
        // Verify each key was incremented exactly 10 times
        for (let i = 0; i < 10; i++) {
            const count = results.get(`key-${i}`);
            assert.strictEqual(count, 10, `Key-${i} should have count of 10`);
        }
        
        const metrics = manager.getMetrics();
        assert.strictEqual(metrics.totalAcquisitions, 100, 'Should have 100 acquisitions');
        assert.strictEqual(metrics.errors, 0, 'Should have no errors');
        
        console.log('✓ Concurrent operations stress test passed\n');
        console.log(`  Average wait time: ${metrics.avgWaitTime.toFixed(2)}ms`);
        console.log(`  Max wait time: ${metrics.maxWaitTime}ms`);
        console.log(`  Cache hit rate: ${(metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(2)}%\n`);
    } catch (err) {
        console.error('✗ Concurrent operations stress test failed:', err, '\n');
    }
})();

console.log('All tests completed!');