'use strict';

const { authorize } = require('./_security');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!(await authorize(req, res, 'stt', 12, 60000))) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body); } catch (_) { return {}; } })()
    : (req.body || {});
  const base64 = String(body.audioBase64 || '').replace(/^data:[^,]+,/, '');
  const mime = String(body.mimeType || 'audio/webm').split(';')[0].toLowerCase();
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return res.status(400).json({ error: 'ملف الصوت غير صالح.' });
  }
  if (base64.length > 4000000) {
    return res.status(413).json({ error: 'حجم التسجيل كبير؛ أوقف التسجيل وأرسله على مقاطع أقصر.' });
  }
  if (!['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'].includes(mime)) {
    return res.status(415).json({ error: 'صيغة الصوت غير مدعومة.' });
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({ error: 'GROQ_API_KEY غير مضبوط في بيئة الخادم.' });

  const extension = mime === 'audio/mp4' ? 'm4a' : mime === 'audio/mpeg' ? 'mp3' : mime === 'audio/wav' ? 'wav' : mime === 'audio/ogg' ? 'ogg' : 'webm';
  const form = new FormData();
  form.append('file', new Blob([Buffer.from(base64, 'base64')], { type: mime }), 'voice.' + extension);
  form.append('model', 'whisper-large-v3');
  form.append('language', 'ar');
  form.append('prompt', 'نظام عيادة طب وجراحة الفم والأسنان، سند قبض، كشف، حشوة، عصب، خلع، تقويم، تركيبات، ريال يمني.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key },
      body: form,
      signal: controller.signal
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status === 429 ? 429 : 502).json({
        error: upstream.status === 429 ? 'حصة تفريغ الصوت ممتلئة مؤقتًا.' : 'تعذر تفريغ التسجيل عبر Groq.'
      });
    }
    const text = String(data.text || '').trim();
    if (!text) return res.status(422).json({ error: 'لم يتم التعرف على كلام واضح في التسجيل.' });
    return res.status(200).json({ text });
  } catch (error) {
    return res.status(502).json({ error: error.name === 'AbortError' ? 'انتهت مهلة تفريغ الصوت.' : 'تعذر الاتصال بخدمة تفريغ الصوت.' });
  } finally {
    clearTimeout(timer);
  }
};
