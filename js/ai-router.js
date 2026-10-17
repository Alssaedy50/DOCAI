/* DOCAI GEMINI ERP — AI router with live provider discovery and per-model verification. */
window.AI_MODELS_CATALOG = window.AI_MODELS_CATALOG || [];
const AI_DISCOVERY_LIMIT = 40;
const AI_TEST_PROMPT = 'Reply with the single word OK.';

function aiModelLabel(id, provider) {
  const short = String(id).split('/').pop().replace(/:free$/i, ' (Free)');
  return `${short} — ${provider}`;
}
function aiResponseText(data, provider) {
  if (provider === 'gemini') return data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  return data?.choices?.[0]?.message?.content || '';
}
async function fetchWithTimeout(url, options = {}, timeoutMs = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
function syncAIKeysFromSettingsForm(allowClear = false) {
  const ai = window.AppState?.settings?.ai;
  if (!ai) return;
  const fields = { geminiKey: 'cfg-gemini-key', groqKey: 'cfg-groq-key', openrouterKey: 'cfg-openrouter-key' };
  let changed = false;
  Object.entries(fields).forEach(([key, id]) => {
    const input = document.getElementById(id);
    if (!input) return;
    const value = input.value.trim();
    if (value || allowClear) { if (ai[key] !== value) { ai[key] = value; changed = true; } }
  });
  if (changed) window.saveSettingsState?.();
  return ai;
}
function inferAIProvider(modelId) {
  const id = String(modelId || '');
  if (/^gemini[-/]/i.test(id)) return 'gemini';
  if (id.includes('/')) return 'openrouter';
  return 'groq';
}
async function testOneModel(model, settings) {
  try {
    let res, data;
    if (model.provider === 'gemini') {
      if (!settings.geminiKey) return false;
      res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.id)}:generateContent?key=${encodeURIComponent(settings.geminiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: AI_TEST_PROMPT }] }], generationConfig: { maxOutputTokens: 8, temperature: 0 } })
      });
    } else if (model.provider === 'groq') {
      if (!settings.groqKey) return false;
      res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.groqKey}` },
        body: JSON.stringify({ model: model.id, messages: [{ role: 'user', content: AI_TEST_PROMPT }], max_tokens: 8, temperature: 0 })
      });
    } else if (model.provider === 'openrouter') {
      if (!settings.openrouterKey) return false;
      res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.openrouterKey}`,  'HTTP-Referer': location.origin, 'X-Title': 'DOCAI-GEMINI ERP' },
        body: JSON.stringify({ model: model.id, messages: [{ role: 'user', content: AI_TEST_PROMPT }], max_tokens: 8, temperature: 0 })
      });
    } else return false;
    data = await res.json().catch(() => ({}));
    if (!res.ok) { model.lastError = data?.error?.message || `HTTP ${res.status}`; return false; }
    const answer = aiResponseText(data, model.provider);
    return Boolean(answer.trim());
  } catch (err) { model.lastError = err?.name === 'AbortError' ? 'انتهت مهلة الاتصال' : (err?.message || 'فشل الاتصال'); return false; }
}

