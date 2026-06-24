import * as store from '../store/runtimeStore.js';
import { unauthorized } from '../utils/response.js';

// Verify the bearer token against the in-memory session store and attach user to req.user
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json(unauthorized('No auth token provided'));
  }

  const user = store.getUserByToken(header.slice(7));
  if (!user) {
    return res.status(401).json(unauthorized('Invalid or expired token'));
  }

  req.user = user;
  next();
}

// Same as requireAuth but only for admin role
export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json(unauthorized('Admin access required'));
    }
    next();
  });
}

// Attach user if token present but don't block if missing
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  req.user = store.getUserByToken(header.slice(7)) || null;
  next();
}
