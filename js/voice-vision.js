
/* ==========================================================================
   DOCAI GEMINI ERP - MODULE 3: DUAL VOICE (PHONE VS AI), LIVE CALL & VISION
   File: js/voice-vision.js
   ========================================================================== */

window.VoiceVisionState = {
  isRecording: false,
  recordingTarget: null, // 'receipt' | 'chat' | 'live'
  recognitionInstance: null,
  mediaRecorder: null,
  audioChunks: [],
  mediaStream: null,
  isSpeaking: false,
  currentAudioObj: null,
  audioContext: null,
  liveCallActive: false,
  liveCallStatus: 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking'
  liveSilenceTimer: null,
  attachment: {
    hasAttachment: false,
    fileName: '',
    fileType: '', // 'image' | 'text' | 'pdf'
    mimeType: '',
    base64Data: null,
    extractedText: ''
  }
};

/* ==================== 1. إدارة وضبط محركات الصوت (الهاتف مقابل النماذج السحابية) ==================== */

window.setVoiceEngineMode = function(kind, mode) {
  if (!window.AppState || !window.AppState.settings) return;
  if (kind === 'stt') {
    window.AppState.settings.ai.sttEngine = mode; // 'phone_native' | 'ai_cloud'
  } else if (kind === 'tts') {
    window.AppState.settings.ai.ttsEngine = mode; // 'phone_native' | 'ai_cloud'
  }
  if (window.saveSettingsState) window.saveSettingsState();
  if (window.updateVoiceBadgesUI) window.updateVoiceBadgesUI();

  const label = mode === 'ai_cloud' ? 'صوت النماذج السحابية (AI Cloud)' : 'صوت الهاتف المحلي (Phone Native)';
  if (window.showToast) {
    window.showToast(`تم ضبط ${kind === 'stt' ? 'الإدخال الصوتي (STT)' : 'النطق الصوتي (TTS)'} على: ${label}`, 'info');
  }
};

window.getActiveVoiceEngines = function() {
  const aiCfg = window.AppState?.settings?.ai || {};
  return {
    stt: aiCfg.sttEngine || 'ai_cloud',
    tts: aiCfg.ttsEngine || 'ai_cloud',
    autoSpeak: aiCfg.autoSpeakReplies !== false
  };
};

/* ==================== 2. محرك الإدخال الصوتي المزدوج (Dual STT: Phone Native vs AI Cloud) ==================== */

window.toggleReceiptVoiceInput = function() {
  window.toggleVoiceInput('ai-smart-input', async (transcribedText) => {
    const inputEl = document.getElementById('ai-smart-input');
    if (inputEl) inputEl.value = transcribedText;
    if (window.showToast) window.showToast('تم التقاط الصوت، جاري تحليل بيانات السند ذكياً...', 'info');
    if (window.handleSmartBarParse) {
      await window.handleSmartBarParse();
    } else if (window.parseReceiptWithSmartAI) {
      await window.parseReceiptWithSmartAI(transcribedText);
    }
  });
};

window.toggleChatVoiceInput = function() {
  window.toggleVoiceInput('chat-user-input', (transcribedText) => {
    const inputEl = document.getElementById('chat-user-input');
    if (inputEl) {
      inputEl.value = transcribedText;
      inputEl.focus();
    }
  });
};

window.toggleVoiceInput = async function(targetInputId, onCompleteCallback = null) {
  if (window.VoiceVisionState.isRecording) {
    window.stopVoiceRecording();
    return;
  }

  const { stt } = window.getActiveVoiceEngines();
  const hasCloudKey = Boolean(window.AppState?.settings?.ai?.groqKey || window.AppState?.settings?.ai?.geminiKey);

  // إذا اختار المستخدم صوت النماذج السحابية وتوفر مفتاح (Groq Whisper أو Gemini Audio)
  if (stt === 'ai_cloud' && hasCloudKey && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    await startCloudAiRecording(targetInputId, onCompleteCallback);
  } else {
    // استخدام مايكروفون النظام المحلي للهاتف (Web Speech API)
    startPhoneNativeRecognition(targetInputId, onCompleteCallback, stt === 'ai_cloud' && !hasCloudKey);
  }
};

