import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as trade from '../controllers/trade.controller.js';

const router = Router();

// POST /api/trades/propose
router.post('/propose', requireAuth, asyncHandler(trade.proposeTrade));

export default router;
