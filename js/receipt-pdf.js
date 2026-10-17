
/* ==========================================================================
   DOCAI GEMINI ERP - MODULE 4: HD IMAGE EXPORT, DIRECT PDF (A5/80MM),
   CLEAN PRINTING, ELECTRONIC SIGNATURE PAD & QR CODE GENERATOR
   File: js/receipt-pdf.js
   ========================================================================== */

window.SigPadState = {
  activeTarget: 'accountant', // 'accountant' | 'receiver'
  isDrawing: false,
  hasDrawn: false,
  canvas: null,
  ctx: null
};

/* ==================== 1. المحرك الأساسي لالتقاط السند بدقة HD بدون تشوه الخط العربي ==================== */

/**
 * ينشئ نسخة معزولة بعرض قياسي 680px خارج الشاشة وينتظر تحميل الخطوط
 * ويزيل كلاسات القص والتباعد لضمان عدم تداخل الحروف العربية في html2canvas
 */
window.captureCleanReceiptCanvas = async function(scaleFactor = 2.5) {
  const sourceEl = document.getElementById('receipt-capture-area') || document.getElementById('receipt-preview-card');
  if (!sourceEl) {
    throw new Error('لم يتم العثور على عنصر معاينة السند في الصفحة');
  }

  if (typeof html2canvas === 'undefined') {
    throw new Error('مكتبة التصوير html2canvas غير محملة بعد، يرجى التحقق من الاتصال بالإنترنت');
  }

  // Refresh QR before cloning; DOM cloning does not preserve canvas bitmap pixels.
  if (typeof window.updateReceiptQRCode === 'function') {
    try { await window.updateReceiptQRCode(); } catch (e) { console.warn('QR refresh before export failed', e); }
  }

  // انتظار جاهزية كافة الخطوط العربية (Cairo / Tajawal) قبل الرسم
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) {}
  }

  // إنشاء حاوية معزولة خارج الشاشة بعرض قياسي ثابت 680px
  const offscreenWrapper = document.createElement('div');
  offscreenWrapper.style.position = 'fixed';
  offscreenWrapper.style.top = '-10000px';
  offscreenWrapper.style.left = '-10000px';
  offscreenWrapper.style.width = '680px';
  offscreenWrapper.style.zIndex = '-9999';
  offscreenWrapper.style.background = '#ffffff';
  offscreenWrapper.style.direction = 'rtl';
  offscreenWrapper.setAttribute('dir', 'rtl');

  const clone = sourceEl.cloneNode(true);
  // Canvas bitmap data is not copied by cloneNode; copy QR/signature pixels explicitly.
  const sourceCanvases = sourceEl.querySelectorAll('canvas');
  const clonedCanvases = clone.querySelectorAll('canvas');
  sourceCanvases.forEach((sourceCanvas, index) => {
    const targetCanvas = clonedCanvases[index];
    if (!targetCanvas) return;
    try {
      targetCanvas.width = sourceCanvas.width;
      targetCanvas.height = sourceCanvas.height;
      const context = targetCanvas.getContext('2d');
      if (context) context.drawImage(sourceCanvas, 0, 0);
    } catch (error) { console.warn('Could not copy canvas into receipt export', error); }
  });
  clone.style.width = '680px';
  clone.style.maxWidth = '680px';
  clone.style.margin = '0';
  clone.style.transform = 'none';
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '12px';
  clone.style.background = '#ffffff';
  clone.style.fontFamily = "'Cairo', sans-serif";
  clone.style.letterSpacing = '0px';

  // إزالة جميع الكلاسات التي تسبب تداخل الحروف العربية أو قص النصوص في html2canvas
  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    el.classList.remove('truncate', 'tracking-widest', 'tracking-wider', 'tracking-tight', 'tracking-tighter');
    el.style.letterSpacing = '0px';
    el.style.fontVariantLigatures = 'normal';
    if (el.classList.contains('no-export') || el.classList.contains('no-print')) el.style.display = 'none';
    if (el.id === 'preview-watermark-img') el.style.opacity = '0.025';
    if (el.classList.contains('clinic-logo-img')) {
      el.style.width = '68px'; el.style.height = '68px'; el.style.objectFit = 'contain';
      el.style.opacity = '1'; el.style.filter = 'none';
    }
  });

  await Promise.all(Array.from(clone.querySelectorAll('img')).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once:true });
      img.addEventListener('error', resolve, { once:true });
      setTimeout(resolve, 1500);
    });
  }));

  offscreenWrapper.appendChild(clone);
  document.body.appendChild(offscreenWrapper);

  // مهلة قصيرة لضمان استقرار تخطيط الـ DOM والصور داخل النسخة المعزولة
  await new Promise(resolve => setTimeout(resolve, 120));

  try {
    const canvas = await html2canvas(clone, {
      scale: scaleFactor,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 680,
      windowWidth: 680
    });
    return canvas;
  } finally {
    if (offscreenWrapper && offscreenWrapper.parentNode) {
      offscreenWrapper.parentNode.removeChild(offscreenWrapper);
    }
  }
};

