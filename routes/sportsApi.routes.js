import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as sportsApi from '../controllers/sportsApi.controller.js';

const router = Router();

// GET /api/sports/status          — verify key + check quota
router.get('/status', asyncHandler(sportsApi.apiStatus));

// GET /api/sports/live            — WC matches live right now
router.get('/live', asyncHandler(sportsApi.liveFixtures));

// GET /api/sports/fixtures        — all WC fixtures
// GET /api/sports/fixtures?round=Group+Stage+-+1
router.get('/fixtures', asyncHandler(sportsApi.fixtures));

// GET /api/sports/player/:playerId — player stats in WC2026
router.get('/player/:playerId', asyncHandler(sportsApi.playerStats));

// GET /api/sports/standings       — WC group standings
router.get('/standings', asyncHandler(sportsApi.worldCupStandings));

export default router;
