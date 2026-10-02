import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Rate limiting keyed by IP and account to prevent credential and OTP brute-force
export const authAccountRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  validate: false,
  keyGenerator: (req) => {
    const account = (req.body?.email || req.body?.identifier || '').toLowerCase().trim();
    return `${req.ip}_${account}`;
  },
  message: {
    success: false,
    message: 'Too many attempts for this account or IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
