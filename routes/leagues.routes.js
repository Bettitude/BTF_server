import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as leagues from '../controllers/leagues.controller.js';

const router = Router();
router.get('/',              requireAuth, asyncHandler(leagues.myLeagues));
router.post('/',             requireAuth, asyncHandler(leagues.create));
router.post('/join',         requireAuth, asyncHandler(leagues.join));
router.get('/global',        asyncHandler(leagues.globalLeague));
router.get('/:id/standings', requireAuth, asyncHandler(leagues.standings));
export default router;
