'use strict';

const crypto = require('crypto');
const localWindows = new Map();
const DEFAULT_WINDOW_MS = 60_000;

function sendError(res, status, error) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(status).json({ error });
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function requestIp(req) {
  return String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown')
    .split(',')[0].trim().slice(0, 100) || 'unknown';
}

async function consumeDistributedLimit(req, scope, limit, windowMs) {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || '';
  if (!url || !token) return null;

  const ipHash = crypto.createHash('sha256').update(requestIp(req)).digest('hex').slice(0, 32);
  const bucket = Math.floor(Date.now() / windowMs);
  const key = 'docai:rl:' + scope + ':' + ipHash + ':' + bucket;
  const response = await fetch(url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify([['INCR', key], ['PEXPIRE', key, windowMs]])
  });
  if (!response.ok) throw new Error('Shared rate-limit service unavailable');
  const results = await response.json();
  const count = Number(results?.[0]?.result);
  if (!Number.isFinite(count)) throw new Error('Invalid shared rate-limit response');
  return count <= limit;
}

function consumeLocalLimit(req, scope, limit, windowMs) {
  const key = scope + ':' + requestIp(req);
  const now = Date.now();
  let current = localWindows.get(key);
  if (!current || now - current.start >= windowMs) {
    current = { start: now, count: 0 };
    localWindows.set(key, current);
  }
  current.count += 1;
  if (localWindows.size > 5000) {
    for (const [entry, value] of localWindows) {
      if (now - value.start >= windowMs) localWindows.delete(entry);
    }
  }
  return current.count <= limit;
}

async function authorize(req, res, scope, limit = 20, windowMs = DEFAULT_WINDOW_MS) {
  const expected = process.env.DOCAI_CLINIC_ACCESS_TOKEN || '';
  if (expected.length < 32) {
    sendError(res, 503, 'لم يُضبط رمز وصول العيادة على الخادم بعد.');
    return false;
  }
  const authorization = String(req.headers.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match || !safeEqual(match[1], expected)) {
    sendError(res, 401, 'رمز الوصول غير صحيح أو غير موجود. أدخله في إعدادات DOCAI.');
    return false;
  }

  try {
    const distributed = await consumeDistributedLimit(req, scope, limit, windowMs);
    const allowed = distributed === null
      ? consumeLocalLimit(req, scope, limit, windowMs)
      : distributed;
    if (!allowed) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      sendError(res, 429, 'تم تجاوز حد الطلبات مؤقتًا. حاول بعد قليل.');
      return false;
    }
  } catch (_) {
    sendError(res, 503, 'تعذر التحقق من حد الطلبات المشترك. حاول لاحقًا.');
    return false;
  }
  return true;
}

module.exports = { authorize };
