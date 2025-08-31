'use strict';

const { Mutex } = require('async-mutex');
const { LRUCache } = require('lru-cache');

/**
 * MutexManager provides fine-grained mutex-based concurrency control
 * for Signal protocol operations, replacing the legacy queue system.
 * 
 * Features:
 * - Per-address mutex protection
 * - Automatic mutex cleanup with LRU cache
 * - Transaction support for atomic operations
 * - Deadlock prevention with timeouts
 * - Performance metrics tracking
 */
class MutexManager {
    constructor(options = {}) {
        // LRU cache configuration for automatic mutex cleanup
        this.mutexCache = new LRUCache({
            max: options.maxMutexes || 1000,
            ttl: options.ttl || 1000 * 60 * 5, // 5 minutes default
            updateAgeOnGet: true,
            updateAgeOnHas: true,
            dispose: (value, key) => {
                // Clean up mutex when evicted
                if (this.metrics) {
                    this.metrics.mutexEvictions++;
                }
            }
        });

        // Configuration
        this.config = {
            defaultTimeout: options.defaultTimeout || 30000, // 30 seconds
            enableMetrics: options.enableMetrics !== false,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 100
        };

        // Performance metrics
        if (this.config.enableMetrics) {
            this.metrics = {
                totalAcquisitions: 0,
                totalReleases: 0,
                timeouts: 0,
                errors: 0,
                mutexEvictions: 0,
                cacheHits: 0,
                cacheMisses: 0,
                avgWaitTime: 0,
                maxWaitTime: 0
            };
        }

        // Active transactions tracking
        this.activeTransactions = new Map();
    }

    /**
     * Get or create a mutex for a specific key
     * @param {string} key - Unique identifier for the mutex
     * @returns {Mutex} The mutex instance
     */
    getMutex(key) {
        if (!this.mutexCache.has(key)) {
            this.mutexCache.set(key, new Mutex());
            if (this.metrics) {
                this.metrics.cacheMisses++;
            }
        } else if (this.metrics) {
            this.metrics.cacheHits++;
        }
        return this.mutexCache.get(key);
    }

    /**
     * Execute a function with mutex protection
     * @param {string} key - Mutex key
     * @param {Function} fn - Async function to execute
     * @param {Object} options - Execution options
     * @returns {Promise} Result of the function
     */
    async withMutex(key, fn, options = {}) {
        const mutex = this.getMutex(key);
        const timeout = options.timeout || this.config.defaultTimeout;
        const retryAttempts = options.retryAttempts || this.config.retryAttempts;
        
        let lastError;
        for (let attempt = 0; attempt < retryAttempts; attempt++) {
            try {
                return await this._executeWithMutex(mutex, fn, timeout, key);
            } catch (error) {
                lastError = error;
                if (error.name === 'TimeoutError' || attempt === retryAttempts - 1) {
                    throw error;
                }
                // Exponential backoff for retries
                await new Promise(resolve => 
                    setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt))
                );
            }
        }
        throw lastError;
    }

    /**
     * Internal method to execute with mutex and timeout
     */
    async _executeWithMutex(mutex, fn, timeout, key) {
        const startTime = Date.now();
        let release;
        let timeoutHandle;

        try {
            // Create a promise that rejects on timeout
            const timeoutPromise = new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    const error = new Error(`Mutex acquisition timeout for key: ${key}`);
                    error.name = 'TimeoutError';
                    reject(error);
                }, timeout);
            });

            // Race between acquiring mutex and timeout
            const acquirePromise = mutex.acquire();
            release = await Promise.race([acquirePromise, timeoutPromise]);
            
            clearTimeout(timeoutHandle);

            if (this.metrics) {
                const waitTime = Date.now() - startTime;
                this.metrics.totalAcquisitions++;
                this.metrics.avgWaitTime = 
                    (this.metrics.avgWaitTime * (this.metrics.totalAcquisitions - 1) + waitTime) / 
                    this.metrics.totalAcquisitions;
                this.metrics.maxWaitTime = Math.max(this.metrics.maxWaitTime, waitTime);
            }

            // Execute the protected function
            return await fn();
        } catch (error) {
            if (this.metrics) {
                if (error.name === 'TimeoutError') {
                    this.metrics.timeouts++;
                } else {
                    this.metrics.errors++;
                }
            }
            throw error;
        } finally {
            clearTimeout(timeoutHandle);
            if (release) {
                release();
                if (this.metrics) {
                    this.metrics.totalReleases++;
                }
            }
        }
    }

    /**
     * Execute a transaction with multiple mutex locks
     * Ensures all locks are acquired atomically to prevent deadlocks
     * @param {Array<string>} keys - Array of mutex keys
     * @param {Function} fn - Transaction function
     * @param {Object} options - Transaction options
     * @returns {Promise} Result of the transaction
     */
    async transaction(keys, fn, options = {}) {
        // Sort keys to prevent deadlock
        const sortedKeys = [...keys].sort();
        const transactionId = `txn_${Date.now()}_${Math.random()}`;
        
        this.activeTransactions.set(transactionId, {
            keys: sortedKeys,
            startTime: Date.now(),
            status: 'acquiring'
        });

        const mutexes = sortedKeys.map(key => this.getMutex(key));
        const releases = [];

        try {
            // Acquire all mutexes in order
            for (const mutex of mutexes) {
                const release = await mutex.acquire();
                releases.push(release);
            }

            this.activeTransactions.get(transactionId).status = 'executing';

            // Execute transaction
            const result = await fn();

            this.activeTransactions.get(transactionId).status = 'completed';
            return result;
        } catch (error) {
            this.activeTransactions.get(transactionId).status = 'failed';
            throw error;
        } finally {
            // Release all mutexes in reverse order
            for (const release of releases.reverse()) {
                release();
            }
            this.activeTransactions.delete(transactionId);
        }
    }

    /**
     * Clear a specific mutex from cache
     * @param {string} key - Mutex key to clear
     */
    clearMutex(key) {
        return this.mutexCache.delete(key);
    }

    /**
     * Clear all mutexes from cache
     */
    clearAll() {
        this.mutexCache.clear();
        this.activeTransactions.clear();
    }

    /**
     * Get current metrics
     * @returns {Object} Metrics object
     */
    getMetrics() {
        if (!this.metrics) {
            return null;
        }
        return {
            ...this.metrics,
            cacheSize: this.mutexCache.size,
            activeTransactions: this.activeTransactions.size,
            cacheStats: {
                hits: this.metrics.cacheHits,
                misses: this.metrics.cacheMisses,
                hitRate: this.metrics.cacheHits / 
                    (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
            }
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        if (this.metrics) {
            this.metrics = {
                totalAcquisitions: 0,
                totalReleases: 0,
                timeouts: 0,
                errors: 0,
                mutexEvictions: 0,
                cacheHits: 0,
                cacheMisses: 0,
                avgWaitTime: 0,
                maxWaitTime: 0
            };
        }
    }

    /**
     * Get information about active transactions
     * @returns {Array} Array of active transaction info
     */
    getActiveTransactions() {
        return Array.from(this.activeTransactions.entries()).map(([id, info]) => ({
            id,
            ...info,
            duration: Date.now() - info.startTime
        }));
    }
}

// Singleton instance for global usage
let globalInstance = null;

/**
 * Get or create the global mutex manager instance
 * @param {Object} options - Options for creating new instance
 * @returns {MutexManager} The global instance
 */
function getInstance(options) {
    if (!globalInstance) {
        globalInstance = new MutexManager(options);
    }
    return globalInstance;
}

module.exports = {
    MutexManager,
    getInstance
};