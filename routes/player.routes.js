import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as players from '../controllers/player.controller.js';

const router = Router();

// GET /api/players?sport=soccer&position=FW&search=mbappe
router.get('/', asyncHandler(players.list));

// GET /api/players/:id?sport=soccer
router.get('/:id', asyncHandler(players.getById));

// POST /api/players/seed?sport=soccer  (admin only)
router.post('/seed', requireAdmin, asyncHandler(players.seed));

export default router;
