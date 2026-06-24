import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as auth from '../controllers/auth.controller.js';

const router = Router();
router.post('/register', asyncHandler(auth.register));
router.post('/login',    asyncHandler(auth.login));
router.post('/logout',   asyncHandler(auth.logout));
router.get('/me',        requireAuth, asyncHandler(auth.me));
export default router;