function startPhoneNativeRecognition(targetInputId, onCompleteCallback, fellBackFromCloud = false) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (window.showToast) window.showToast('متصفحك لا يدعم التعرف الصوتي المحلي، يرجى إدخال مفتاح Groq أو Gemini لاستخدام الصوت السحابي.', 'warning');
    return;
  }

  if (fellBackFromCloud && window.showToast) {
    window.showToast('لم يتم العثور على مفتاح سحابي؛ يتم استخدام مايكروفون الهاتف المحلي تلقائياً.', 'info');
  }

  try {
    const recognition = new SpeechRec();
    recognition.lang = 'ar-YE';
    recognition.continuous = false;
    recognition.interimResults = true;

    window.VoiceVisionState.recognitionInstance = recognition;
    window.VoiceVisionState.isRecording = true;
    window.VoiceVisionState.recordingTarget = targetInputId;
    updateVoiceRecordingButtonsUI(true, 'phone_native');

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += txt + ' ';
        } else {
          interim += txt;
        }
      }
      const el = document.getElementById(targetInputId);
      if (el) el.value = (finalTranscript + interim).trim();
    };

    recognition.onerror = (err) => {
      console.warn('Phone STT Error:', err);
      window.VoiceVisionState.isRecording = false;
      updateVoiceRecordingButtonsUI(false);
    };

    recognition.onend = () => {
      window.VoiceVisionState.isRecording = false;
      updateVoiceRecordingButtonsUI(false);
      const cleanText = finalTranscript.trim() || (document.getElementById(targetInputId)?.value || '').trim();
      if (cleanText && typeof onCompleteCallback === 'function') {
        onCompleteCallback(cleanText);
      }
    };

    recognition.start();
    if (window.showToast) window.showToast('🎙️ جاري الاستماع عبر صوت الهاتف المحلي...', 'info');
  } catch (e) {
    window.VoiceVisionState.isRecording = false;
    updateVoiceRecordingButtonsUI(false);
    if (window.showToast) window.showToast('تعذر تشغيل مايكروفون الهاتف: ' + e.message, 'warning');
  }
}

async function startCloudAiRecording(targetInputId, onCompleteCallback) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    window.VoiceVisionState.mediaStream = stream;
    window.VoiceVisionState.audioChunks = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : '';

    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    window.VoiceVisionState.mediaRecorder = recorder;
    window.VoiceVisionState.isRecording = true;
    window.VoiceVisionState.recordingTarget = targetInputId;
    updateVoiceRecordingButtonsUI(true, 'ai_cloud');

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) window.VoiceVisionState.audioChunks.push(e.data);
    };

    recorder.onstop = async () => {
      stopMediaStreamTracks();
      window.VoiceVisionState.isRecording = false;
      updateVoiceRecordingButtonsUI(false);

      if (window.VoiceVisionState.audioChunks.length === 0) return;
      const audioBlob = new Blob(window.VoiceVisionState.audioChunks, { type: recorder.mimeType || 'audio/webm' });

      if (window.showToast) window.showToast('☁️ جاري تحويل الصوت عبر نماذج الذكاء الاصطناعي (Whisper / Gemini)...', 'info');

      try {
        const text = await transcribeAudioWithCloudAI(audioBlob);
        if (text) {
          const el = document.getElementById(targetInputId);
          if (el) el.value = text;
          if (typeof onCompleteCallback === 'function') onCompleteCallback(text);
        } else {
          if (window.showToast) window.showToast('لم يتم التعرف على كلام واضح في التسجيل.', 'warning');
        }
      } catch (err) {
        if (window.showToast) window.showToast('تعذر التحويل السحابي للصوت: ' + err.message, 'warning');
      }
    };

    recorder.start();
    if (window.showToast) window.showToast('☁️🎙️ جاري التسجيل لصوت النماذج السحابية... اضغط مرة أخرى للإيقاف والإرسال', 'info');
  } catch (err) {
    window.VoiceVisionState.isRecording = false;
    updateVoiceRecordingButtonsUI(false);
    // التحويل التلقائي لصوت الهاتف في حال فشل MediaRecorder
    startPhoneNativeRecognition(targetInputId, onCompleteCallback, false);
  }
}

window.stopVoiceRecording = function() {
  if (window.VoiceVisionState.recognitionInstance) {
    try { window.VoiceVisionState.recognitionInstance.stop(); } catch (e) {}
    window.VoiceVisionState.recognitionInstance = null;
  }
  if (window.VoiceVisionState.mediaRecorder && window.VoiceVisionState.mediaRecorder.state !== 'inactive') {
    try { window.VoiceVisionState.mediaRecorder.stop(); } catch (e) {}
  } else {
    stopMediaStreamTracks();
  }
  window.VoiceVisionState.isRecording = false;
  updateVoiceRecordingButtonsUI(false);
};

