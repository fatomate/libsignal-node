'use strict';

const { LRUCache } = require('lru-cache');
const SessionRecord = require('./session_record');

/**
 * SessionCache provides high-performance caching for Signal sessions
 * with automatic eviction and memory management.
 * 
 * Features:
 * - LRU eviction policy
 * - TTL-based expiration
 * - Size-based limits
 * - Automatic serialization/deserialization
 * - Cache warming and preloading
 * - Metrics and monitoring
 */
class SessionCache {
    constructor(storage, options = {}) {
        this.storage = storage;
        
        // Cache configuration
        this.config = {
            maxSessions: options.maxSessions || 1000,
            ttl: options.ttl || 1000 * 60 * 5, // 5 minutes default
            maxSize: options.maxSize || 50 * 1024 * 1024, // 50MB default
            updateAgeOnGet: options.updateAgeOnGet !== false,
            updateAgeOnHas: options.updateAgeOnHas !== false,
            enableMetrics: options.enableMetrics !== false,
            compressionThreshold: options.compressionThreshold || 1024, // 1KB
            preloadBatchSize: options.preloadBatchSize || 50
        };

        // Initialize LRU cache
        this.cache = new LRUCache({
            max: this.config.maxSessions,
            ttl: this.config.ttl,
            maxSize: this.config.maxSize,
            sizeCalculation: (value) => this._calculateSize(value),
            updateAgeOnGet: this.config.updateAgeOnGet,
            updateAgeOnHas: this.config.updateAgeOnHas,
            dispose: (value, key, reason) => {
                if (this.metrics) {
                    this.metrics.evictions++;
                    this.metrics.evictionReasons[reason] = 
                        (this.metrics.evictionReasons[reason] || 0) + 1;
                }
            },
            noDisposeOnSet: true // Don't dispose when overwriting
        });

        // Dirty tracking for write-back
        this.dirtyKeys = new Set();

        // Metrics
        if (this.config.enableMetrics) {
            this.metrics = {
                hits: 0,
                misses: 0,
                evictions: 0,
                evictionReasons: {},
                storageReads: 0,
                storageWrites: 0,
                errors: 0,
                avgLoadTime: 0,
                avgSaveTime: 0
            };
        }

        // Pending operations tracking
        this.pendingLoads = new Map();
        this.pendingStores = new Map();
    }

    /**
     * Calculate the size of a session for cache limits
     */
    _calculateSize(session) {
        if (!session) return 1;
        try {
            // Estimate size based on serialized form
            const serialized = JSON.stringify(session.serialize ? session.serialize() : session);
            return serialized.length;
        } catch (error) {
            return 1024; // Default size on error
        }
    }

    /**
     * Load a session from cache or storage
     * @param {string} address - Protocol address
     * @returns {Promise<SessionRecord|null>} The session record or null
     */
    async loadSession(address) {
        // Check cache first
        if (this.cache.has(address)) {
            if (this.metrics) {
                this.metrics.hits++;
            }
            return this.cache.get(address);
        }

        if (this.metrics) {
            this.metrics.misses++;
        }

        // Check if already loading
        if (this.pendingLoads.has(address)) {
            return await this.pendingLoads.get(address);
        }

        // Load from storage
        const loadPromise = this._loadFromStorage(address);
        this.pendingLoads.set(address, loadPromise);

        try {
            const session = await loadPromise;
            if (session) {
                this.cache.set(address, session);
            }
            return session;
        } finally {
            this.pendingLoads.delete(address);
        }
    }

    /**
     * Internal method to load from storage with metrics
     */
    async _loadFromStorage(address) {
        const startTime = Date.now();
        
        try {
            if (this.metrics) {
                this.metrics.storageReads++;
            }

            const session = await this.storage.loadSession(address);
            
            if (this.metrics) {
                const loadTime = Date.now() - startTime;
                this.metrics.avgLoadTime = 
                    (this.metrics.avgLoadTime * (this.metrics.storageReads - 1) + loadTime) / 
                    this.metrics.storageReads;
            }

            return session;
        } catch (error) {
            if (this.metrics) {
                this.metrics.errors++;
            }
            throw error;
        }
    }

    /**
     * Store a session in cache and mark for write-back
     * @param {string} address - Protocol address
     * @param {SessionRecord} session - Session to store
     * @param {Object} options - Storage options
     */
    async storeSession(address, session, options = {}) {
        // Update cache
        this.cache.set(address, session);
        
        // Mark as dirty for write-back
        this.dirtyKeys.add(address);

        // Immediate write if requested
        if (options.immediate !== false) {
            await this.flush(address);
        }
    }

    /**
     * Flush dirty sessions to storage
     * @param {string} address - Optional specific address to flush
     */
    async flush(address = null) {
        const keysToFlush = address ? 
            (this.dirtyKeys.has(address) ? [address] : []) : 
            Array.from(this.dirtyKeys);

        if (keysToFlush.length === 0) {
            return;
        }

        // Check for pending store operations
        const pendingPromises = [];
        for (const key of keysToFlush) {
            if (this.pendingStores.has(key)) {
                pendingPromises.push(this.pendingStores.get(key));
            }
        }

        if (pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }

        // Perform flush
        const flushPromises = keysToFlush.map(async (key) => {
            if (!this.dirtyKeys.has(key)) {
                return; // Already flushed
            }

            const session = this.cache.get(key);
            if (!session) {
                this.dirtyKeys.delete(key);
                return;
            }

            const storePromise = this._storeToStorage(key, session);
            this.pendingStores.set(key, storePromise);

            try {
                await storePromise;
                this.dirtyKeys.delete(key);
            } finally {
                this.pendingStores.delete(key);
            }
        });

        await Promise.all(flushPromises);
    }

