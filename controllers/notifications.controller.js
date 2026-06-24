import crypto from 'crypto';
import * as store from '../store/runtimeStore.js';
import { ok } from '../utils/response.js';

export async function list(req, res) {
  const notifs = store.notifications.get(req.user.id) || [];
  return res.json(ok(notifs.slice(0, 20)));
}

export async function markRead(req, res) {
  const notifs = store.notifications.get(req.user.id) || [];
  notifs.forEach(n => { n.is_read = true; });
  return res.json(ok({ marked: true }));
}

// Internal helper — call from other controllers to create a notification
export function createNotification(userId, type, message, link = null) {
  const notifs = store.notifications.get(userId) || [];
  notifs.unshift({
    id: `notif_${crypto.randomBytes(6).toString('hex')}`,
    user_id: userId, type, message, link,
    is_read: false, created_at: new Date().toISOString(),
  });
  store.notifications.set(userId, notifs);
}
