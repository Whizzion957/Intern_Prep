/**
 * Redis Configuration for Rate Limiting
 * 
 * Uses Upstash Redis (or any Redis instance)
 * Falls back gracefully if Redis is unavailable
 */

const Redis = require('ioredis');

let redis = null;
let isConnected = false;

const initRedis = () => {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        console.warn('⚠️ REDIS_URL not configured. Rate limiting will be disabled.');
        return null;
    }

    try {
        redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                // Stop retrying after 3 attempts
                if (times > 3) {
                    console.warn('⚠️ Redis connection failed after 3 retries. Rate limiting disabled.');
                    return null; // Stop retrying
                }
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
            connectTimeout: 5000,
            // Upstash-friendly settings
            tls: redisUrl.startsWith('rediss://') ? {} : undefined,
        });

        redis.on('connect', () => {
            isConnected = true;
            console.log('✅ Redis connected successfully');
        });

        redis.on('error', (err) => {
            isConnected = false;
            // Don't spam console with repeated errors
            if (!err._logged) {
                console.warn('⚠️ Redis error (rate limiting disabled):', err.message);
                err._logged = true;
            }
        });

        redis.on('close', () => {
            isConnected = false;
        });

        // Attempt initial connection (don't await, don't block startup)
        redis.connect().catch((err) => {
            console.warn('⚠️ Redis connection failed (rate limiting disabled):', err.message);
        });

        return redis;
    } catch (error) {
        console.warn('⚠️ Failed to initialize Redis:', error.message);
        return null;
    }
};

const getRedis = () => redis;
const isRedisConnected = () => isConnected;

module.exports = {
    initRedis,
    getRedis,
    isRedisConnected,
};
