import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as notif from '../controllers/notifications.controller.js';

const router = Router();

router.get('/',         requireAuth, asyncHandler(notif.list));
router.patch('/read',   requireAuth, asyncHandler(notif.markRead));

export default router;
