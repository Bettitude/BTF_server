import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFields } from '../middleware/validate.js';
import * as activity from '../controllers/activity.controller.js';

const router = Router();

// GET /api/activities/:leagueId?limit=50
router.get('/:leagueId', requireAuth, asyncHandler(activity.list));

// POST /api/activities
router.post('/',
  requireAuth,
  requireFields('leagueId', 'type', 'message'),
  asyncHandler(activity.create)
);

export default router;
