import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFields } from '../middleware/validate.js';
import * as chat from '../controllers/chat.controller.js';

const router = Router();

router.get('/',  requireAuth, asyncHandler(chat.list));
router.post('/', requireAuth, requireFields('content'), asyncHandler(chat.send));

export default router;
