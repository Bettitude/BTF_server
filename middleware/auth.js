import { supabaseAnon } from '../config/supabase.js';
import { unauthorized } from '../utils/response.js';

// Verify Supabase JWT and attach user to req.user
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json(unauthorized('No auth token provided'));
  }

  const token = header.slice(7);

  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json(unauthorized('Invalid or expired token'));
  }

  req.user = user;
  next();
}

// Same as requireAuth but only for admin role
export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    const role = req.user?.app_metadata?.role;
    if (role !== 'admin') {
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

  const token = header.slice(7);
  const { data: { user } } = await supabaseAnon.auth.getUser(token);
  req.user = user || null;
  next();
}
