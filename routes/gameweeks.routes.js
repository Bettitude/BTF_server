import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as gw from '../controllers/gameweeks.controller.js';

const router = Router();
router.get('/',         asyncHandler(gw.list));
router.get('/current',  asyncHandler(gw.current));
export default router;
