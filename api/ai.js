// Vercel serverless endpoint for DOCAI. Provider keys stay server-side.
const DEFAULT_MODELS = {
  gemini: ["gemini-2.5-flash", "gemini-2.0-flash"],
  groq: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"]
};
const { authorize } = require('./_security');
function send(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.send(JSON.stringify(body));
}
async function fetchJson(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || data?.error || "HTTP " + response.status);
    return data;
  } finally { clearTimeout(timer); }
}
function responseText(data, provider) {
  if (provider === "gemini") return data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim() || "";
  return data?.choices?.[0]?.message?.content?.trim() || "";
}
async function askGemini(key, model, systemPrompt, userPrompt, imageBase64) {
  const parts = [{ text: (systemPrompt || "أجب باللغة العربية بدقة واحتراف.") + "\n\nطلب المستخدم: " + userPrompt }];
  if (imageBase64) {
    const raw = String(imageBase64);
    const match = raw.match(/^data:([^;,]+);base64,(.+)$/s);
    parts.push({ inline_data: { mime_type: match?.[1] || "image/jpeg", data: match?.[2] || raw.replace(/^data:[^,]+,/, "") } });
  }
  const data = await fetchJson("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(key), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.25, maxOutputTokens: 700 } })
  });
  return responseText(data, "gemini");
}
async function askCompatible(url, key, model, systemPrompt, userPrompt, imageBase64, extraHeaders = {}) {
  let content = userPrompt;
  if (imageBase64) {
    const imageUrl = String(imageBase64).startsWith("data:") ? imageBase64 : "data:image/jpeg;base64," + imageBase64;
    content = [{ type: "text", text: userPrompt }, { type: "image_url", image_url: { url: imageUrl } }];
  }
  const data = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key, ...extraHeaders },
    body: JSON.stringify({
      model, messages: [
        { role: "system", content: systemPrompt || "أجب باللغة العربية بدقة واحتراف." },
        { role: "user", content }
      ], temperature: 0.25, max_tokens: 700
    })
  });
  return responseText(data, "compatible");
}
module.exports = async function handler(req, res) {
  if (!(await authorize(req, res, 'ai', 20, 60000))) return;
  if (req.method === "GET") {
    return send(res, 200, { ok: true, configuredProviders: [
      process.env.GEMINI_API_KEY ? "gemini" : null,
      process.env.GROQ_API_KEY ? "groq" : null,
      process.env.OPENROUTER_API_KEY ? "openrouter" : null
    ].filter(Boolean) });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "الطريقة غير مدعومة" });
  }
  const body = req.body || {};
  const userPrompt = String(body.userPrompt || body.prompt || "").trim().slice(0, 16000);
  const systemPrompt = String(body.systemPrompt || "").slice(0, 12000);
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : null;
  const attachmentMime = imageBase64 ? ((String(imageBase64).match(/^data:([^;,]+)/i) || [])[1] || "image/jpeg").toLowerCase() : "";
  const isPdfAttachment = attachmentMime === "application/pdf" || String(imageBase64 || "").startsWith("data:application/pdf;");
  const modelId = String(body.modelId || "auto");
  if (!userPrompt && !imageBase64) return send(res, 400, { error: "اكتب سؤالاً أو أرفق صورة أولاً" });
  if (imageBase64 && imageBase64.length > 8000000) return send(res, 413, { error: "حجم الصورة كبير؛ قلّل حجمها ثم أعد المحاولة" });

  const providers = [];
  if (process.env.GEMINI_API_KEY) providers.push({ name: "gemini", key: process.env.GEMINI_API_KEY });
  if (process.env.GROQ_API_KEY) providers.push({ name: "groq", key: process.env.GROQ_API_KEY });
  if (process.env.OPENROUTER_API_KEY) providers.push({ name: "openrouter", key: process.env.OPENROUTER_API_KEY });
  if (!providers.length) return send(res, 503, { error: "لم يجد الخادم مفاتيح GEMINI_API_KEY أو GROQ_API_KEY أو OPENROUTER_API_KEY في بيئة Vercel الحالية" });

  const preferred = modelId === "auto" ? null : (modelId.startsWith("gemini") ? "gemini" : (modelId.includes("/") || modelId.endsWith(":free") ? "openrouter" : "groq"));
  if (preferred) providers.sort((a, b) => Number(b.name === preferred) - Number(a.name === preferred));
  const failures = [];
  for (const provider of providers) {
    let answer = "";
    let usedModel = "";
    try {
      if (provider.name === "gemini") {
        const candidates = preferred === "gemini" ? [modelId] : DEFAULT_MODELS.gemini;
        for (const model of candidates) {
          try { answer = await askGemini(provider.key, model, systemPrompt, userPrompt, imageBase64); usedModel = model; if (answer) break; }
          catch (e) { failures.push("Gemini " + model + ": " + e.message); }
        }
      } else if (provider.name === "groq") {
        if (isPdfAttachment) { failures.push("Groq: PDF attachments are supported only by Gemini in this endpoint"); continue; }
        const candidates = preferred === "groq" ? [modelId] : DEFAULT_MODELS.groq;
        for (const model of candidates) {
          try { answer = await askCompatible("https://api.groq.com/openai/v1/chat/completions", provider.key, model, systemPrompt, userPrompt, imageBase64); usedModel = model; if (answer) break; }
          catch (e) { failures.push("Groq " + model + ": " + e.message); }
        }
      } else {
        if (isPdfAttachment) { failures.push("OpenRouter: PDF attachments are supported only by Gemini in this endpoint"); continue; }
        const headers = { "HTTP-Referer": "https://alssaedy-clinic-erp.vercel.app", "X-Title": "DOCAI Clinic ERP" };
        let candidates = preferred === "openrouter" && modelId !== "openrouter/auto" ? [modelId] : [];
        if (!candidates.length) {
          try {
            const catalog = await fetchJson("https://openrouter.ai/api/v1/models", { headers: { Authorization: "Bearer " + provider.key, ...headers } }, 9000);
            candidates = (catalog.data || []).filter(m => String(m.id || "").endsWith(":free") || (Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0))
              .filter(m => !/embedding|moderation|audio|tts/i.test(m.id || "")).slice(0, 5).map(m => m.id);
          } catch (e) { failures.push("OpenRouter model discovery: " + e.message); }
        }
        for (const model of candidates) {
          try { answer = await askCompatible("https://openrouter.ai/api/v1/chat/completions", provider.key, model, systemPrompt, userPrompt, imageBase64, headers); usedModel = model; if (answer) break; }
          catch (e) { failures.push("OpenRouter " + model + ": " + e.message); }
        }
      }
      if (answer) return send(res, 200, { text: answer, provider: provider.name, model: usedModel });
    } catch (e) { failures.push(provider.name + ": " + e.message); }
  }
  return send(res, 502, { error: failures.length ? "تعذر الاتصال بالنماذج المتاحة: " + failures.slice(-4).join(" | ") : "لم يُرجع أي مزود استجابة نصية. افحص صلاحية المفاتيح والحصص في Vercel." });
};
