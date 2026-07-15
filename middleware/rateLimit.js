import rateLimit from 'express-rate-limit';

// Generous ceiling for normal API traffic — mainly a backstop against runaway clients.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tight limit on login/register — the main brute-force / credential-stuffing target.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many sign-in attempts — please wait 15 minutes and try again.' },
});
