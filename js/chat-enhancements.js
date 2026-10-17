/* DOCAI chat UX enhancement: safe message controls and immediate thinking feedback. */
(function () {
  function escape(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function formatText(value) {
    return escape(value)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^### (.*)$/gm, "<h4 class='text-sm font-extrabold text-amber-300 mt-2'>$1</h4>")
      .replace(/^## (.*)$/gm, "<h3 class='text-base font-extrabold text-sky-300 mt-3'>$1</h3>")
      .replace(/^- (.*)$/gm, "<div class='flex gap-2'><span class='text-sky-400'>•</span><span>$1</span></div>")
      .replace(/\n/g, "<br>");
  }

  window.appendChatMessageUI = function (role, text, attachmentMeta) {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;
    const isUser = role === "user";
    const wrapper = document.createElement("div");
    wrapper.className = "flex w-full justify-" + (isUser ? "start" : "end") + " animate-[fadeIn_.18s_ease-out]";
    const card = document.createElement("article");
    card.className = "max-w-[94%] sm:max-w-[82%] rounded-2xl p-3.5 sm:p-4 shadow-lg break-words text-sm leading-7 " +
      (isUser ? "bg-gradient-to-br from-sky-700 to-blue-800 text-white rounded-tr-sm border border-sky-400/30" :
        "bg-slate-800/95 text-slate-100 rounded-tl-sm border border-slate-700/80");
    const head = document.createElement("div");
    head.className = "flex items-center justify-between gap-4 mb-2 pb-2 border-b border-white/10 text-[11px] text-slate-300";
    const who = document.createElement("span");
    who.className = "font-extrabold";
    who.textContent = isUser ? "👨‍⚕️ أنت" : "🤖 DOCAI • المساعد الذكي";
    head.appendChild(who);
    if (!isUser) {
      const actions = document.createElement("div");
      actions.className = "flex items-center gap-1.5 shrink-0";
      const listen = document.createElement("button");
      listen.type = "button"; listen.className = "px-2 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600 text-white";
      listen.textContent = "🔊 استماع";
      listen.addEventListener("click", function () { if (window.speakText) window.speakText(String(text || "")); });
      const copy = document.createElement("button");
      copy.type = "button"; copy.className = "px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white";
      copy.textContent = "📋 نسخ";
      copy.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(String(text || ""));
          window.showToast && window.showToast("تم نسخ الرد", "success");
        } catch (e) {
          const area = document.createElement("textarea"); area.value = String(text || "");
          document.body.appendChild(area); area.select();
          const ok = document.execCommand("copy"); area.remove();
          window.showToast && window.showToast(ok ? "تم نسخ الرد" : "تعذر النسخ من المتصفح", ok ? "success" : "warning");
        }
      });
      actions.append(listen, copy); head.appendChild(actions);
    }
    card.appendChild(head);
    if (attachmentMeta && attachmentMeta.hasAttachment) {
      const attachment = document.createElement("div");
      attachment.className = "mb-2 px-3 py-2 rounded-xl bg-black/20 border border-sky-400/20 text-xs text-amber-200";
      attachment.textContent = "📎 مرفق: " + String(attachmentMeta.fileName || "ملف");
      card.appendChild(attachment);
    }
    const body = document.createElement("div");
    body.className = "chat-body-content";
    body.innerHTML = formatText(text);
    card.appendChild(body);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
    return wrapper;
  };

  function addThinkingIndicator() {
    const container = document.getElementById("chat-messages-container");
    if (!container) return null;
    const row = document.createElement("div");
    row.id = "docai-thinking-indicator";
    row.className = "flex justify-end";
    row.innerHTML = "<div class='rounded-2xl rounded-tl-sm border border-sky-500/20 bg-slate-800 px-4 py-3 text-xs text-slate-300 shadow'><div class='font-bold mb-1'>🤖 DOCAI يفكر الآن</div><div class='flex gap-1.5 items-center'><span class='w-2 h-2 rounded-full bg-sky-400 animate-bounce'></span><span class='w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:120ms]'></span><span class='w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:240ms]'></span><span class='mr-2'>يتم تجهيز الرد…</span></div></div>";
    container.appendChild(row); container.scrollTop = container.scrollHeight;
    return row;
  }

  let sending = false;
  window.sendChatMessageUI = async function () {
    if (sending) return;
    const input = document.getElementById("chat-user-input");
    const sendButton = document.querySelector('#tab-section-ai-chat button[onclick="window.sendChatMessageUI()"]');
    const userText = input && input.value ? input.value.trim() : "";
    const attachment = window.VoiceVisionState && window.VoiceVisionState.attachment || { hasAttachment: false };
    if (!userText && !attachment.hasAttachment) {
      window.showToast && window.showToast("اكتب سؤالك أو أرفق ملفاً/صورة أولاً", "warning");
      return;
    }
    sending = true;
    if (sendButton) { sendButton.disabled = true; sendButton.textContent = "⏳ جارٍ الرد…"; sendButton.classList.add("opacity-60"); }
    window.appendChatMessageUI("user", userText || ("تحليل المرفق: " + (attachment.fileName || "ملف")), attachment);
    if (input) input.value = "";
    const thinking = addThinkingIndicator();
    let prompt = userText || "حلل المرفق الطبي/المالي بدقة، وقدم الخلاصة باللغة العربية.";
    let imageBase64 = null;
    try {
      if (attachment.hasAttachment) {
        if (attachment.fileType === "image" || attachment.fileType === "pdf") imageBase64 = attachment.base64Data;
        if (attachment.extractedText) prompt += "\n\n[محتوى الملف المرفق (" + (attachment.fileName || "ملف") + ")]:\n" + attachment.extractedText;
        if (window.clearChatAttachment) window.clearChatAttachment();
      }
      const answer = await window.callAI(prompt, imageBase64);
      if (thinking) thinking.remove();
      window.appendChatMessageUI("ai", answer);
      if (window.AppState && window.AppState.settings.ai.autoSpeakReplies && window.speakText) window.speakText(answer);
    } catch (error) {
      if (thinking) thinking.remove();
      window.appendChatMessageUI("ai", "⚠️ " + (error && error.message || "تعذر إكمال الطلب"));
    } finally {
      sending = false;
      if (sendButton) { sendButton.disabled = false; sendButton.textContent = "إرسال 🚀"; sendButton.classList.remove("opacity-60"); }
      if (input) input.focus();
    }
  };

  const style = document.createElement("style");
  style.textContent = "#chat-messages-container{scroll-behavior:smooth;overscroll-behavior:contain;background:radial-gradient(ellipse at top right,rgba(14,165,233,.055),transparent 55%)}#chat-user-input{font-size:14px;min-height:44px}#tab-section-ai-chat button:disabled{cursor:wait;filter:saturate(.65)}@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}";
  document.head.appendChild(style);
})();
