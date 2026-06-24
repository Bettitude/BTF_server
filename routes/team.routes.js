import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as team from '../controllers/team.controller.js';

const router = Router();

// GET /api/teams/:id
router.get('/:id', requireAuth, asyncHandler(team.getTeam));

// GET /api/teams/:id/roster?sport=soccer
router.get('/:id/roster', requireAuth, asyncHandler(team.getRoster));

// PUT /api/teams/:id/lineup
router.put('/:id/lineup', requireAuth, asyncHandler(team.updateLineup));

// GET /api/teams/league/:leagueId/standings
router.get('/league/:leagueId/standings', requireAuth, asyncHandler(team.getStandings));

export default router;