function stopMediaStreamTracks() {
  if (window.VoiceVisionState.mediaStream) {
    window.VoiceVisionState.mediaStream.getTracks().forEach(t => t.stop());
    window.VoiceVisionState.mediaStream = null;
  }
}

/**
 * تحويل ملف الصوت المسجل إلى نص عبر Groq Whisper Large V3 أو Gemini Native Audio
 */
async function voiceFetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function transcribeAudioWithCloudAI(audioBlob) {
  const aiCfg = window.AppState?.settings?.ai || {};

  // الأولوية 1: Groq Whisper Large V3 (فائق السرعة والدقة في العربية واللهجات)
  if (aiCfg.groqKey) {
    try {
      const formData = new FormData();
      const ext = (audioBlob.type || '').includes('mp4') ? 'm4a' : 'webm';
      formData.append('file', audioBlob, `voice.${ext}`);
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'ar');
      formData.append('prompt', 'نظام عيادة طب وجراحة الفم والأسنان، دكتور صلاح الدين السعيدي، سند قبض، كشف، حشوة، عصب، خلع، تقويم، تركيبات، ريال يمني.');

      const res = await voiceFetchWithTimeout('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${aiCfg.groqKey}` },
        body: formData
      }, 12000);
      const data = await res.json();
      if (res.ok && data.text) {
        return data.text.trim();
      }
    } catch (e) {
      console.warn('Groq Whisper STT failed, trying Gemini Audio fallback:', e);
    }
  }

  // الأولوية 2: Gemini 2.5 Flash Native Audio Understanding
  if (aiCfg.geminiKey) {
    const base64Audio = await blobToBase64(audioBlob);
    const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
    const mimeType = audioBlob.type ? audioBlob.type.split(';')[0] : 'audio/webm';

    const res = await voiceFetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiCfg.geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'فرّغ هذا التسجيل الصوتي العربي إلى نص مكتوب بدقة تامة بدون أي إضافات أو مقدمات:' },
            { inline_data: { mime_type: mimeType, data: cleanBase64 } }
          ]
        }]
      })
    }, 15000);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'فشل تفريغ الصوت عبر Gemini');
    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return txt.trim();
  }

  throw new Error('يرجى إدخال مفتاح Groq أو Gemini لتفعيل الإدخال الصوتي السحابي');
}

/* ==================== 3. محرك النطق الصوتي المزدوج (Dual TTS: Phone Native vs Gemini Cloud Audio) ==================== */

