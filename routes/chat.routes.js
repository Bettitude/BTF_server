import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFields } from '../middleware/validate.js';
import * as chat from '../controllers/chat.controller.js';

const router = Router();

router.get('/rooms',                    requireAuth, asyncHandler(chat.listRooms));
router.post('/dm',                      requireAuth, requireFields('userId'),  asyncHandler(chat.startDm));
router.get('/rooms/:roomId/messages',   requireAuth, asyncHandler(chat.listMessages));
router.post('/rooms/:roomId/messages',  requireAuth, requireFields('content'), asyncHandler(chat.sendMessage));
router.delete('/messages/:msgId',        requireAuth, asyncHandler(chat.deleteMessage));

export default router;
