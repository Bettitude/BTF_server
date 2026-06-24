import { badRequest } from '../utils/response.js';

// Ensure listed fields exist and are non-empty in req.body
export function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => {
      const val = req.body[f];
      return val === undefined || val === null || val === '';
    });

    if (missing.length > 0) {
      return res.status(400).json(
        badRequest(`Missing required fields: ${missing.join(', ')}`)
      );
    }

    next();
  };
}

// Validate sport is one of the allowed values
export function validateSport(req, res, next) {
  const { sport } = req.body;
  const allowed = ['soccer', 'nfl'];

  if (sport && !allowed.includes(sport)) {
    return res.status(400).json(
      badRequest(`Invalid sport. Must be one of: ${allowed.join(', ')}`)
    );
  }

  next();
}