    /**
     * Internal method to store to storage with metrics
     */
    async _storeToStorage(address, session) {
        const startTime = Date.now();
        
        try {
            if (this.metrics) {
                this.metrics.storageWrites++;
            }

            await this.storage.storeSession(address, session);
            
            if (this.metrics) {
                const saveTime = Date.now() - startTime;
                this.metrics.avgSaveTime = 
                    (this.metrics.avgSaveTime * (this.metrics.storageWrites - 1) + saveTime) / 
                    this.metrics.storageWrites;
            }
        } catch (error) {
            if (this.metrics) {
                this.metrics.errors++;
            }
            throw error;
        }
    }

    /**
     * Delete a session from cache and storage
     * @param {string} address - Protocol address
     */
    async deleteSession(address) {
        this.cache.delete(address);
        this.dirtyKeys.delete(address);
        
        if (this.storage.removeSession) {
            await this.storage.removeSession(address);
        }
    }

    /**
     * Preload sessions for known correspondents
     * @param {Array<string>} addresses - Array of addresses to preload
     */
    async preloadSessions(addresses) {
        const chunks = [];
        for (let i = 0; i < addresses.length; i += this.config.preloadBatchSize) {
            chunks.push(addresses.slice(i, i + this.config.preloadBatchSize));
        }

        for (const chunk of chunks) {
            await Promise.all(chunk.map(address => this.loadSession(address)));
        }
    }

    /**
     * Warm the cache with recently used sessions
     * @param {number} limit - Number of recent sessions to load
     */
    async warmCache(limit = 100) {
        if (!this.storage.getRecentSessions) {
            return; // Storage doesn't support this operation
        }

        const recentAddresses = await this.storage.getRecentSessions(limit);
        await this.preloadSessions(recentAddresses);
    }

    /**
     * Invalidate a cached session
     * @param {string} address - Protocol address
     */
    invalidate(address) {
        this.cache.delete(address);
        this.dirtyKeys.delete(address);
    }

    /**
     * Clear all cached sessions
     */
    async clear() {
        await this.flush(); // Flush dirty sessions first
        this.cache.clear();
        this.dirtyKeys.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const cacheStats = {
            size: this.cache.size,
            dirtyCount: this.dirtyKeys.size,
            pendingLoads: this.pendingLoads.size,
            pendingStores: this.pendingStores.size
        };

        if (this.metrics) {
            const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
            return {
                ...cacheStats,
                ...this.metrics,
                hitRate,
                efficiency: {
                    hitRate: `${(hitRate * 100).toFixed(2)}%`,
                    avgLoadTime: `${this.metrics.avgLoadTime.toFixed(2)}ms`,
                    avgSaveTime: `${this.metrics.avgSaveTime.toFixed(2)}ms`
                }
            };
        }

        return cacheStats;
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        if (this.metrics) {
            this.metrics = {
                hits: 0,
                misses: 0,
                evictions: 0,
                evictionReasons: {},
                storageReads: 0,
                storageWrites: 0,
                errors: 0,
                avgLoadTime: 0,
                avgSaveTime: 0
            };
        }
    }

    /**
     * Check if a session exists in cache
     * @param {string} address - Protocol address
     * @returns {boolean} True if session is cached
     */
    has(address) {
        return this.cache.has(address);
    }

    /**
     * Get cache entries for debugging
     * @returns {Array} Array of cache entries
     */
    entries() {
        return Array.from(this.cache.entries()).map(([key, value]) => ({
            address: key,
            size: this._calculateSize(value),
            isDirty: this.dirtyKeys.has(key),
            age: this.cache.getRemainingTTL(key)
        }));
    }
}

// Factory function for creating cached storage wrapper
function createCachedStorage(storage, options) {
    const cache = new SessionCache(storage, options);
    
    return {
        // Delegate session operations to cache
        loadSession: (address) => cache.loadSession(address),
        storeSession: (address, session) => cache.storeSession(address, session),
        
        // Pass through other storage methods
        getOurIdentity: () => storage.getOurIdentity(),
        getOurRegistrationId: () => storage.getOurRegistrationId(),
        isTrustedIdentity: (id, key) => storage.isTrustedIdentity(id, key),
        loadPreKey: (id) => storage.loadPreKey(id),
        removePreKey: (id) => storage.removePreKey(id),
        loadSignedPreKey: (id) => storage.loadSignedPreKey(id),
        
        // Cache management
        flush: () => cache.flush(),
        clear: () => cache.clear(),
        getStats: () => cache.getStats(),
        warmCache: (limit) => cache.warmCache(limit),
        
        // Direct cache access
        _cache: cache
    };
}

module.exports = {
    SessionCache,
    createCachedStorage
};