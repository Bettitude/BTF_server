import { supabaseAnon } from '../config/supabase.js';
import { unauthorized } from '../utils/response.js';

// Verify the bearer token against real Supabase auth and attach the user to req.user
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json(unauthorized('No auth token provided'));
  }

  const { data, error } = await supabaseAnon.auth.getUser(header.slice(7));
  if (error || !data?.user) {
    return res.status(401).json(unauthorized('Invalid or expired token'));
  }

  req.user = data.user;
  next();
}

// Same as requireAuth but only for admin role (set via user_metadata.role = 'admin')
export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.user?.user_metadata?.role !== 'admin') {
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

  const { data } = await supabaseAnon.auth.getUser(header.slice(7));
  req.user = data?.user || null;
  next();
}