/* ==================== 2. تصدير السند كصورة عالية الدقة (HD PNG) للجوال والكمبيوتر ==================== */

window.exportReceiptAsImageMobile = async function(shareDirectly = false) {
  try {
    if (window.showToast) window.showToast('📸 جاري تجهيز صورة السند بدقة HD الفائقة...', 'info');

    // تحديث المعاينة أولاً لضمان تطابق البيانات
    if (window.updateLiveReceiptPreview) window.updateLiveReceiptPreview();

    const canvas = await window.captureCleanReceiptCanvas(3);
    const recNo = document.getElementById('rec-no')?.value || '1001';
    const patientName = (document.getElementById('rec-patient-name')?.value || 'مريض').trim().replace(/\s+/g, '_');
    const fileName = `سند_قبض_${recNo}_${patientName}.png`;

    // إذا طلب المستخدم المشاركة المباشرة عبر الجوال (Web Share API)
    if (shareDirectly && navigator.canShare && navigator.share) {
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 1.0));
      if (blob) {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `سند قبض رقم ${recNo}`,
            text: `سند قبض المريض: ${patientName.replace(/_/g, ' ')}`,
            files: [file]
          });
          if (window.showToast) window.showToast('تمت مشاركة صورة السند بنجاح!', 'success');
          return;
        }
      }
    }

    // التحميل المباشر للصورة عالية الدقة
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.showToast) window.showToast('✅ تم تحميل صورة السند بدقة HD بنجاح!', 'success');
  } catch (err) {
    console.error('Image Export Error:', err);
    if (window.showToast) window.showToast('تعذر تصدير صورة السند: ' + err.message, 'warning');
  }
};

/* ==================== 3. تصدير وتحميل السند كملف PDF مباشر (A5 أو حراري 80mm) ==================== */

