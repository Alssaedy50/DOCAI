// Server-side model discovery and live verification. Provider keys never leave Vercel.
const DEFAULTS = [
  { id: 'gemini-2.5-flash', provider: 'gemini', name: 'Gemini 2.5 Flash', free: null },
  { id: 'gemini-2.0-flash', provider: 'gemini', name: 'Gemini 2.0 Flash', free: null },
  { id: 'llama-3.3-70b-versatile', provider: 'groq', name: 'Llama 3.3 70B · Groq', free: null },
  { id: 'llama-3.1-8b-instant', provider: 'groq', name: 'Llama 3.1 8B Instant · Groq', free: null }
];
function json(res, status, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).send(JSON.stringify(data));
}
async function fetchJson(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || 'HTTP ' + response.status);
    return { response, data };
  } finally { clearTimeout(timer); }
}
async function testModel(model, keys) {
  const key = keys[model.provider];
  if (!key) return null;
  try {
    let url, headers = { 'Content-Type': 'application/json' }, body;
    if (model.provider === 'gemini') {
      url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model.id) + ':generateContent?key=' + encodeURIComponent(key);
      body = { contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }], generationConfig: { temperature: 0, maxOutputTokens: 8 } };
    } else {
      url = model.provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
      headers.Authorization = 'Bearer ' + key;
      if (model.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://alssaedy-clinic-erp.vercel.app';
        headers['X-Title'] = 'DOCAI Clinic ERP';
      }
      body = { model: model.id, messages: [{ role: 'user', content: 'Reply with exactly: OK' }], temperature: 0, max_tokens: 8 };
    }
    const { data } = await fetchJson(url, { method: 'POST', headers, body: JSON.stringify(body) }, 6000);
    const answer = model.provider === 'gemini'
      ? (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim()
      : String(data.choices?.[0]?.message?.content || '').trim();
    return answer ? { ...model, status: 'working', checkedAt: new Date().toISOString(), testResponse: answer.slice(0, 24) } : null;
  } catch (_) { return null; }
}
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return json(res, 200, { configuredProviders: [
      process.env.GEMINI_API_KEY ? 'gemini' : null,
      process.env.GROQ_API_KEY ? 'groq' : null,
      process.env.OPENROUTER_API_KEY ? 'openrouter' : null
    ].filter(Boolean) });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { error: 'Method not allowed' }); }
  const keys = {
    gemini: process.env.GEMINI_API_KEY || '',
    groq: process.env.GROQ_API_KEY || '',
    openrouter: process.env.OPENROUTER_API_KEY || ''
  };
  if (!Object.values(keys).some(Boolean)) return json(res, 503, { error: 'لم تُهيأ مفاتيح الذكاء الاصطناعي في بيئة Vercel.' });
  const candidates = DEFAULTS.filter(model => keys[model.provider]);
  if (keys.openrouter) {
    try {
      const { data } = await fetchJson('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: 'Bearer ' + keys.openrouter, 'HTTP-Referer': 'https://alssaedy-clinic-erp.vercel.app', 'X-Title': 'DOCAI Clinic ERP' }
      }, 7000);
      const freeModels = (data.data || [])
        .filter(model => String(model.id || '').endsWith(':free') || (Number(model.pricing?.prompt) === 0 && Number(model.pricing?.completion) === 0))
        .filter(model => !/embedding|moderation|audio|tts|image-generation/i.test(model.id || ''))
        .slice(0, 25)
        .map(model => ({ id: model.id, provider: 'openrouter', name: model.name || model.id, free: true }));
      candidates.push(...freeModels);
    } catch (_) {}
  }
  const unique = [...new Map(candidates.map(model => [model.provider + ':' + model.id, model])).values()];
  const verified = [];
  // Small concurrent batches keep provider rate limits and function duration bounded.
  for (let i = 0; i < unique.length; i += 5) {
    const batch = await Promise.all(unique.slice(i, i + 5).map(model => testModel(model, keys)));
    verified.push(...batch.filter(Boolean));
  }
  return json(res, 200, { models: verified, tested: unique.length, passed: verified.length, checkedAt: new Date().toISOString() });
};
