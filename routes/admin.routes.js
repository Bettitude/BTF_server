import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import * as admin from '../controllers/admin.controller.js';

const router = Router();
router.get('/users',                           requireAdmin, asyncHandler(admin.listUsers));
router.post('/seed',                           requireAdmin, asyncHandler(admin.seedAll));
router.post('/import-players',                 requireAdmin, asyncHandler(admin.importPlayers));
router.post('/sync-fixtures',                  requireAdmin, asyncHandler(admin.syncFixtures));
router.post('/sync-stats',                     requireAdmin, asyncHandler(admin.syncStats));
router.post('/recompute-ratings',              requireAdmin, asyncHandler(admin.recomputeRatings));
router.patch('/fixtures/:id',                  requireAdmin, asyncHandler(admin.updateFixture));
router.put('/players/:playerId/stats',         requireAdmin, asyncHandler(admin.updatePlayerStats));
router.put('/players/:playerId/injury',        requireAdmin, asyncHandler(admin.updatePlayerInjuryStatus));
router.patch('/gameweeks/:id/current',         requireAdmin, asyncHandler(admin.setCurrentGameweek));
router.patch('/gameweeks/:id/finish',          requireAdmin, asyncHandler(admin.finishGameweek));
export default router;
