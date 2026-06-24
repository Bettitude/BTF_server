import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as fixtures from '../controllers/fixtures.controller.js';

const router = Router();
router.get('/',     asyncHandler(fixtures.list));
router.get('/live', asyncHandler(fixtures.live));
export default router;