window.exportReceiptAsPDF = async function(format = null) {
  try {
    const selectedFormat = format || document.getElementById('pdf-paper-size-select')?.value || 'a5';
    if (window.showToast) {
      window.showToast(`📄 جاري توليد ملف PDF بقياس (${selectedFormat === '80mm' ? 'حراري 80mm' : 'A5 قياسي'})...`, 'info');
    }

    if (window.updateLiveReceiptPreview) window.updateLiveReceiptPreview();

    const jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDFConstructor) {
      throw new Error('مكتبة jsPDF غير محملة، يرجى التحقق من اتصال الإنترنت');
    }

    const canvas = await window.captureCleanReceiptCanvas(3);
    const imgData = canvas.toDataURL('image/png');
    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;
    const aspectRatio = imgHeightPx / imgWidthPx;

    const recNo = document.getElementById('rec-no')?.value || '1001';
    const patientName = (document.getElementById('rec-patient-name')?.value || 'مريض').trim().replace(/\s+/g, '_');
    const fileName = `DOCAI_Receipt_${recNo}_${patientName}_${selectedFormat.toUpperCase()}.pdf`;

    let pdf;

    if (selectedFormat === '80mm') {
      // قياس ورق الطابعة الحرارية 80mm مع طول ديناميكي يتناسب مع محتوى السند
      const paperWidthMm = 80;
      const marginMm = 4;
      const contentWidthMm = paperWidthMm - (marginMm * 2);
      const contentHeightMm = +(contentWidthMm * aspectRatio).toFixed(2);
      const paperHeightMm = Math.max(100, contentHeightMm + (marginMm * 2));

      pdf = new jsPDFConstructor({
        orientation: 'portrait',
        unit: 'mm',
        format: [paperWidthMm, paperHeightMm]
      });

      pdf.addImage(imgData, 'JPEG', marginMm, marginMm, contentWidthMm, contentHeightMm, undefined, 'FAST');
    } else {
      // قياس A5 القياسي (أفقي 210x148mm أو عمودي حسب تناسب أبعاد السند)
      const isLandscape = aspectRatio < 0.95;
      pdf = new jsPDFConstructor({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 6;
      const maxW = pageWidth - (margin * 2);
      const maxH = pageHeight - (margin * 2);

      let renderW = maxW;
      let renderH = renderW * aspectRatio;

      if (renderH > maxH) {
        renderH = maxH;
        renderW = renderH / aspectRatio;
      }

      const offsetX = (pageWidth - renderW) / 2;
      const offsetY = (pageHeight - renderH) / 2;

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');
    }

    pdf.save(fileName);
    if (window.showToast) window.showToast('✅ تم تحميل ملف السند بصيغة PDF بنجاح!', 'success');
  } catch (err) {
    console.error('PDF Export Error:', err);
    if (window.showToast) window.showToast('تعذر توليد ملف PDF: ' + err.message, 'warning');
  }
};

/* ==================== 4. الطباعة المباشرة النظيفة (حل مشكلة الصفحة الفارغة) ==================== */

window.printReceiptNow = function() {
  if (window.updateLiveReceiptPreview) window.updateLiveReceiptPreview();

  // ضمان إزالة أي كلاس no-print موضوع بالخطأ على وسم <main> أو الحاويات الأبوية للسند
  const captureEl = document.getElementById('receipt-capture-area') || document.getElementById('receipt-preview-card');
  if (captureEl) {
    let parent = captureEl.parentElement;
    while (parent && parent !== document.body) {
      if (parent.classList.contains('no-print')) {
        parent.classList.remove('no-print');
      }
      parent = parent.parentElement;
    }
  }

  window.print();
};

/* ==================== 5. مشاركة تفاصيل السند عبر واتساب ==================== */

window.shareReceiptViaWhatsApp = function() {
  const identity = window.AppState?.settings?.identity || {};
  const recNo = document.getElementById('rec-no')?.value || '1001';
  const recDate = document.getElementById('rec-date')?.value || new Date().toISOString().slice(0, 10);
  const patientName = document.getElementById('rec-patient-name')?.value?.trim() || 'مريضنا الكريم';
  const patientPhone = document.getElementById('rec-patient-phone')?.value?.trim() || '';
  const totalAmount = Number(document.getElementById('rec-total-amount')?.value) || 0;
  const paidAmount = Number(document.getElementById('rec-paid-amount')?.value) || 0;
  const remaining = Math.max(0, totalAmount - paidAmount);
  const currency = document.getElementById('rec-currency')?.value || identity.defaultCurrency || 'ريال يمني';
  const services = Array.from(window.AppState?.selectedServices || []).join(' + ') || 'خدمات طبية وعلاجية';

  const msgLines = [
    `🦷 *${identity.systemTitleAr || 'عيادة د. صلاح الدين السعيدي'}*`,
    `📌 *إشعار سند قبض رقم:* #${recNo}`,
    `📅 *التاريخ:* ${recDate}`,
    `👤 *اسم المريض:* ${patientName}`,
    `🩺 *الخدمات العلاجية:* ${services}`,
    `──────────────────`,
    `💰 *إجمالي المبلغ:* ${totalAmount.toLocaleString()} ${currency}`,
    `✅ *المبلغ المقبوض:* ${paidAmount.toLocaleString()} ${currency}`,
    `⏳ *المتبقي:* ${remaining.toLocaleString()} ${currency}`,
    `──────────────────`,
    `📍 ${identity.address || ''}`,
    `مع تمنياتنا لكم بدوام الصحة والعافية 🌹`
  ];

  const encodedMsg = encodeURIComponent(msgLines.join('\n'));
  let cleanPhone = patientPhone.replace(/\D/g, '');
  if (cleanPhone.length === 9 && cleanPhone.startsWith('7')) {
    cleanPhone = '967' + cleanPhone;
  }

  const waUrl = cleanPhone.length >= 9
    ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;

  window.open(waUrl, '_blank');
};

/* ==================== 6. توليد رمز الاستجابة السريعة (QR Code) الموثق للسند ==================== */

window.updateReceiptQRCode = async function(customData = null) {
  const qrContainer = document.getElementById('receipt-qr-box');
  if (!qrContainer) return;

  const showQr = window.AppState?.settings?.features?.showQrCode !== false;
  if (!showQr) {
    qrContainer.classList.add('hidden');
    return;
  }
  qrContainer.classList.remove('hidden');

  const identity = window.AppState?.settings?.identity || {};
  const recNo = customData?.receiptNo || document.getElementById('rec-no')?.value || '1001';
  const date = customData?.date || document.getElementById('rec-date')?.value || new Date().toISOString().slice(0, 10);
  const patient = customData?.patientName || document.getElementById('rec-patient-name')?.value || 'مريض';
  const paid = customData?.paidAmount ?? (document.getElementById('rec-paid-amount')?.value || 0);
  const rem = customData?.remainingAmount ?? Math.max(0, (Number(document.getElementById('rec-total-amount')?.value) || 0) - (Number(paid) || 0));

  const qrPayload = `DOCAI|${identity.doctorEn || 'ALSSAEDY'}|NO:${recNo}|DT:${date}|PT:${patient}|PAID:${paid}|REM:${rem}`;

  qrContainer.innerHTML = '';

  // qrcodejs exposes QRCode as a constructor; some alternate libraries expose
  // QRCode.toCanvas. Prefer the constructor loaded by index.html.
  const QR = window.QRCode;

  if (typeof QR === 'function') {
    try {
      new QR(qrContainer, {
        text: qrPayload,
        width: 80,
        height: 80,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QR.CorrectLevel?.M
      });

      const generated = qrContainer.querySelector('canvas, img');
      if (generated) {
        generated.style.display = 'block';
        generated.style.width = '80px';
        generated.style.height = '80px';
        generated.style.maxWidth = '100%';
      }
      return;
    } catch (e) {
      console.warn('QRCode constructor failed; trying toCanvas fallback:', e);
      qrContainer.innerHTML = '';
    }
  }

  if (QR && typeof QR.toCanvas === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    qrContainer.appendChild(canvas);

    try {
      await QR.toCanvas(canvas, qrPayload, {
        width: 80,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      });
      canvas.style.display = 'block';
      canvas.style.width = '80px';
      canvas.style.height = '80px';
      return;
    } catch (e) {
      console.warn('QRCode.toCanvas fallback failed:', e);
      qrContainer.innerHTML = '';
    }
  }

  // Avoid remote QR images: they may fail offline or taint image/PDF exports.
  const unavailable = document.createElement('div');
  unavailable.setAttribute('role', 'status');
  unavailable.style.cssText = 'width:80px;height:80px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;color:#64748b;background:#fff';
  unavailable.textContent = 'QR library unavailable';
  qrContainer.appendChild(unavailable);
  console.error('QRCode.js is not loaded; QR generation was not possible.');
};

/* ==================== 7. لوحة التوقيع الإلكتروني الحر (للمحاسب/الطبيب وللمستلم) ==================== */

window.initSignaturePad = function() {
  const canvas = document.getElementById('signature-pad-canvas');
  if (!canvas || canvas.dataset.initialized === 'true') return;

  const ctx = canvas.getContext('2d');
  window.SigPadState.canvas = canvas;
  window.SigPadState.ctx = ctx;
  canvas.dataset.initialized = 'true';

  ctx.strokeStyle = '#0B2545';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    window.SigPadState.isDrawing = true;
    window.SigPadState.hasDrawn = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const moveDraw = (e) => {
    if (!window.SigPadState.isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    window.SigPadState.isDrawing = false;
  };

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', moveDraw);
  window.addEventListener('mouseup', endDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', moveDraw, { passive: false });
  canvas.addEventListener('touchend', endDraw);
};

window.openSignatureModal = function(target = 'accountant') {
  window.SigPadState.activeTarget = target;
  const modal = document.getElementById('signature-modal');
  const titleEl = document.getElementById('signature-modal-title');
  const permCheckWrap = document.getElementById('sig-permanent-option-wrap');

  if (titleEl) {
    titleEl.textContent = target === 'receiver'
      ? '✍️ التوقيع الإلكتروني للمريض / المستلم'
      : '✍️ التوقيع الإلكتروني للطبيب / المحاسب';
  }

  if (permCheckWrap) {
    if (target === 'accountant') permCheckWrap.classList.remove('hidden');
    else permCheckWrap.classList.add('hidden');
  }

  if (modal) modal.classList.remove('hidden');
  window.initSignaturePad();
  window.clearSignatureCanvas();
};

window.closeSignatureModal = function() {
  const modal = document.getElementById('signature-modal');
  if (modal) modal.classList.add('hidden');
};

window.clearSignatureCanvas = function() {
  const { canvas, ctx } = window.SigPadState;
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  window.SigPadState.hasDrawn = false;
};

window.saveSignatureCanvas = function() {
  const { canvas, activeTarget, hasDrawn } = window.SigPadState;
  if (!canvas) return;

  if (!hasDrawn) {
    // إذا لم يرسم المستخدم شيئاً، نقوم بمسح التوقيع الحالي لهذا الطرف
    if (activeTarget === 'receiver') {
      window.AppState.currentReceiverSig = '';
    } else {
      window.AppState.currentAccountantSig = '';
    }
    window.applySignaturesToReceiptPreview();
    window.closeSignatureModal();
    if (window.showToast) window.showToast('تم إخلاء خانة التوقيع', 'info');
    return;
  }

  const dataUrl = canvas.toDataURL('image/png');
  if (activeTarget === 'receiver') {
    window.AppState.currentReceiverSig = dataUrl;
  } else {
    window.AppState.currentAccountantSig = dataUrl;
    const savePermanent = document.getElementById('sig-save-permanent-checkbox')?.checked;
    if (savePermanent && window.AppState?.settings?.appearance) {
      window.AppState.settings.appearance.permanentAccountantSig = dataUrl;
      if (window.saveSettingsState) window.saveSettingsState();
    }
  }

  window.applySignaturesToReceiptPreview();
  window.closeSignatureModal();
  if (window.showToast) window.showToast('✅ تم اعتماد التوقيع وإدراجه في السند!', 'success');
};

window.applySignaturesToReceiptPreview = function() {
  const accSig = window.AppState.currentAccountantSig || window.AppState?.settings?.appearance?.permanentAccountantSig || '';
  const recSig = window.AppState.currentReceiverSig || '';

  const accImg = document.getElementById('preview-accountant-sig-img');
  const accPlaceholder = document.getElementById('preview-accountant-sig-placeholder');
  if (accImg) {
    if (accSig) {
      accImg.src = accSig;
      accImg.classList.remove('hidden');
      if (accPlaceholder) accPlaceholder.classList.add('hidden');
    } else {
      accImg.classList.add('hidden');
      if (accPlaceholder) accPlaceholder.classList.remove('hidden');
    }
  }

  const recImg = document.getElementById('preview-receiver-sig-img');
  const recPlaceholder = document.getElementById('preview-receiver-sig-placeholder');
  if (recImg) {
    if (recSig) {
      recImg.src = recSig;
      recImg.classList.remove('hidden');
      if (recPlaceholder) recPlaceholder.classList.add('hidden');
    } else {
      recImg.classList.add('hidden');
      if (recPlaceholder) recPlaceholder.classList.remove('hidden');
    }
  }
};
