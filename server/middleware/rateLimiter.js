/**
 * Rate Limiting Middleware
 * 
 * Uses Redis to track and limit content creation per user.
 * Different limits for regular users vs admins.
 * Graceful fallback if Redis is unavailable.
 */

const { getRedis, isRedisConnected } = require('../config/redis');

// Rate limits configuration
const RATE_LIMITS = {
    questions: {
        user: 10,
        admin: 50,
        window: 24 * 60 * 60, // 24 hours in seconds
    },
    companies: {
        user: 5,
        admin: 25,
        window: 24 * 60 * 60,
    },
    tips: {
        user: 20,
        admin: 100,
        window: 24 * 60 * 60,
    },
    replies: {
        user: 30,
        admin: 150,
        window: 24 * 60 * 60,
    },
};

/**
 * Get the Redis key for a user's rate limit
 */
const getRateLimitKey = (userId, action) => {
    return `ratelimit:${userId}:${action}`;
};

/**
 * Calculate time until reset in human-readable format
 */
const getTimeUntilReset = (secondsRemaining) => {
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);

    if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
};

/**
 * Create rate limiter middleware for a specific action
 * @param {string} action - One of: 'questions', 'companies', 'tips', 'replies'
 */
const createRateLimiter = (action) => {
    const limits = RATE_LIMITS[action];

    if (!limits) {
        throw new Error(`Unknown rate limit action: ${action}`);
    }

    return async (req, res, next) => {
        const redis = getRedis();

        // If Redis is not available, allow the request (fail-open)
        if (!redis || !isRedisConnected()) {
            console.warn(`Rate limiting skipped for ${action} - Redis unavailable`);
            return next();
        }

        // Need authenticated user for rate limiting
        if (!req.user) {
            return next();
        }

        const userId = req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const limit = isAdmin ? limits.admin : limits.user;
        const key = getRateLimitKey(userId, action);

        try {
            // Get current count
            const currentCount = await redis.get(key);
            const count = parseInt(currentCount) || 0;

            // Check if over limit
            if (count >= limit) {
                // Get TTL to show when they can try again
                const ttl = await redis.ttl(key);
                const retryAfter = ttl > 0 ? ttl : limits.window;

                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: `You can only add ${limit} ${action} per day. Try again in ${getTimeUntilReset(retryAfter)}.`,
                    limit,
                    remaining: 0,
                    retryAfter,
                });
            }

            // Increment count
            if (count === 0) {
                // First request - set with expiry
                await redis.setex(key, limits.window, 1);
            } else {
                // Increment existing
                await redis.incr(key);
            }

            // Add rate limit info to response headers
            const ttl = await redis.ttl(key);
            res.set({
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': (limit - count - 1).toString(),
                'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + ttl).toString(),
            });

            // Also attach to request for controllers to use
            req.rateLimit = {
                action,
                limit,
                remaining: limit - count - 1,
                resetIn: ttl,
            };

            next();
        } catch (error) {
            console.error(`Rate limiting error for ${action}:`, error.message);
            // On error, allow the request (fail-open)
            next();
        }
    };
};

/**
 * Get current rate limit status for a user
 * Used by API to show remaining quota
 */
const getRateLimitStatus = async (userId, action) => {
    const redis = getRedis();
    const limits = RATE_LIMITS[action];

    if (!redis || !isRedisConnected() || !limits) {
        return null;
    }

    const key = getRateLimitKey(userId, action);

    try {
        const [count, ttl] = await Promise.all([
            redis.get(key),
            redis.ttl(key),
        ]);

        const currentCount = parseInt(count) || 0;

        return {
            action,
            limit: limits.user, // Will be overridden by caller if admin
            used: currentCount,
            remaining: Math.max(0, limits.user - currentCount),
            resetIn: ttl > 0 ? ttl : null,
        };
    } catch (error) {
        console.error('Error getting rate limit status:', error.message);
        return null;
    }
};

module.exports = {
    createRateLimiter,
    getRateLimitStatus,
    RATE_LIMITS,
};
