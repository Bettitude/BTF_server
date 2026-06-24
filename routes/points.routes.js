import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as points from '../controllers/points.controller.js';

const router = Router();
router.get('/me', requireAuth, asyncHandler(points.myPoints));
export default router;
