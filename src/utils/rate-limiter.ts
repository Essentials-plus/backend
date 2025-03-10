import { rateLimit } from "express-rate-limit";

/*

Explanation of the Configurations
    Admin Rate Limiter:
        Admin APIs are usually sensitive and used less frequently. A stricter limit (e.g., 50 requests per 15 minutes) can help mitigate potential abuse.
    User Rate Limiter:
        Regular user APIs have moderate usage. A limit of 100 requests per 15 minutes is reasonable for most use cases.
    Guest Rate Limiter:
        Guest APIs are similar to public APIs but might need stricter limits to encourage users to sign up. A limit of 20 requests per 15 minutes can help balance access and prevent abuse.
    Public Rate Limiter:
        Public APIs often handle high traffic. A higher limit (e.g., 200 requests per minute) ensures smooth operation for non-authenticated users.

*/

// Define rate limiters
export const adminRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 200, // 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

export const userRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

export const guestRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
