import { env } from '../config/env.js';

// Fire-and-forget email notifications via the Google Apps Script web app
// (see server/email-apps-script.gs for the receiving side + deploy steps).
//
// Never awaited in request paths and never throws — a down/misconfigured
// email hook must not break signups, logins, or saves.

export function sendEventEmail(to, event, data = {}) {
  if (!env.EMAIL_WEBHOOK_URL || !to) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  fetch(env.EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Apps Script web apps answer POSTs after a 302 redirect — Node's fetch follows it
    body: JSON.stringify({ secret: env.EMAIL_WEBHOOK_SECRET, to, event, data }),
    signal: controller.signal,
  })
    .then(res => res.json().catch(() => ({})))
    .then(out => {
      if (out && out.ok === false) console.warn(`[email] ${event} → ${to} failed: ${out.error}`);
    })
    .catch(err => console.warn(`[email] ${event} → ${to} failed: ${err.message}`))
    .finally(() => clearTimeout(timeout));
}
