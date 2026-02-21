import { NextResponse } from 'next/server';

// In-memory store: Map<string, { count: number, resetTime: number }>
const rateLimitStore = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30;

// Clean up expired entries every 5 minutes
let lastCleanup = Date.now();
function cleanupExpired() {
    const now = Date.now();
    if (now - lastCleanup < 5 * 60 * 1000) return;
    lastCleanup = now;
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Extract client IP from request headers
 */
function getClientIP(request) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;
    return '127.0.0.1';
}

/**
 * Check rate limit for a request.
 * @param {Request} request - The incoming request
 * @returns {NextResponse|null} - Returns a 429 response if rate limited, null if allowed
 */
export function checkRateLimit(request) {
    cleanupExpired();

    const ip = getClientIP(request);
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry || now > entry.resetTime) {
        // New window
        rateLimitStore.set(ip, { count: 1, resetTime: now + WINDOW_MS });
        return null;
    }

    entry.count += 1;

    if (entry.count > MAX_REQUESTS) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return NextResponse.json(
            {
                error: 'Too many requests. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
            },
            {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfter),
                    'X-RateLimit-Limit': String(MAX_REQUESTS),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
                },
            }
        );
    }

    return null;
}