window.testAndDiscoverAllModels = async function() {
  if (window.__docaiModelDiscoveryRunning) {
    if (window.showToast) window.showToast('فحص النماذج جارٍ بالفعل؛ انتظر حتى يكتمل.', 'info');
    return window.AI_MODELS_CATALOG || [];
  }
  window.__docaiModelDiscoveryRunning = true;
  try {
  const settings = syncAIKeysFromSettingsForm(true) || window.AppState?.settings?.ai || {};
  const discovered = [];
  const statuses = { gemini: 'لم يُفحص', groq: 'لم يُفحص', openrouter: 'لم يُفحص' };
  if (window.showToast) window.showToast('جارٍ اكتشاف النماذج من المزودين ثم اختبار كل نموذج على حدة…', 'info');

  // Gemini: list models that advertise generateContent support.
  if (settings.geminiKey) {
    try {
      const r = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(settings.geminiKey)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
      (d.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .filter(m => !/embedding|aqa|imagen|veo|tts/i.test(m.name || ''))
        .slice(0, AI_DISCOVERY_LIMIT)
        .forEach(m => { const id = (m.name || '').replace(/^models\//, ''); if (id) discovered.push({ id, name: m.displayName || aiModelLabel(id, 'Gemini'), provider: 'gemini', free: null, access: 'key-required', vision: /vision|flash|pro/i.test(id), source: 'live' }); });
      statuses.gemini = `${discovered.filter(m => m.provider === 'gemini').length} مرشحًا`;
    } catch (e) { statuses.gemini = `تعذر الاكتشاف: ${e.message}`; }
  } else statuses.gemini = 'أضف مفتاح Gemini في الإعدادات';

  if (settings.groqKey) {
    try {
      const r = await fetchWithTimeout('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${settings.groqKey}` } });
      const d = await r.json(); if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
      (d.data || []).filter(m => m.active !== false).filter(m => !/whisper|guard|embed|moderation|tts|orpheus/i.test(m.id || ''))
        .slice(0, AI_DISCOVERY_LIMIT).forEach(m => discovered.push({ id: m.id, name: m.name || aiModelLabel(m.id, 'Groq'), provider: 'groq', free: null, access: 'key-required', vision: /vision/i.test(m.id), source: 'live' }));
      statuses.groq = `${discovered.filter(m => m.provider === 'groq').length} مرشحًا`;
    } catch (e) { statuses.groq = `تعذر الاكتشاف: ${e.message}`; }
  } else statuses.groq = 'أضف مفتاح Groq في الإعدادات';

  if (settings.openrouterKey) {
    try {
      const r = await fetchWithTimeout('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${settings.openrouterKey}`, 'HTTP-Referer': location.origin, 'X-Title': 'DOCAI-GEMINI ERP' } });
      const d = await r.json(); if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
      const freeModels = (d.data || []).filter(m => String(m.id || '').endsWith(':free') || (Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0))
        .filter(m => !/embedding|moderation|audio|tts/i.test(m.id || ''))
        .slice(0, AI_DISCOVERY_LIMIT);
      freeModels.forEach(m => discovered.push({ id: m.id, name: m.name || aiModelLabel(m.id, 'OpenRouter'), provider: 'openrouter', free: true, access: 'free-tier-listed', vision: /vision|vl|llava|gemini/i.test(`${m.id} ${m.name || ''}`), source: 'live' }));
      statuses.openrouter = `${freeModels.length} مرشحًا مجانيًا`;
    } catch (e) { statuses.openrouter = `تعذر الاكتشاف: ${e.message}`; }
  } else statuses.openrouter = 'أضف مفتاح OpenRouter في الإعدادات';

  // Deduplicate and individually test candidates. Test in small batches to avoid burst limits.
  const allUnique = [...new Map(discovered.map(m => [`${m.provider}:${m.id}`, m])).values()];
  const unique = [
    ...allUnique.filter(m => m.provider === 'gemini').slice(0, 15),
    ...allUnique.filter(m => m.provider === 'groq').slice(0, 15),
    ...allUnique.filter(m => m.provider === 'openrouter').slice(0, 30)
  ];
  const verified = [];
  for (let i = 0; i < unique.length; i += 4) {
    const batch = unique.slice(i, i + 4);
    const results = await Promise.all(batch.map(async m => ({ model: m, ok: await testOneModel(m, settings) })));
    results.forEach(({ model, ok }) => { if (ok) verified.push({ ...model, status: 'working', checkedAt: new Date().toISOString() }); });
    if (window.updateModelDiscoveryProgress) window.updateModelDiscoveryProgress(verified.length, unique.length);
  }
  window.AI_MODELS_CATALOG = verified;
  window.AppState.verifiedModels = verified.map(m => m.id);
  window.AppState.verifiedModelDetails = verified;
  window.AppState.modelDiscoveryStatus = statuses;
  window.saveVerifiedModelsState();
  if (window.updateModelSelectDropdown) window.updateModelSelectDropdown();
  const statusText = Object.entries(statuses).map(([k,v]) => `${k}: ${v}`).join(' | ');
  if (window.showToast) window.showToast(`اكتمل الفحص: ${verified.length} نموذجًا اجتاز اختبارًا فعليًا. ${verified.length < 25 ? 'لم تتوفر 25 نماذج عاملة بالمفاتيح والحصص الحالية.' : 'تحقق هدف 25 نموذجًا.'}`, verified.length ? 'success' : 'warning');
  console.info('[DOCAI model discovery]', statusText, verified.map(m => `${m.provider}/${m.id}`));
  return verified;
  } finally {
    window.__docaiModelDiscoveryRunning = false;
  }
};

window.callAI = async function(prompt, imageBase64 = null, options = {}) {
  const settings = syncAIKeysFromSettingsForm(false) || window.AppState?.settings?.ai || {};
  const userText = String(prompt || '').trim();
  if (!userText) throw new Error('يرجى كتابة الرسالة أولاً.');
  // التحيات والأسئلة العامة لا تحتاج إلى قراءة بيانات المرضى أو السجلات المالية.
  const contextIntent = /مريض|مرضى|اسم المريض|رقم الهاتف|هاتف|جوال|سند|سندات|إيراد|ايراد|دخل|قبض|ديون|دين|متبقي|ذمم|مخزون|مواد|مادة|كمية|مصروف|مصاريف|نفقات|تكلفة|تكاليف|ربح|أرباح|خسارة|مالي|تقرير|حساب|رصيد|خدمات|أسعار|اسعار|موعد|مواعيد|today|patient|receipt|inventory|expense|debt|revenue|profit|financial|clinic records/i.test(userText);
  const context = contextIntent && window.ClinicDB ? window.ClinicDB.getSmartContextForQuery(userText) : {};
  const systemPrompt = [
    'أنت مساعد الذكاء الاصطناعي الطبي والإداري لنظام عيادة د. صلاح الدين السعيدي (DOCAI-GEMINI ERP).',
    'أجب بلغة المستخدم، وبالعربية الواضحة عند استخدام العربية. كن مباشرًا ومختصرًا في التحيات والأسئلة البسيطة.',
    'لا تخترع بيانات للعيادة أو للمرضى. عند السؤال عن سجل غير موجود في السياق، وضّح أن البيانات المتاحة لا تكفي.',
    contextIntent ? 'استخدم سياق العيادة المرفق فقط عند الإجابة عن بيانات العيادة.' : '',
    contextIntent ? 'سياق العيادة: ' + JSON.stringify(context) : ''
  ].filter(Boolean).join('\n');
  const liveCatalog = Array.isArray(window.AI_MODELS_CATALOG) ? window.AI_MODELS_CATALOG : [];
  const savedIds = Array.isArray(window.AppState?.verifiedModels) ? window.AppState.verifiedModels : [];
  const restoredCatalog = savedIds.map(id => ({ id, provider: inferAIProvider(id), status: 'working', source: 'saved-verification' }));
  const models = liveCatalog.length ? liveCatalog : restoredCatalog;
  const requested = options.modelId || settings.selectedMode || 'auto';
  let candidates = requested === 'auto' ? models.filter(m => m.status === 'working') : models.filter(m => m.id === requested);
  if (requested === 'auto') candidates = candidates.filter(model => Boolean(settings[`${model.provider}Key`]));
  if (requested !== 'auto' && candidates.length === 0) candidates = [{ id: requested, provider: inferAIProvider(requested) }];
  if (requested === 'auto' && candidates.length === 0) {
    if (settings.geminiKey) candidates.push({ id: 'gemini-2.5-flash', provider: 'gemini' });
    if (settings.groqKey) candidates.push({ id: 'llama-3.3-70b-versatile', provider: 'groq' });
    if (settings.openrouterKey) candidates.push({ id: 'meta-llama/llama-3.3-70b-instruct:free', provider: 'openrouter' });
  }
  if (requested === 'auto') {
    candidates.sort((a,b) => ({gemini:0,groq:1,openrouter:2}[a.provider] ?? 9) - ({gemini:0,groq:1,openrouter:2}[b.provider] ?? 9));
    candidates = candidates.slice(0, 3);
  }
  let lastError;
  const timeoutMs = Math.max(5000, Math.min(Number(options.timeoutMs) || 10000, 20000));
  for (const model of candidates) {
    try {
      if (model.provider === 'gemini' && settings.geminiKey) return await callGeminiAPI(settings.geminiKey, model.id, systemPrompt, userText, imageBase64, timeoutMs);
      if (model.provider === 'groq' && settings.groqKey) return await callGroqAPI(settings.groqKey, model.id, systemPrompt, userText, imageBase64, timeoutMs);
      if (model.provider === 'openrouter' && settings.openrouterKey) return await callOpenRouterAPI(settings.openrouterKey, model.id, systemPrompt, userText, imageBase64, timeoutMs);
    } catch (e) { lastError = e; console.warn(`AI model ${model.id} failed; trying fallback`, e); }
  }
  if (lastError) throw new Error(`تعذر تشغيل النموذج المختار والنماذج البديلة: ${lastError.message}`);
  throw new Error('لا توجد نماذج ذكاء اصطناعي مهيأة أو مجتازة للاختبار. أضف مفتاحًا صالحًا لأحد المزودين من الإعدادات ثم اضغط «فحص النماذج المتاحة».');
};

async function callGeminiAPI(apiKey, model, systemPrompt, userPrompt, imageBase64, timeoutMs = 10000) {
  const parts = [{ text: `${systemPrompt}\n\nطلب المستخدم: ${userPrompt}` }];
  if (imageBase64) { const b64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64; parts.push({ inline_data: { mime_type: 'image/jpeg', data: b64 } }); }
  const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ contents:[{parts}], generationConfig:{temperature:0.3} }) }, timeoutMs);
  const data = await res.json().catch(()=>({})); if (!res.ok) throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
  const text = aiResponseText(data, 'gemini'); if (!text) throw new Error('أعاد Gemini استجابة فارغة'); return text;
}
async function callGroqAPI(apiKey, model, systemPrompt, userPrompt, imageBase64, timeoutMs = 10000) {
  const content = imageBase64 ? [{type:'text',text:userPrompt},{type:'image_url',image_url:{url:imageBase64.startsWith('data:')?imageBase64:`data:image/jpeg;base64,${imageBase64}`}}] : userPrompt;
  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`}, body:JSON.stringify({model,messages:[{role:'system',content:systemPrompt},{role:'user',content}],temperature:0.3}) }, timeoutMs);
  const data=await res.json().catch(()=>({})); if(!res.ok) throw new Error(data?.error?.message||`Groq HTTP ${res.status}`); const text=aiResponseText(data,'groq'); if(!text) throw new Error('أعاد Groq استجابة فارغة'); return text;
}
async function callOpenRouterAPI(apiKey, model, systemPrompt, userPrompt, imageBase64, timeoutMs = 10000) {
  const content = imageBase64 ? [{type:'text',text:userPrompt},{type:'image_url',image_url:{url:imageBase64.startsWith('data:')?imageBase64:`data:image/jpeg;base64,${imageBase64}`}}] : userPrompt;
  const res=await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`,'HTTP-Referer':location.origin,'X-Title':'DOCAI-GEMINI ERP'},body:JSON.stringify({model,messages:[{role:'system',content:systemPrompt},{role:'user',content}],temperature:0.3})},timeoutMs);
  const data=await res.json().catch(()=>({})); if(!res.ok) throw new Error(data?.error?.message||`OpenRouter HTTP ${res.status}`); const text=aiResponseText(data,'openrouter'); if(!text) throw new Error('أعاد OpenRouter استجابة فارغة'); return text;
}

window.parseReceiptWithSmartAI = async function(textInput) {
  const prompt = `استخرج من النص التالي بيانات سند عيادة أسنان. أعد JSON صالحًا فقط بهذه الحقول: patientName (string), patientPhone (string), services (array of strings), totalAmount (number), paidAmount (number), currency (string). النص: ${JSON.stringify(textInput)}`;
  try { const raw = await window.callAI(prompt); const match = raw.match(/\{[\s\S]*\}/); if (match) return JSON.parse(match[0]); }
  catch (e) { console.error('Smart receipt parse error:', e); }
  return null;
};