window.speakText = async function(text, forceEngine = null) {
  if (!text) return;
  window.stopSpeaking();
  const requestId = (window.VoiceVisionState.speechRequestId || 0) + 1;
  window.VoiceVisionState.speechRequestId = requestId;
  const isCurrentRequest = () => window.VoiceVisionState.speechRequestId === requestId;

  // تنظيف النص من رموز Markdown ليُقرأ بطلاقة
  const cleanText = String(text)
    .replace(/[*#_~`>|]/g, ' ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  const { tts } = window.getActiveVoiceEngines();
  const chosenEngine = forceEngine || tts;
  const geminiKey = window.AppState?.settings?.ai?.geminiKey;

  if (chosenEngine === 'ai_cloud') {
    // Prefer server-side Groq TTS when configured, without exposing the server key to the browser.
    const serverTTS = await speakWithServerGroqTTS(cleanText, isCurrentRequest);
    if (!isCurrentRequest()) return;
    if (serverTTS) return;

    if (geminiKey) {
      const success = await speakWithGeminiCloudTTS(cleanText, geminiKey, isCurrentRequest);
      if (!isCurrentRequest()) return;
      if (success) return;
    }
    if (window.showToast) window.showToast('تعذر الصوت السحابي؛ سيتم استخدام صوت الهاتف العربي المتاح.', 'info');
  }

  // Use the phone's speech synthesis as the primary or fallback voice engine.
  const spoken = await speakWithPhoneNativeTTS(cleanText);
  if (!spoken && window.showToast) {
    window.showToast('تعذر تشغيل النطق الصوتي. تحقق من دعم المتصفح للأصوات العربية.', 'warning');
  }
};

async function speakWithServerGroqTTS(text, isCurrentRequest = () => true) {
  const spokenText = String(text || '').trim();
  // Groq TTS accepts short utterances; split longer replies at natural boundaries and play sequentially.
  if (!spokenText) return false;
  if (spokenText.length > 200) {
    const chunks = [];
    let remaining = spokenText;
    while (remaining.length > 200) {
      let cut = Math.max(remaining.lastIndexOf('。', 200), remaining.lastIndexOf('.', 200), remaining.lastIndexOf('؟', 200), remaining.lastIndexOf('!', 200), remaining.lastIndexOf('،', 200), remaining.lastIndexOf(' ', 200));
      if (cut < 80) cut = 200;
      chunks.push(remaining.slice(0, cut + (cut < 200 ? 1 : 0)).trim());
      remaining = remaining.slice(cut + (cut < 200 ? 1 : 0)).trim();
    }
    if (remaining) chunks.push(remaining);
    for (const chunk of chunks) {
      if (!isCurrentRequest() || !(await speakWithServerGroqTTS(chunk, isCurrentRequest))) return false;
    }
    return true;
  }
  let audioUrl = null;
  let audio = null;
  let finishPlayback = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ text: spokenText }),
        signal: controller.signal
      });
    } finally { clearTimeout(timer); }
    if (!response.ok) return false;
    const blob = await response.blob();
    if (!blob.size || !isCurrentRequest()) return false;
    audioUrl = URL.createObjectURL(blob);
    audio = new Audio(audioUrl);
    window.VoiceVisionState.isSpeaking = true;
    updateSpeakingIndicatorUI(true, 'ai_cloud');
    const played = await new Promise(resolve => {
      let settled = false;
      finishPlayback = value => { if (settled) return; settled = true; resolve(value); };
      audio.onended = () => finishPlayback(true);
      audio.onerror = () => finishPlayback(false);
      window.VoiceVisionState.currentAudioObj = {
        stop: () => { try { audio.pause(); audio.currentTime = 0; } catch (e) {} finishPlayback(false); }
      };
      audio.play().catch(() => finishPlayback(false));
    });
    if (!isCurrentRequest()) return false;
    return played;
  } catch (error) {
    return false;
  } finally {
    if (audio) { audio.onended = null; audio.onerror = null; try { audio.pause(); } catch (e) {} }
    if (window.VoiceVisionState.currentAudioObj) window.VoiceVisionState.currentAudioObj = null;
    window.VoiceVisionState.isSpeaking = false;
    updateSpeakingIndicatorUI(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }
}

async function speakWithGeminiCloudTTS(text, apiKey, isCurrentRequest = () => true) {
  try {
    window.VoiceVisionState.isSpeaking = true;
    updateSpeakingIndicatorUI(true, 'ai_cloud');

    // Bound cloud TTS latency. Abort a stalled request so the local Arabic
    // voice can take over instead of leaving the interface silent.
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2200) : null;

    let data;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller?.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: text.slice(0, 900) }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' }
              }
            }
          }
        })
      });

      if (!res.ok) throw new Error(`Gemini TTS HTTP ${res.status}`);
      data = await res.json();
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData || !inlineData.data) throw new Error('No audio bytes returned');

    // A response that arrives after Stop or a newer utterance must not start playback.
    if (!isCurrentRequest()) return false;
    const played = await playPcm16Base64Audio(inlineData.data, 24000);
    window.VoiceVisionState.isSpeaking = false;
    updateSpeakingIndicatorUI(false);
    return played;
  } catch (e) {
    window.VoiceVisionState.isSpeaking = false;
    updateSpeakingIndicatorUI(false);
    return false;
  }
}

function playPcm16Base64Audio(base64Data, sampleRate = 24000) {
  return new Promise((resolve) => {
    try {
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = window.VoiceVisionState.audioContext || new AudioCtx();
      window.VoiceVisionState.audioContext = ctx;

      const buffer = ctx.createBuffer(1, float32.length, sampleRate);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      window.VoiceVisionState.currentAudioObj = source;

      source.onended = () => {
        window.VoiceVisionState.currentAudioObj = null;
        resolve(true);
      };
      source.start(0);
    } catch (err) {
      resolve(false);
    }
  });
}

