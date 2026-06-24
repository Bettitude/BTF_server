import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import * as admin from '../controllers/admin.controller.js';

const router = Router();
router.post('/seed',                           requireAdmin, asyncHandler(admin.seedAll));
router.post('/import-players',                 requireAdmin, asyncHandler(admin.importPlayers));
router.patch('/fixtures/:id',                  requireAdmin, asyncHandler(admin.updateFixture));
router.put('/players/:playerId/stats',         requireAdmin, asyncHandler(admin.updatePlayerStats));
export default router;
