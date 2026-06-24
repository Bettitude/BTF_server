import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFields, validateSport } from '../middleware/validate.js';
import * as league from '../controllers/league.controller.js';

const router = Router();

// POST /api/leagues/create
router.post('/create',
  requireAuth,
  requireFields('franchiseName', 'ownerName'),
  validateSport,
  asyncHandler(league.create)
);

// POST /api/leagues/register-league  (legacy route — client still calls this)
router.post('/register-league',
  requireFields('franchiseName', 'ownerName'),
  validateSport,
  asyncHandler(league.registerLeague)
);

// GET /api/leagues/:id
router.get('/:id',
  requireAuth,
  asyncHandler(league.getById)
);

// PUT /api/leagues/:id/settings
router.put('/:id/settings',
  requireAuth,
  asyncHandler(league.updateSettings)
);

// POST /api/leagues/:id/advance-week
router.post('/:id/advance-week',
  requireAuth,
  asyncHandler(league.advanceWeek)
);

export default router;
