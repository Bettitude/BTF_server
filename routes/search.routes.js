import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import * as search from '../controllers/search.controller.js';

const router = Router();

router.get('/',      optionalAuth, asyncHandler(search.search));
router.get('/users', requireAuth,  asyncHandler(search.searchUsers));

export default router;