function speakWithPhoneNativeTTS(text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.02;

      const voices = window.speechSynthesis.getVoices() || [];
      const arabicVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('ar'));
      const arVoice =
        arabicVoices.find(v => /google/i.test(v.name) && /ar|arab/i.test(`${v.lang} ${v.name}`)) ||
        arabicVoices.find(v => /ar[-_]ye/i.test(v.lang)) ||
        arabicVoices.find(v => /ar[-_]sa/i.test(v.lang)) ||
        arabicVoices[0];
      if (arVoice) utterance.voice = arVoice;

      window.VoiceVisionState.isSpeaking = true;
      updateSpeakingIndicatorUI(true, 'phone_native');

      utterance.onend = () => {
        window.VoiceVisionState.isSpeaking = false;
        updateSpeakingIndicatorUI(false);
        resolve(true);
      };
      utterance.onerror = () => {
        window.VoiceVisionState.isSpeaking = false;
        updateSpeakingIndicatorUI(false);
        resolve(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      window.VoiceVisionState.isSpeaking = false;
      updateSpeakingIndicatorUI(false);
      resolve(false);
    }
  });
}

window.stopSpeaking = function() {
  window.VoiceVisionState.speechRequestId = (window.VoiceVisionState.speechRequestId || 0) + 1;
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  if (window.VoiceVisionState.currentAudioObj) {
    try { window.VoiceVisionState.currentAudioObj.stop(); } catch (e) {}
    window.VoiceVisionState.currentAudioObj = null;
  }
  window.VoiceVisionState.isSpeaking = false;
  updateSpeakingIndicatorUI(false);
};

/* ==================== 4. وضع المكالمة الصوتية الحية المباشرة (Live Voice Call) ==================== */

window.toggleLiveVoiceCall = function() {
  if (window.VoiceVisionState.liveCallActive) {
    window.stopLiveVoiceCall();
  } else {
    window.startLiveVoiceCall();
  }
};

window.startLiveVoiceCall = function() {
  window.stopSpeaking();
  window.stopVoiceRecording();

  window.VoiceVisionState.liveCallActive = true;
  const modal = document.getElementById('live-voice-call-modal');
  if (modal) modal.classList.remove('hidden');

  setLiveCallStatusUI('listening', '🎙️ تحدث الآن يا دكتور... أنا أستمع إليك مباشرة');
  runLiveCallListeningCycle();
};

window.stopLiveVoiceCall = function() {
  window.VoiceVisionState.liveCallActive = false;
  window.stopVoiceRecording();
  window.stopSpeaking();

  const modal = document.getElementById('live-voice-call-modal');
  if (modal) modal.classList.add('hidden');
  setLiveCallStatusUI('idle', 'تم إنهاء المكالمة الصوتية الحية');
};

function runLiveCallListeningCycle() {
  if (!window.VoiceVisionState.liveCallActive) return;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
      setLiveCallStatusUI('listening', '☁️ التعرف الصوتي المحلي غير متاح؛ سيتم استخدام التفريغ السحابي على دفعات قصيرة');
      startCloudLiveCallCycle();
    } else {
      setLiveCallStatusUI('idle', 'المتصفح لا يدعم التعرف الصوتي ولا يتيح التسجيل السحابي. جرّب Chrome مع إذن الميكروفون.');
    }
    return;
  }

  try {
    const rec = new SpeechRec();
    rec.lang = 'ar-YE';
    rec.continuous = false;
    rec.interimResults = true;
    window.VoiceVisionState.recognitionInstance = rec;

    let capturedText = '';
    setLiveCallStatusUI('listening', '🎙️ جاري الاستماع... تحدث بطلاقة');

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) capturedText += t + ' ';
        else interim += t;
      }
      const transcriptBox = document.getElementById('live-call-transcript');
      if (transcriptBox) transcriptBox.textContent = (capturedText + interim).trim();
    };

    rec.onend = async () => {
      if (!window.VoiceVisionState.liveCallActive) return;
      const finalSpeech = capturedText.trim();

      if (!finalSpeech) {
        // إعادة دورة الاستماع تلقائياً إذا كانت المكالمة لا تزال مفتوحة
        setTimeout(() => {
          if (window.VoiceVisionState.liveCallActive && !window.VoiceVisionState.isSpeaking) {
            runLiveCallListeningCycle();
          }
        }, 400);
        return;
      }

      try {
        await processLiveCallSpeech(finalSpeech);
        if (window.VoiceVisionState.liveCallActive) runLiveCallListeningCycle();
      } catch (err) {
        console.warn('Live call AI error:', err);
        setLiveCallStatusUI('listening', 'تعذر إكمال الرد: ' + err.message + ' — يمكنك المحاولة مجددًا');
        if (window.VoiceVisionState.liveCallActive) setTimeout(runLiveCallListeningCycle, 700);
      }
    };

    rec.onerror = () => {
      if (window.VoiceVisionState.liveCallActive && !window.VoiceVisionState.isSpeaking) {
        setTimeout(runLiveCallListeningCycle, 800);
      }
    };

    rec.start();
  } catch (e) {
    setLiveCallStatusUI('idle', 'تعذر بدء الاستماع المستمر: ' + e.message);
  }
}

