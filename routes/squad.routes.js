import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as squad from '../controllers/squad.controller.js';

const router = Router();
router.get('/',           requireAuth, asyncHandler(squad.getSquad));
router.put('/',           requireAuth, asyncHandler(squad.saveSquad));
router.post('/transfer',  requireAuth, asyncHandler(squad.transfer));
export default router;
