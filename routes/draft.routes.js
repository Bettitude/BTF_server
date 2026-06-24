import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as draft from '../controllers/draft.controller.js';

const router = Router();

// GET /api/draft/:leagueId/available?sport=soccer
router.get('/:leagueId/available', requireAuth, asyncHandler(draft.available));

// POST /api/draft/:leagueId/pick
router.post('/:leagueId/pick', requireAuth, asyncHandler(draft.pick));

export default router;
