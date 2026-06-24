import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as players from '../controllers/players.controller.js';

const router = Router();
router.get('/',    asyncHandler(players.list));
router.get('/:id', asyncHandler(players.getById));
export default router;
