module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const text = String(body.text || '').trim();
  if (text.length > 200) return res.status(413).json({ error: 'قسّم النص إلى مقاطع لا تتجاوز 200 حرف.' });
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({ error: 'GROQ_API_KEY is not configured for server-side speech.' });
  if (!text) return res.status(400).json({ error: 'النص فارغ.' });
  const voices = ['abdullah', 'fahad', 'sultan', 'lulwa', 'noura', 'aisha'];
  const voice = voices.includes(String(body.voice || '').toLowerCase()) ? String(body.voice).toLowerCase() : 'fahad';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'canopylabs/orpheus-arabic-saudi', voice, input: text, response_format: 'wav' }),
      signal: controller.signal
    });
    if (!response.ok) return res.status(response.status === 429 ? 429 : 502).json({ error: response.status === 429 ? 'حصة الصوت ممتلئة مؤقتاً.' : 'تعذر توليد الصوت السحابي.' });
    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', String(audio.length));
    return res.status(200).send(audio);
  } catch (error) {
    return res.status(502).json({ error: error.name === 'AbortError' ? 'انتهت مهلة توليد الصوت.' : 'تعذر الاتصال بخدمة الصوت.' });
  } finally {
    clearTimeout(timeout);
  }
};