async function startCloudLiveCallCycle() {
  if (!window.VoiceVisionState.liveCallActive || window.VoiceVisionState.cloudLiveCycleRunning) return;
  window.VoiceVisionState.cloudLiveCycleRunning = true;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!window.VoiceVisionState.liveCallActive) {
      stream.getTracks().forEach(t => t.stop());
      window.VoiceVisionState.cloudLiveCycleRunning = false;
      return;
    }
    const preferredType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
    const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
    const chunks = [];
    window.VoiceVisionState.mediaStream = stream;
    window.VoiceVisionState.mediaRecorder = recorder;
    recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
    recorder.onerror = () => {
      stream.getTracks().forEach(t => t.stop());
      window.VoiceVisionState.mediaStream = null;
      window.VoiceVisionState.mediaRecorder = null;
      window.VoiceVisionState.cloudLiveCycleRunning = false;
      if (window.VoiceVisionState.liveCallActive) setTimeout(startCloudLiveCallCycle, 700);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      window.VoiceVisionState.mediaStream = null;
      window.VoiceVisionState.mediaRecorder = null;
      try {
        if (!window.VoiceVisionState.liveCallActive) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) return;
        setLiveCallStatusUI('thinking', '🧠 جاري تحويل الصوت ومعالجة الطلب...');
        const speech = (await transcribeAudioWithCloudAI(blob)).trim();
        if (!speech || !window.VoiceVisionState.liveCallActive) return;
        const transcriptBox = document.getElementById('live-call-transcript');
        if (transcriptBox) transcriptBox.textContent = speech;
        await processLiveCallSpeech(speech);
      } catch (err) {
        console.warn('Cloud live STT cycle failed:', err);
        if (window.VoiceVisionState.liveCallActive) setLiveCallStatusUI('listening', 'تعذر تفريغ الصوت؛ ستتم إعادة المحاولة...');
      } finally {
        window.VoiceVisionState.cloudLiveCycleRunning = false;
        if (window.VoiceVisionState.liveCallActive && !window.VoiceVisionState.isSpeaking) setTimeout(startCloudLiveCallCycle, 500);
      }
    };
    setLiveCallStatusUI('listening', '🎙️ تحدث الآن؛ يتم التقاط الصوت في مقاطع قصيرة');
    recorder.start();
    setTimeout(() => { if (recorder.state !== 'inactive') { try { recorder.stop(); } catch (e) {} } }, 6500);
  } catch (err) {
    if (stream) stream.getTracks().forEach(t => t.stop());
    window.VoiceVisionState.mediaStream = null;
    window.VoiceVisionState.mediaRecorder = null;
    window.VoiceVisionState.cloudLiveCycleRunning = false;
    if (window.VoiceVisionState.liveCallActive) setLiveCallStatusUI('idle', 'تعذر الوصول إلى الميكروفون: ' + err.message);
  }
}

async function processLiveCallSpeech(finalSpeech) {
  if (!window.VoiceVisionState.liveCallActive || !finalSpeech) return;
  setLiveCallStatusUI('thinking', '🧠 جاري تحليل طلبك ومراجعة بيانات العيادة...');
  if (window.appendChatMessageUI) window.appendChatMessageUI('user', `🎙️ ${finalSpeech}`);
  const reply = await window.callAI(`[مكالمة صوتية حية ومباشرة مع الطبيب - أجب بإيجاز ووضوح مناسب للنطق الصوتي المباشر]: ${finalSpeech}`, null, { timeoutMs: 9000 });
  if (!window.VoiceVisionState.liveCallActive) return;
  const transcriptBox = document.getElementById('live-call-transcript');
  if (transcriptBox) transcriptBox.textContent = reply;
  if (window.appendChatMessageUI) window.appendChatMessageUI('ai', reply);
  setLiveCallStatusUI('speaking', '🔊 الذكاء الاصطناعي يتحدث الآن...');
  await window.speakText(reply);
}

