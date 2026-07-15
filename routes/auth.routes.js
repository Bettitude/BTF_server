import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import * as auth from '../controllers/auth.controller.js';

const router = Router();
router.post('/register', authLimiter, asyncHandler(auth.register));
router.post('/login',    authLimiter, asyncHandler(auth.login));
router.post('/logout',   asyncHandler(auth.logout));
router.get('/me',        requireAuth, asyncHandler(auth.me));
router.patch('/me',      requireAuth, asyncHandler(auth.updateProfile));
router.delete('/me',     requireAuth, asyncHandler(auth.closeAccount));
export default router;
