import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as search from '../controllers/search.controller.js';

const router = Router();

router.get('/', asyncHandler(search.search));

export default router;