function setLiveCallStatusUI(state, statusText) {
  window.VoiceVisionState.liveCallStatus = state;
  const statusEl = document.getElementById('live-call-status-text');
  const orbEl = document.getElementById('live-call-orb');
  const engineBadge = document.getElementById('live-call-engine-badge');

  if (statusEl) statusEl.textContent = statusText;
  if (engineBadge) {
    const { stt, tts } = window.getActiveVoiceEngines();
    engineBadge.textContent = `STT: ${stt === 'ai_cloud' ? 'سحابي AI' : 'الهاتف'} | TTS: ${tts === 'ai_cloud' ? 'سحابي AI' : 'الهاتف'}`;
  }
  if (orbEl) {
    orbEl.className = 'w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 mx-auto ';
    if (state === 'listening') orbEl.className += 'bg-emerald-500/20 border-4 border-emerald-400 animate-pulse scale-105';
    else if (state === 'thinking') orbEl.className += 'bg-amber-500/20 border-4 border-amber-400 animate-spin';
    else if (state === 'speaking') orbEl.className += 'bg-sky-500/20 border-4 border-sky-400 scale-110';
    else orbEl.className += 'bg-slate-700 border-2 border-slate-500';
  }
}

/* ==================== 5. رفع وتحليل الصور والملفات في المحادثة (Vision & Files) ==================== */

window.handleChatFileUpload = function(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const fileName = file.name;
  const mimeType = file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : /\.png$/i.test(file.name) ? 'image/png' : /\.webp$/i.test(file.name) ? 'image/webp' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : 'application/octet-stream');

  // 1. إذا كان الملف صورة (أشعة أسنان، فاتورة، سند يدوي)
  if (mimeType.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      window.VoiceVisionState.attachment = {
        hasAttachment: true,
        fileName: fileName,
        fileType: 'image',
        mimeType: mimeType,
        base64Data: e.target.result,
        extractedText: ''
      };
      renderChatAttachmentPreviewUI();
      if (window.showToast) window.showToast(`📷 تم إرفاق الصورة (${fileName}) للتحليل البصري`, 'success');
    };
    reader.readAsDataURL(file);
    return;
  }

  // 2. إذا كان الملف نصياً أو بيانات (JSON, CSV, TXT)
  if (mimeType.includes('json') || mimeType.includes('csv') || mimeType.includes('text') || /\.(json|csv|txt|md)$/i.test(fileName)) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = String(e.target.result || '').slice(0, 12000);
      window.VoiceVisionState.attachment = {
        hasAttachment: true,
        fileName: fileName,
        fileType: 'text',
        mimeType: mimeType,
        base64Data: null,
        extractedText: content
      };
      renderChatAttachmentPreviewUI();
      if (window.showToast) window.showToast(`📄 تم إرفاق الملف (${fileName}) للتحليل`, 'success');
    };
    reader.readAsText(file);
    return;
  }

  // 3. دعم مستندات Word وجداول Excel باستخراج النص محلياً قبل إرسالها للمساعد.
  const extension = (fileName.split('.').pop() || '').toLowerCase();
  if (extension === 'docx' || extension === 'xlsx' || extension === 'xls') {
    if (file.size > 8 * 1024 * 1024) {
      if (window.showToast) window.showToast('حجم الملف يتجاوز 8 ميغابايت. يرجى تصغيره ثم المحاولة.', 'warning');
      event.target.value = '';
      return;
    }
    const readDocument = async () => {
      const buffer = await file.arrayBuffer();
      let extractedText = '';
      if (extension === 'docx') {
        if (!window.mammoth) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.9.0/mammoth.browser.min.js';
            script.onload = () => window.mammoth ? resolve() : reject(new Error('تعذر تحميل قارئ Word'));
            script.onerror = () => reject(new Error('تعذر تحميل قارئ Word'));
            document.head.appendChild(script);
          });
        }
        const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
        extractedText = result.value || '';
      } else {
        if (!window.XLSX) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.onload = () => window.XLSX ? resolve() : reject(new Error('تعذر تحميل قارئ Excel'));
            script.onerror = () => reject(new Error('تعذر تحميل قارئ Excel'));
            document.head.appendChild(script);
          });
        }
        const workbook = window.XLSX.read(buffer, { type: 'array' });
        extractedText = workbook.SheetNames.slice(0, 8).map(name =>
          'ورقة: ' + name + '\\n' + window.XLSX.utils.sheet_to_csv(workbook.Sheets[name]).slice(0, 6000)
        ).join('\\n\\n');
      }
      window.VoiceVisionState.attachment = {
        hasAttachment: true, fileName, fileType: 'text', mimeType,
        base64Data: null, extractedText: String(extractedText).slice(0, 16000)
      };
      renderChatAttachmentPreviewUI();
      if (window.showToast) window.showToast('📄 تم استخراج محتوى الملف (' + fileName + ') وإرفاقه للتحليل.', 'success');
    };
    readDocument().catch(error => {
      if (window.showToast) window.showToast('تعذر قراءة الملف: ' + error.message, 'warning');
    }).finally(() => { if (event.target) event.target.value = ''; });
    return;
  }

  // 4. إذا كان ملف PDF (يُحول إلى Base64 ليدعمه Gemini 2.5 مباشرة)
  const reader = new FileReader();
  reader.onload = (e) => {
    window.VoiceVisionState.attachment = {
      hasAttachment: true,
      fileName: fileName,
      fileType: 'pdf',
      mimeType: 'application/pdf',
      base64Data: e.target.result,
      extractedText: `[ملف مرفق بصيغة PDF: ${fileName}]`
    };
    renderChatAttachmentPreviewUI();
    if (window.showToast) window.showToast(`📑 تم إرفاق ملف PDF (${fileName})`, 'success');
  };
  reader.readAsDataURL(file);
};

