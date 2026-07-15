import { env } from '../config/env.js';

// Centralised error handler — must be registered last in app.js
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isDev = env.NODE_ENV === 'development';

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}`, err.message);
  if (isDev) console.error(err.stack);

  // Unexpected (5xx) errors often carry raw DB internals (table/constraint names) in
  // err.message — only surface that detail in development, never to a live client.
  const safeMessage = (!isDev && status >= 500) ? 'Internal server error' : (err.message || 'Internal server error');

  res.status(status).json({
    success: false,
    error: safeMessage,
    ...(isDev && { stack: err.stack }),
  });
}

// Wrap async route handlers so thrown errors go to errorHandler
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
