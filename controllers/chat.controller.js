import crypto from 'crypto';
import * as store from '../store/runtimeStore.js';
import { ok } from '../utils/response.js';

export async function list(req, res) {
  const room  = req.query.room  || 'global';
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  const messages = store.chatMessages.filter(m => m.room === room).slice(-limit);
  return res.json(ok(messages));
}

export async function send(req, res) {
  const { content, room = 'global' } = req.body;
  const user = req.user;
  const username = user.email?.split('@')[0] ?? 'user';

  const message = {
    id: `msg_${crypto.randomBytes(6).toString('hex')}`,
    user_id: user.id,
    username,
    room,
    content,
    created_at: new Date().toISOString(),
  };
  store.chatMessages.push(message);

  return res.status(201).json(ok(message));
}