window.clearChatAttachment = function() {
  window.VoiceVisionState.attachment = {
    hasAttachment: false,
    fileName: '',
    fileType: '',
    mimeType: '',
    base64Data: null,
    extractedText: ''
  };
  const fileInput = document.getElementById('chat-file-input');
  if (fileInput) fileInput.value = '';
  renderChatAttachmentPreviewUI();
};

function renderChatAttachmentPreviewUI() {
  const previewContainer = document.getElementById('chat-attachment-preview');
  if (!previewContainer) return;

  const att = window.VoiceVisionState.attachment;
  if (!att.hasAttachment) {
    previewContainer.classList.add('hidden');
    previewContainer.innerHTML = '';
    return;
  }

  previewContainer.classList.remove('hidden');
  const thumbHtml = att.fileType === 'image' && att.base64Data
    ? `<img src="${att.base64Data}" class="w-12 h-12 rounded-lg object-cover border border-sky-400" alt="attachment" />`
    : `<div class="w-12 h-12 rounded-lg bg-sky-900/50 border border-sky-500 flex items-center justify-center text-xl">📄</div>`;

  previewContainer.innerHTML = `
    <div class="flex items-center justify-between gap-3 bg-slate-800/90 border border-sky-500/40 rounded-xl p-2.5 text-xs text-white">
      <div class="flex items-center gap-2.5 overflow-hidden">
        ${thumbHtml}
        <div class="truncate">
          <div class="font-bold text-sky-300 truncate">${String(att.fileName || '').replace(/[&<>\"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[ch]))}</div>
          <div class="text-slate-400">جاهز للإرسال والتحليل مع رسالتك</div>
        </div>
      </div>
      <button type="button" onclick="window.clearChatAttachment()" class="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold shrink-0">
        ✕ إزالة
      </button>
    </div>
  `;
}

/* ==================== 6. دوال مساعدة وتحديث مؤشرات الواجهة ==================== */

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function updateVoiceRecordingButtonsUI(isRecording, activeEngine = '') {
  const buttons = document.querySelectorAll('.voice-record-btn');
  buttons.forEach(btn => {
    if (isRecording) {
      btn.classList.add('animate-pulse', 'ring-2', 'ring-rose-500');
      btn.dataset.recording = 'true';
    } else {
      btn.classList.remove('animate-pulse', 'ring-2', 'ring-rose-500');
      btn.dataset.recording = 'false';
    }
  });

  const statusBadge = document.getElementById('voice-active-status-badge');
  if (statusBadge) {
    if (isRecording) {
      statusBadge.classList.remove('hidden');
      statusBadge.textContent = activeEngine === 'ai_cloud'
        ? '🔴 يسجل الآن (صوت النماذج السحابية AI)...'
        : '🔴 يستمع الآن (صوت الهاتف المحلي)...';
    } else {
      statusBadge.classList.add('hidden');
    }
  }
}

function updateSpeakingIndicatorUI(isSpeaking, activeEngine = '') {
  const stopBtn = document.getElementById('stop-tts-btn');
  if (stopBtn) {
    if (isSpeaking) stopBtn.classList.remove('hidden');
    else stopBtn.classList.add('hidden');
  }
}
