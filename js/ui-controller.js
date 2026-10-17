
/* ==========================================================================
   DOCAI GEMINI ERP - MODULE 5: UI CONTROLLER, DRAWER, IDENTITY, INVENTORY & CHAT
   File: js/ui-controller.js
   ========================================================================== */

/* ==================== 1. نظام الإشعارات الفورية (Toast Notifications) ==================== */

window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none no-print';
    document.body.appendChild(container);
  }

  const colors = {
    success: 'bg-emerald-600 border-emerald-400 text-white',
    warning: 'bg-amber-600 border-amber-400 text-white',
    error: 'bg-rose-600 border-rose-400 text-white',
    info: 'bg-slate-800 border-sky-400 text-white'
  };

  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: '💡'
  };

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border-r-4 text-sm font-bold transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <span class="text-lg shrink-0">${icons[type] || icons.info}</span>
    <span class="flex-1 leading-relaxed">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3800);
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMarkdownSimple(text) {
  const safe = escapeHtml(text);
  return safe
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-300 font-extrabold">$1</strong>')
    .replace(/^### (.*$)/gm, '<h4 class="text-base font-extrabold text-amber-300 mt-2 mb-1">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 class="text-lg font-extrabold text-sky-300 mt-3 mb-1">$1</h3>')
    .replace(/^- (.*$)/gm, '<div class="flex items-start gap-2 my-0.5"><span class="text-sky-400 font-bold">•</span><span>$1</span></div>')
    .replace(/\n/g, '<br>');
}

/* ==================== 2. القائمة الجانبية المنبثقة (Slide-out Sidebar Drawer) والتنقل ==================== */

window.toggleSidebarDrawer = function(forceOpen = null) {
  const drawer = document.getElementById('sidebar-drawer');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!drawer || !backdrop) return;

  const isOpen = !drawer.classList.contains('translate-x-full');
  const shouldOpen = forceOpen !== null ? forceOpen : !isOpen;

  if (shouldOpen) {
    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('hidden');
  } else {
    drawer.classList.add('translate-x-full');
    backdrop.classList.add('hidden');
  }
};

window.switchMainTab = function(tabName) {
  const tabs = ['receipt', 'records', 'inventory', 'finance', 'ai-chat', 'settings'];
  tabs.forEach(t => {
    const section = document.getElementById(`tab-section-${t}`);
    const btn = document.getElementById(`nav-btn-${t}`);
    const drawerBtn = document.getElementById(`drawer-btn-${t}`);

    if (section) {
      if (t === tabName) section.classList.remove('hidden');
      else section.classList.add('hidden');
    }

    if (btn) {
      if (t === tabName) {
        btn.classList.add('bg-sky-600', 'text-white', 'shadow-lg');
        btn.classList.remove('bg-slate-800/70', 'text-slate-300');
      } else {
        btn.classList.remove('bg-sky-600', 'text-white', 'shadow-lg');
        btn.classList.add('bg-slate-800/70', 'text-slate-300');
      }
    }

    if (drawerBtn) {
      if (t === tabName) drawerBtn.classList.add('bg-sky-600/30', 'border-sky-400', 'text-white');
      else drawerBtn.classList.remove('bg-sky-600/30', 'border-sky-400', 'text-white');
    }
  });

  window.toggleSidebarDrawer(false);

  if (tabName === 'records') window.renderRecordsTable();
  if (tabName === 'inventory') window.renderInventoryTable();
  if (tabName === 'finance') window.renderFinanceAndExpenses();
  if (tabName === 'settings') window.loadSettingsToUI();
};

/* ==================== 3. تطبيق الهوية الكاملة والثيمات على الموقع والسند ==================== */

const THEME_PRESETS = {
  navy: { primary: '#0B2545', secondary: '#1d6fa5', accent: '#00A8E8' },
  emerald: { primary: '#064E3B', secondary: '#047857', accent: '#10B981' },
  royal: { primary: '#311042', secondary: '#581C87', accent: '#A855F7' },
  slate: { primary: '#0F172A', secondary: '#334155', accent: '#38BDF8' }
};

window.applyIdentityAndThemeToDOM = function() {
  const settings = window.AppState.settings;
  const id = settings.identity || {};
  const app = settings.appearance || {};
  const feat = settings.features || {};

  // اختيار ألوان الثيم
  let primary = app.customPrimaryColor || '#0B2545';
  let secondary = app.customSecondaryColor || '#1d6fa5';
  let accent = app.customAccentColor || '#00A8E8';

  if (app.theme && app.theme !== 'custom' && THEME_PRESETS[app.theme]) {
    primary = THEME_PRESETS[app.theme].primary;
    secondary = THEME_PRESETS[app.theme].secondary;
    accent = THEME_PRESETS[app.theme].accent;
  }

  document.documentElement.style.setProperty('--clinic-primary', primary);
  document.documentElement.style.setProperty('--clinic-secondary', secondary);
  document.documentElement.style.setProperty('--clinic-accent', accent);

  // تحديث عنوان الصفحة والهيدر العلوي
  document.title = `${id.systemTitleAr || 'نظام العيادة'} - DOCAI ERP`;
  setText('header-system-title', id.systemTitleAr);
  setText('header-system-badge', id.systemBadgeAr);
  setText('drawer-clinic-title', id.systemTitleAr);
  setText('drawer-doctor-name', id.doctorAr);

  // تحديث ترويسة وتذييل السند
  setText('preview-doctor-ar', id.doctorAr);
  setText('preview-specialty-ar', id.specialtyAr);
  setText('preview-clinic-en', id.clinicEn);
  setText('preview-doctor-en', id.doctorEn);
  setText('preview-address', id.address);
  setText('preview-phones', id.phones);

  // تحديث الشعار والعلامة المائية
  const logoUrl = app.customLogoDataUrl || 'https://cdn-icons-png.flaticon.com/512/2818/2818366.png';
  document.querySelectorAll('.clinic-logo-img').forEach(img => {
    img.src = logoUrl;
  });

  const watermarkImg = document.getElementById('preview-watermark-img');
  if (watermarkImg) {
    watermarkImg.src = logoUrl;
    const opacityVal = (Number(app.watermarkOpacity) || 6) / 100;
    watermarkImg.style.opacity = String(opacityVal);
  }

  // إظهار أو إخفاء شريط الإدخال الذكي في السند
  const aiBar = document.getElementById('smart-ai-receipt-bar');
  if (aiBar) {
    if (feat.showAiBar === false) aiBar.classList.add('hidden');
    else aiBar.classList.remove('hidden');
  }

  window.updateLiveReceiptPreview();
  window.updateVoiceBadgesUI();
};

function setText(elementId, value) {
  const el = document.getElementById(elementId);
  if (el && value !== undefined) el.textContent = value;
}

/* ==================== 4. إدارة نموذج السند، أزرار الخدمات، والمعاينة الحية ==================== */

window.renderServiceChips = function() {
  const container = document.getElementById('services-chips-container');
  if (!container) return;

  const services = window.AppState.settings.services || [];
  container.innerHTML = services.map(srv => {
    const isSelected = window.AppState.selectedServices.has(srv.name);
    const activeClasses = isSelected
      ? 'bg-sky-600 text-white border-sky-400 shadow-md scale-[1.02]'
      : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-sky-500/50';
    return `
      <button type="button"
        onclick="window.toggleServiceSelection('${escapeHtml(srv.name)}', ${Number(srv.price) || 0})"
        class="px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-between gap-2 ${activeClasses}">
        <span>🦷 ${escapeHtml(srv.name)}</span>
        <span class="px-1.5 py-0.5 rounded bg-black/25 text-[11px] text-amber-300">${(Number(srv.price) || 0).toLocaleString()}</span>
      </button>
    `;
  }).join('');

  // تحديث قائمة الخدمات المرتبطة في نموذج المخزون أيضاً
  const invServiceSelect = document.getElementById('inv-linked-service');
  if (invServiceSelect) {
    const currentVal = invServiceSelect.value;
    invServiceSelect.innerHTML = `<option value="">-- بدون ربط بخدمة --</option>` +
      services.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
    if (currentVal) invServiceSelect.value = currentVal;
  }
};

window.toggleServiceSelection = function(serviceName, price = 0) {
  const set = window.AppState.selectedServices;
  const totalInput = document.getElementById('rec-total-amount');
  const paidInput = document.getElementById('rec-paid-amount');
  const autoPrice = window.AppState.settings.features.autoPrice !== false;

  let currentTotal = Number(totalInput?.value) || 0;

  if (set.has(serviceName)) {
    set.delete(serviceName);
    if (autoPrice && price > 0) {
      currentTotal = Math.max(0, currentTotal - Number(price));
    }
  } else {
    set.add(serviceName);
    if (autoPrice && price > 0) {
      currentTotal += Number(price);
    }
  }

  if (autoPrice && totalInput) {
    totalInput.value = currentTotal || '';
    if (paidInput && (!paidInput.value || Number(paidInput.value) === 0 || !window.AppState.editingReceiptId)) {
      paidInput.value = currentTotal || '';
    }
  }

  window.renderServiceChips();
  window.updateLiveReceiptPreview();
};

window.checkPatientPreviousDebtUI = function() {
  const alertBox = document.getElementById('patient-debt-alert-box');
  if (!alertBox) return;

  if (window.AppState.settings.features.debtAlert === false) {
    alertBox.classList.add('hidden');
    return;
  }

  const name = document.getElementById('rec-patient-name')?.value || '';
  const phone = document.getElementById('rec-patient-phone')?.value || '';
  const summary = window.ClinicDB.getPatientDebtSummary(name, phone);
  window.AppState.currentPreviousDebt = summary.totalDebt;

  if (summary.totalDebt > 0) {
    const curr = document.getElementById('rec-currency')?.value || window.AppState.settings.identity.defaultCurrency;
    alertBox.classList.remove('hidden');
    alertBox.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span>⚠️ تنبيه: يوجد على هذا المريض دين سابق بقيمة <strong>${summary.totalDebt.toLocaleString()} ${escapeHtml(curr)}</strong> (${summary.records.length} سند).</span>
        <button type="button" onclick="window.switchMainTab('records')" class="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-xs shrink-0">عرض السجل</button>
      </div>
    `;
  } else {
    alertBox.classList.add('hidden');
    alertBox.innerHTML = '';
  }
};

window.updateLiveReceiptPreview = function() {
  const id = window.AppState.settings.identity || {};
  const recNo = document.getElementById('rec-no')?.value || window.ClinicDB.getNextReceiptNumber();
  const recDate = document.getElementById('rec-date')?.value || new Date().toISOString().slice(0, 10);
  const patientName = document.getElementById('rec-patient-name')?.value?.trim() || '................................................';
  const patientPhone = document.getElementById('rec-patient-phone')?.value?.trim() || '—';
  const totalAmount = Number(document.getElementById('rec-total-amount')?.value) || 0;
  const paidAmount = Number(document.getElementById('rec-paid-amount')?.value) || 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const currency = document.getElementById('rec-currency')?.value || id.defaultCurrency || 'ريال يمني';
  const paymentMethod = document.getElementById('rec-payment-method')?.value || 'نقداً (Cash)';
  const notes = document.getElementById('rec-notes')?.value?.trim() || '';

  const selectedServicesArr = Array.from(window.AppState.selectedServices);
  const servicesText = selectedServicesArr.length > 0
    ? selectedServicesArr.join(' + ')
    : (notes || 'كشف وخدمات علاجية للأسنان');

  const words = window.numberToArabicWords(paidAmount, currency);

  const remInput = document.getElementById('rec-remaining-amount');
  if (remInput) remInput.value = remainingAmount;

  const wordsInput = document.getElementById('rec-amount-words');
  if (wordsInput) wordsInput.value = words;

  setText('preview-rec-no', `#${recNo}`);
  setText('preview-rec-date', recDate);
  setText('preview-patient-name', patientName);
  setText('preview-patient-phone', patientPhone);
  setText('preview-services-text', servicesText);
  setText('preview-total-amount', `${totalAmount.toLocaleString()} ${currency}`);
  setText('preview-paid-amount', `${paidAmount.toLocaleString()} ${currency}`);
  setText('preview-remaining-amount', `${remainingAmount.toLocaleString()} ${currency}`);
  setText('preview-amount-words', words);
  setText('preview-payment-method', paymentMethod);
  setText('preview-notes', notes || 'نتمنى لكم دوام الصحة والابتسامة المشرقة');

  // تلوين حالة المتبقي داخل السند
  const remBadge = document.getElementById('preview-remaining-box');
  if (remBadge) {
    if (remainingAmount > 0) {
      remBadge.classList.add('bg-rose-50', 'border-rose-300', 'text-rose-800');
      remBadge.classList.remove('bg-emerald-50', 'border-emerald-300', 'text-emerald-800');
    } else {
      remBadge.classList.remove('bg-rose-50', 'border-rose-300', 'text-rose-800');
      remBadge.classList.add('bg-emerald-50', 'border-emerald-300', 'text-emerald-800');
    }
  }

  if (window.applySignaturesToReceiptPreview) window.applySignaturesToReceiptPreview();
  if (window.updateReceiptQRCode) {
    window.updateReceiptQRCode({
      receiptNo: recNo,
      date: recDate,
      patientName: patientName,
      paidAmount: paidAmount,
      remainingAmount: remainingAmount
    });
  }
};

window.resetReceiptForm = function() {
  window.AppState.editingReceiptId = null;
  window.AppState.selectedServices.clear();
  window.AppState.currentReceiverSig = '';
  window.AppState.currentAccountantSig = window.AppState.settings.appearance.permanentAccountantSig || '';

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('rec-no', window.ClinicDB.getNextReceiptNumber());
  setVal('rec-date', new Date().toISOString().slice(0, 10));
  setVal('rec-patient-name', '');
  setVal('rec-patient-phone', '');
  setVal('rec-total-amount', '');
  setVal('rec-paid-amount', '');
  setVal('rec-remaining-amount', '0');
  setVal('rec-currency', window.AppState.settings.identity.defaultCurrency || 'ريال يمني');
  setVal('rec-payment-method', 'نقداً (Cash)');
  setVal('rec-notes', '');
  setVal('ai-smart-input', '');

  const alertBox = document.getElementById('patient-debt-alert-box');
  if (alertBox) alertBox.classList.add('hidden');

  window.renderServiceChips();
  window.updateLiveReceiptPreview();
  window.refreshPatientsDatalist();
};

window.saveCurrentReceiptFromUI = function() {
  const patientName = document.getElementById('rec-patient-name')?.value?.trim();
  if (!patientName) {
    window.showToast('يرجى إدخال اسم المريض أولاً قبل حفظ السند', 'warning');
    document.getElementById('rec-patient-name')?.focus();
    return null;
  }

  const totalAmount = Number(document.getElementById('rec-total-amount')?.value) || 0;
  const paidAmount = Number(document.getElementById('rec-paid-amount')?.value) || 0;
  const currency = document.getElementById('rec-currency')?.value || window.AppState.settings.identity.defaultCurrency;

  const payload = {
    id: window.AppState.editingReceiptId || undefined,
    receiptNo: document.getElementById('rec-no')?.value || window.ClinicDB.getNextReceiptNumber(),
    date: document.getElementById('rec-date')?.value || new Date().toISOString().slice(0, 10),
    patientName: patientName,
    patientPhone: document.getElementById('rec-patient-phone')?.value?.trim() || '',
    services: Array.from(window.AppState.selectedServices),
    totalAmount: totalAmount,
    paidAmount: paidAmount,
    remainingAmount: Math.max(0, totalAmount - paidAmount),
    currency: currency,
    paymentMethod: document.getElementById('rec-payment-method')?.value || 'نقداً (Cash)',
    notes: document.getElementById('rec-notes')?.value?.trim() || '',
    amountWords: window.numberToArabicWords(paidAmount, currency),
    paperFormat: document.getElementById('pdf-paper-size-select')?.value || 'a5'
  };

  const saved = window.ClinicDB.saveReceipt(payload);
  window.showToast(`تم حفظ سند القبض رقم #${saved.receiptNo} للمريض (${saved.patientName}) بنجاح!`, 'success');

  window.renderRecordsTable();
  window.renderInventoryTable();
  window.renderFinanceAndExpenses();
  window.refreshPatientsDatalist();
  return saved;
};

window.refreshPatientsDatalist = function() {
  const datalist = document.getElementById('patients-datalist');
  if (!datalist) return;
  const patients = window.ClinicDB.getUniquePatients();
  datalist.innerHTML = patients.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.phone)}</option>`).join('');
};

/* ==================== 5. المحلل الذكي للسند (Smart AI Receipt Bar) ==================== */

window.handleSmartBarParse = async function() {
  const inputEl = document.getElementById('ai-smart-input');
  const rawText = inputEl?.value?.trim();
  if (!rawText) {
    window.showToast('يرجى كتابة أو إملاء تفاصيل السند في الشريط الذكي أولاً', 'warning');
    return;
  }

  window.showToast('🤖 جاري تحليل السند وتعبئة الحقول تلقائياً...', 'info');

  // 1. محاولة التحليل عبر الذكاء الاصطناعي أولاً
  let parsed = null;
  if (window.parseReceiptWithSmartAI) {
    parsed = await window.parseReceiptWithSmartAI(rawText);
  }

  // 2. محلل محلي فوري مساند (Regex Heuristic) لضمان الدقة حتى بدون إنترنت
  if (!parsed || !parsed.patientName || parsed.patientName === 'اسم المريض أو مجهول') {
    parsed = localSmartReceiptHeuristic(rawText);
  }

  if (parsed.patientName && parsed.patientName !== 'مجهول') {
    const nameEl = document.getElementById('rec-patient-name');
    if (nameEl) nameEl.value = parsed.patientName;
  }
  if (parsed.patientPhone) {
    const phoneEl = document.getElementById('rec-patient-phone');
    if (phoneEl) phoneEl.value = parsed.patientPhone;
  }

  // مطابقة الخدمات العلاجية
  if (Array.isArray(parsed.services) && parsed.services.length > 0) {
    window.AppState.selectedServices.clear();
    const catalog = window.AppState.settings.services || [];
    parsed.services.forEach(srvText => {
      const found = catalog.find(c =>
        c.name.includes(srvText) ||
        srvText.includes(c.name) ||
        (c.keywords || []).some(k => srvText.includes(k))
      );
      if (found) window.AppState.selectedServices.add(found.name);
      else window.AppState.selectedServices.add(srvText);
    });
  }

  if (Number(parsed.totalAmount) > 0) {
    document.getElementById('rec-total-amount').value = Number(parsed.totalAmount);
  }
  if (parsed.paidAmount !== undefined && Number(parsed.paidAmount) >= 0) {
    document.getElementById('rec-paid-amount').value = Number(parsed.paidAmount);
  } else if (Number(parsed.totalAmount) > 0) {
    document.getElementById('rec-paid-amount').value = Number(parsed.totalAmount);
  }

  window.renderServiceChips();
  window.checkPatientPreviousDebtUI();
  window.updateLiveReceiptPreview();
  window.showToast('✨ تم تعبئة بيانات السند تلقائياً بنجاح!', 'success');
};

function localSmartReceiptHeuristic(text) {
  const result = {
    patientName: '',
    patientPhone: '',
    services: [],
    totalAmount: 0,
    paidAmount: 0
  };

  // استخراج رقم الهاتف اليمني (9 أرقام تبدأ بـ 7)
  const phoneMatch = text.match(/\b(7\d{8})\b/);
  if (phoneMatch) result.patientPhone = phoneMatch[1];

  // استخراج الخدمات بناء على الكلمات المفتاحية
  const catalog = window.AppState.settings.services || [];
  let calculatedTotal = 0;
  catalog.forEach(srv => {
    const hit = srv.name && text.includes(srv.name) || (srv.keywords || []).some(k => text.includes(k));
    if (hit) {
      result.services.push(srv.name);
      calculatedTotal += Number(srv.price) || 0;
    }
  });

  // استخراج المبالغ المالية
  const numbers = (text.replace(/\b7\d{8}\b/g, '').match(/\d+/g) || []).map(Number).filter(n => n >= 500);
  if (numbers.length >= 2) {
    result.totalAmount = Math.max(numbers[0], numbers[1]);
    result.paidAmount = Math.min(numbers[0], numbers[1]);
  } else if (numbers.length === 1) {
    result.totalAmount = Math.max(calculatedTotal, numbers[0]);
    result.paidAmount = numbers[0];
  } else {
    result.totalAmount = calculatedTotal;
    result.paidAmount = calculatedTotal;
  }

  // استخراج اسم المريض
  const nameMatch = text.match(/(?:للمريض|المريض|مريض|باسم|اسم)\s+([\u0600-\u06FF\s]{3,28}?)(?:\s+هاتف|\s+رقم|\s+حشو|\s+خلع|\s+عصب|\s+كشف|\s+تنظيف|\s+تركيب|\s+تقويم|\s+مبلغ|\s+دفع|\d|$)/);
  if (nameMatch && nameMatch[1]) {
    result.patientName = nameMatch[1].trim();
  }

  return result;
}

/* ==================== 6. جدول سجل السندات والديون (Records & Debts Table) ==================== */

window.renderRecordsTable = function() {
  const tbody = document.getElementById('records-table-body');
  if (!tbody) return;

  const searchQ = (document.getElementById('records-search-input')?.value || '').toLowerCase().trim();
  const filterStatus = document.getElementById('records-filter-status')?.value || 'all';

  const allReceipts = window.AppState.receipts || [];
  const filtered = allReceipts.filter(r => {
    const rem = Number(r.remainingAmount) || 0;
    if (filterStatus === 'debt' && rem <= 0) return false;
    if (filterStatus === 'paid' && rem > 0) return false;

    if (!searchQ) return true;
    const hay = `${r.receiptNo} ${r.patientName} ${r.patientPhone} ${(r.services || []).join(' ')} ${r.date}`.toLowerCase();
    return hay.includes(searchQ);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-slate-400 font-bold">لا توجد سندات مطابقة للبحث الحالي</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const rem = Number(r.remainingAmount) || 0;
    const statusBadge = rem > 0
      ? `<span class="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-extrabold">متبقي: ${rem.toLocaleString()}</span>`
      : `<span class="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold">خالص ✅</span>`;

    return `
      <tr class="border-b border-slate-800 hover:bg-slate-800/60 transition-colors text-xs">
        <td class="py-3 px-3 font-extrabold text-sky-400">#${escapeHtml(r.receiptNo)}</td>
        <td class="py-3 px-3 text-slate-300">${escapeHtml(r.date)}</td>
        <td class="py-3 px-3 font-bold text-white">${escapeHtml(r.patientName)}</td>
        <td class="py-3 px-3 text-slate-300" dir="ltr">${escapeHtml(r.patientPhone || '—')}</td>
        <td class="py-3 px-3 text-slate-200">${escapeHtml((r.services || []).join(' + ') || 'خدمات عامة')}</td>
        <td class="py-3 px-3 font-bold text-emerald-300">${(Number(r.paidAmount) || 0).toLocaleString()} / ${(Number(r.totalAmount) || 0).toLocaleString()}</td>
        <td class="py-3 px-3">${statusBadge}</td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${rem > 0 ? `<button type="button" onclick="window.promptSettleDebtUI('${r.id}')" class="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold">💰 تسديد</button>` : ''}
            <button type="button" onclick="window.editReceiptRecord('${r.id}')" class="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold">📄 عرض/تعديل</button>
            <button type="button" onclick="window.deleteReceiptRecordUI('${r.id}')" class="px-2.5 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold">🗑️ حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

window.editReceiptRecord = function(id) {
  const rec = (window.AppState.receipts || []).find(r => r.id === id);
  if (!rec) return;

  window.AppState.editingReceiptId = rec.id;
  window.AppState.selectedServices = new Set(Array.isArray(rec.services) ? rec.services : []);

  const setVal = (elId, val) => {
    const el = document.getElementById(elId);
    if (el) el.value = val ?? '';
  };

  setVal('rec-no', rec.receiptNo);
  setVal('rec-date', rec.date);
  setVal('rec-patient-name', rec.patientName);
  setVal('rec-patient-phone', rec.patientPhone);
  setVal('rec-total-amount', rec.totalAmount);
  setVal('rec-paid-amount', rec.paidAmount);
  setVal('rec-currency', rec.currency || 'ريال يمني');
  setVal('rec-payment-method', rec.paymentMethod || 'نقداً (Cash)');
  setVal('rec-notes', rec.notes || '');
  const paperFormat = document.getElementById('pdf-paper-size-select');
  if (paperFormat) paperFormat.value = rec.paperFormat || 'a5';

  window.switchMainTab('receipt');
  window.renderServiceChips();
  window.updateLiveReceiptPreview();
  window.showToast(`تم تحميل السند رقم #${rec.receiptNo} في شاشة المعاينة والتعديل`, 'info');
};

window.promptSettleDebtUI = function(id) {
  const rec = (window.AppState.receipts || []).find(r => r.id === id);
  if (!rec) return;
  const rem = Number(rec.remainingAmount) || 0;
  const input = prompt(`تسديد دين للمريض: ${rec.patientName}\nالمبلغ المتبقي الحالي: ${rem.toLocaleString()}\nأدخل المبلغ المدفوع الآن:`, String(rem));
  if (input === null) return;
  const amount = Number(input);
  if (isNaN(amount) || amount <= 0) {
    window.showToast('يرجى إدخال مبلغ صحيح أكبر من الصفر', 'warning');
    return;
  }

  window.ClinicDB.settleReceiptDebt(id, amount);
  window.renderRecordsTable();
  window.renderFinanceAndExpenses();
  window.showToast(`تم تسديد ${amount.toLocaleString()} من دين المريض (${rec.patientName}) بنجاح!`, 'success');
};

window.deleteReceiptRecordUI = function(id) {
  if (!confirm('هل أنت متأكد من حذف هذا السند نهائياً؟')) return;
  window.ClinicDB.deleteReceipt(id);
  window.renderRecordsTable();
  window.renderFinanceAndExpenses();
  window.showToast('تم حذف السند بنجاح', 'info');
};

/* ==================== 7. نظام المخزون التفصيلي ذو الأزرار البارزة (Detailed Inventory UI) ==================== */

window.populateInventoryUnitsSelect = function() {
  const unitSelect = document.getElementById('inv-unit');
  if (!unitSelect) return;
  const units = window.INVENTORY_UNITS || [];
  unitSelect.innerHTML = units.map(u => `<option value="${escapeHtml(u.value)}">${escapeHtml(u.label)}</option>`).join('');
};

window.calcInventoryFormTotal = function() {
  const qty = Number(document.getElementById('inv-qty')?.value) || 0;
  const unitPrice = Number(document.getElementById('inv-unit-price')?.value) || 0;
  const totalEl = document.getElementById('inv-total-cost');
  if (totalEl) {
    totalEl.value = +(qty * unitPrice).toFixed(2);
  }
};

window.saveInventoryFromUI = function() {
  const name = document.getElementById('inv-name')?.value?.trim();
  if (!name) {
    window.showToast('يرجى إدخال اسم المادة الطبية أولاً', 'warning');
    return;
  }

  const qty = Number(document.getElementById('inv-qty')?.value) || 0;
  const unit = document.getElementById('inv-unit')?.value || 'عدد';
  const minQty = Number(document.getElementById('inv-min-qty')?.value) || 5;
  const unitPrice = Number(document.getElementById('inv-unit-price')?.value) || 0;
  const totalCost = Number(document.getElementById('inv-total-cost')?.value) || +(qty * unitPrice).toFixed(2);
  const linkedService = document.getElementById('inv-linked-service')?.value || '';
  const notes = document.getElementById('inv-notes')?.value?.trim() || '';
  const recordAsExpense = Boolean(document.getElementById('inv-record-expense')?.checked);

  const saved = window.ClinicDB.saveInventoryItem({
    id: window.AppState.editingInventoryId || undefined,
    name,
    qty,
    unit,
    minQty,
    unitPrice,
    totalCost,
    linkedService,
    notes,
    recordAsExpense
  });

  window.resetInventoryFormUI();
  window.renderInventoryTable();
  window.renderFinanceAndExpenses();
  window.showToast(`✅ تم حفظ الصنف (${saved.name} - ${saved.qty} ${saved.unit}) في المخزون!`, 'success');
};

window.resetInventoryFormUI = function() {
  window.AppState.editingInventoryId = null;
  ['inv-name', 'inv-qty', 'inv-unit-price', 'inv-total-cost', 'inv-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const minEl = document.getElementById('inv-min-qty');
  if (minEl) minEl.value = '5';
  const expCheck = document.getElementById('inv-record-expense');
  if (expCheck) expCheck.checked = false;
  const saveBtn = document.getElementById('inv-save-btn-text');
  if (saveBtn) saveBtn.textContent = '➕ حفظ وإضافة المادة للمخزون';
};

window.renderInventoryTable = function() {
  const tbody = document.getElementById('inventory-table-body');
  const statsBar = document.getElementById('inventory-stats-bar');
  if (!tbody) return;

  const list = window.AppState.inventory || [];
  const overview = window.ClinicDB.getFinancialOverview();
  const curr = window.AppState.settings.identity.defaultCurrency || 'ريال يمني';

  if (statsBar) {
    statsBar.innerHTML = `
      <div class="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
        <span class="text-slate-400 text-xs font-bold">إجمالي الأصناف</span>
        <span class="text-lg font-extrabold text-sky-400">${list.length} صنف</span>
      </div>
      <div class="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
        <span class="text-slate-400 text-xs font-bold">القيمة الإجمالية للمخزون</span>
        <span class="text-lg font-extrabold text-emerald-400">${overview.totalInventoryValue.toLocaleString()} ${escapeHtml(curr)}</span>
      </div>
      <div class="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
        <span class="text-slate-400 text-xs font-bold">أصناف تحت حد التنبيه</span>
        <span class="text-lg font-extrabold ${overview.lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'}">${overview.lowStockCount}</span>
      </div>
    `;
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 font-bold">لا توجد مواد مسجلة في المخزون حالياً</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(item => {
    const isLow = Number(item.qty) <= Number(item.minQty);
    const totalVal = +((Number(item.qty) || 0) * (Number(item.unitPrice) || 0)).toFixed(2);
    const statusBadge = isLow
      ? `<span class="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500 text-rose-300 text-xs font-extrabold animate-pulse">⚠️ نقص (${item.qty} ${escapeHtml(item.unit || 'عدد')})</span>`
      : `<span class="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold">متوفر (${item.qty} ${escapeHtml(item.unit || 'عدد')})</span>`;

    return `
      <tr class="border-b border-slate-800 hover:bg-slate-800/60 transition-colors text-xs">
        <td class="py-3.5 px-3">
          <div class="font-extrabold text-white text-sm">${escapeHtml(item.name)}</div>
          <div class="text-slate-400 text-[11px]">${escapeHtml(item.notes || item.linkedService || 'مادة طبية عامة')}</div>
        </td>
        <td class="py-3.5 px-3 font-extrabold text-base text-sky-300">
          ${item.qty} <span class="text-xs text-amber-300 font-bold">${escapeHtml(item.unit || 'عدد')}</span>
        </td>
        <td class="py-3.5 px-3 text-slate-300">${item.minQty} ${escapeHtml(item.unit || 'عدد')}</td>
        <td class="py-3.5 px-3 font-bold text-slate-200">${(Number(item.unitPrice) || 0).toLocaleString()}</td>
        <td class="py-3.5 px-3 font-extrabold text-emerald-300">${totalVal.toLocaleString()}</td>
        <td class="py-3.5 px-3">${statusBadge}</td>
        <td class="py-3.5 px-3">
          <!-- أزرار كبيرة وبارزة وواضحة للاستهلاك والتزويد والتعديل والحذف -->
          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" onclick="window.quickConsumeInventoryUI('${item.id}')"
              class="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-1">
              <span>➖</span><span>استهلاك مادة</span>
            </button>
            <button type="button" onclick="window.quickRestockInventoryUI('${item.id}')"
              class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1">
              <span>➕</span><span>تزويد مخزون</span>
            </button>
            <button type="button" onclick="window.editInventoryItemUI('${item.id}')"
              class="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md">
              ✏️ تعديل
            </button>
            <button type="button" onclick="window.deleteInventoryItemUI('${item.id}')"
              class="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md">
              🗑️ حذف
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

window.quickConsumeInventoryUI = function(id) {
  const item = (window.AppState.inventory || []).find(i => i.id === id);
  if (!item) return;
  const val = prompt(`➖ استهلاك من: ${item.name}\nالكمية المتوفرة حالياً: ${item.qty} ${item.unit || 'عدد'}\nأدخل الكمية المستهلكة (يدعم الكسور مثل 0.5 أو 1):`, '1');
  if (val === null) return;
  const amount = Number(val);
  if (isNaN(amount) || amount <= 0) {
    window.showToast('يرجى إدخال كمية استهلاك صحيحة أكبر من الصفر', 'warning');
    return;
  }

  const updated = window.ClinicDB.consumeInventoryItem(id, amount);
  window.renderInventoryTable();
  window.showToast(`تم خصم ${amount} ${updated.unit} من (${updated.name}). المتبقي: ${updated.qty} ${updated.unit}`, 'info');
};

window.quickRestockInventoryUI = function(id) {
  const item = (window.AppState.inventory || []).find(i => i.id === id);
  if (!item) return;
  const val = prompt(`➕ تزويد مخزون: ${item.name}\nالكمية الحالية: ${item.qty} ${item.unit || 'عدد'}\nأدخل الكمية المضافة الجديدة:`, '5');
  if (val === null) return;
  const addQty = Number(val);
  if (isNaN(addQty) || addQty <= 0) {
    window.showToast('يرجى إدخال كمية صحيحة أكبر من الصفر', 'warning');
    return;
  }

  const priceInput = prompt(`سعر الوحدة الحالي هو (${item.unitPrice || 0}).\nأدخل سعر الوحدة الجديد أو اتركه كما هو:`, String(item.unitPrice || 0));
  const newPrice = priceInput !== null && priceInput.trim() !== '' ? Number(priceInput) : item.unitPrice;
  const recordExp = confirm('هل ترغب بتسجيل تكلفة هذه الكمية المضافة كمصروف شراء في الحسابات المالية؟');

  const updated = window.ClinicDB.restockInventoryItem(id, addQty, newPrice, recordExp);
  window.renderInventoryTable();
  window.renderFinanceAndExpenses();
  window.showToast(`✅ تم تزويد (${updated.name}) ليصبح الرصيد: ${updated.qty} ${updated.unit}`, 'success');
};

window.editInventoryItemUI = function(id) {
  const item = (window.AppState.inventory || []).find(i => i.id === id);
  if (!item) return;
  window.AppState.editingInventoryId = item.id;

  const setVal = (elId, v) => {
    const el = document.getElementById(elId);
    if (el) el.value = v ?? '';
  };

  setVal('inv-name', item.name);
  setVal('inv-qty', item.qty);
  setVal('inv-unit', item.unit || 'عدد');
  setVal('inv-min-qty', item.minQty);
  setVal('inv-unit-price', item.unitPrice);
  setVal('inv-total-cost', item.totalCost || (Number(item.qty) * Number(item.unitPrice)));
  setVal('inv-linked-service', item.linkedService || '');
  setVal('inv-notes', item.notes || '');

  const saveBtn = document.getElementById('inv-save-btn-text');
  if (saveBtn) saveBtn.textContent = '💾 حفظ التعديلات على المادة';
  window.showToast(`جاري تعديل بيانات المادة: ${item.name}`, 'info');
};

window.deleteInventoryItemUI = function(id) {
  const item = (window.AppState.inventory || []).find(i => i.id === id);
  if (!item) return;
  if (!confirm(`هل أنت متأكد من حذف مادة (${item.name}) من المخزون؟`)) return;
  window.ClinicDB.deleteInventoryItem(id);
  window.renderInventoryTable();
  window.showToast('تم حذف المادة من المخزون', 'info');
};

window.runInventoryAuditAI = async function() {
  window.switchMainTab('ai-chat');
  const query = 'قم بإجراء تدقيق شامل لمخزون العيادة الآن، وحدد الأصناف التي تعاني من نقص حرج، واحسب التكلفة التقديرية لإعادة التزويد، وقدم توصياتك العملية.';
  window.appendChatMessageUI('user', '📦 فحص وتدقيق المخزون بالذكاء الاصطناعي');
  const reply = await window.callAI(query);
  window.appendChatMessageUI('ai', reply);
};

/* ==================== 8. الإدارة المالية والمصروفات والتقارير الشاملة ==================== */

window.renderFinanceAndExpenses = function() {
  const kpiContainer = document.getElementById('finance-kpi-cards');
  const expTbody = document.getElementById('expenses-table-body');
  const ov = window.ClinicDB.getFinancialOverview();
  const curr = window.AppState.settings.identity.defaultCurrency || 'ريال يمني';

  if (kpiContainer) {
    kpiContainer.innerHTML = `
      <div class="bg-slate-800/90 border border-emerald-500/40 rounded-2xl p-4">
        <div class="text-xs text-slate-400 font-bold">إجمالي الإيرادات المقبوضة</div>
        <div class="text-2xl font-extrabold text-emerald-400 mt-1">${ov.totalCollectedRevenue.toLocaleString()} <span class="text-xs">${escapeHtml(curr)}</span></div>
        <div class="text-[11px] text-slate-400 mt-1">من إجمالي ${ov.totalReceiptsCount} سند قبض</div>
      </div>
      <div class="bg-slate-800/90 border border-rose-500/40 rounded-2xl p-4">
        <div class="text-xs text-slate-400 font-bold">إجمالي الديون المتبقية للعيادة</div>
        <div class="text-2xl font-extrabold text-rose-400 mt-1">${ov.totalPendingDebts.toLocaleString()} <span class="text-xs">${escapeHtml(curr)}</span></div>
        <div class="text-[11px] text-slate-400 mt-1">على ${ov.debtorsCount} مريض</div>
      </div>
      <div class="bg-slate-800/90 border border-amber-500/40 rounded-2xl p-4">
        <div class="text-xs text-slate-400 font-bold">إجمالي المصروفات والمشتريات</div>
        <div class="text-2xl font-extrabold text-amber-400 mt-1">${ov.totalExpenses.toLocaleString()} <span class="text-xs">${escapeHtml(curr)}</span></div>
        <div class="text-[11px] text-slate-400 mt-1">قيمة المخزون الحالي: ${ov.totalInventoryValue.toLocaleString()}</div>
      </div>
      <div class="bg-slate-800/90 border border-sky-500/40 rounded-2xl p-4">
        <div class="text-xs text-slate-400 font-bold">صافي التدفق النقدي (الأرباح الصافية)</div>
        <div class="text-2xl font-extrabold text-sky-400 mt-1">${ov.netCashProfit.toLocaleString()} <span class="text-xs">${escapeHtml(curr)}</span></div>
        <div class="text-[11px] text-slate-400 mt-1">الإيرادات المحصلة ناقص المصروفات</div>
      </div>
    `;
  }

  if (expTbody) {
    const expenses = window.AppState.expenses || [];
    if (expenses.length === 0) {
      expTbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400 font-bold">لا توجد مصروفات مسجلة حتى الآن</td></tr>`;
    } else {
      expTbody.innerHTML = expenses.map(e => `
        <tr class="border-b border-slate-800 hover:bg-slate-800/50 text-xs">
          <td class="py-3 px-3 text-slate-300">${escapeHtml(e.date)}</td>
          <td class="py-3 px-3 font-bold text-white">${escapeHtml(e.title)}</td>
          <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-slate-700 text-sky-300">${escapeHtml(e.category || 'عام')}</span></td>
          <td class="py-3 px-3 font-extrabold text-amber-400">${(Number(e.amount) || 0).toLocaleString()} ${escapeHtml(curr)}</td>
          <td class="py-3 px-3">
            <button type="button" onclick="window.deleteExpenseUI('${e.id}')" class="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold">🗑️ حذف</button>
          </td>
        </tr>
      `).join('');
    }
  }
};

window.addExpenseFromUI = function() {
  const title = document.getElementById('exp-title')?.value?.trim();
  const amount = Number(document.getElementById('exp-amount')?.value) || 0;
  const category = document.getElementById('exp-category')?.value || 'عام';

  if (!title || amount <= 0) {
    window.showToast('يرجى إدخال بيان المصروف والمبلغ بشكل صحيح', 'warning');
    return;
  }

  window.ClinicDB.addExpense(title, amount, category);
  document.getElementById('exp-title').value = '';
  document.getElementById('exp-amount').value = '';
  window.renderFinanceAndExpenses();
  window.showToast('تم تسجيل المصروف وخصمه من صافي الأرباح بنجاح', 'success');
};

window.deleteExpenseUI = function(id) {
  if (!confirm('هل تريد حذف هذا المصروف؟')) return;
  window.ClinicDB.deleteExpense(id);
  window.renderFinanceAndExpenses();
  window.showToast('تم حذف المصروف', 'info');
};

window.generateComprehensiveFinancialReport = async function() {
  window.switchMainTab('ai-chat');
  window.appendChatMessageUI('user', '📊 توليد تقرير مالي وإداري شامل للعيادة');
  const prompt = 'بناءً على بيانات العيادة المالية والسندات والديون والمخزون والمصروفات، قدم تقريراً مالياً وإدارياً منظماً يشمل: ملخص الإيرادات والأرباح الصافية، تحليل الديون المتأخرة وأسماء أبرز المدينين، حالة المخزون، و3 نصائح لزيادة ربحية العيادة.';
  const reply = await window.callAI(prompt);
  window.appendChatMessageUI('ai', reply);
};

/* ==================== 9. شاشة المحادثة الذكية المنسقة (Clean Non-Overlapping AI Chat) ==================== */

window.updateModelSelectDropdown = function() {
  const selects = document.querySelectorAll('.ai-model-selector');
  const verifiedIds = window.AppState.verifiedModels || [];
  const catalog = window.AI_MODELS_CATALOG || [];

  const availableModels = catalog.filter(m => verifiedIds.includes(m.id) && m.status === 'working');
  selects.forEach(sel => {
    const current = window.AppState.settings.ai.selectedMode || 'auto';
    sel.innerHTML = `<option value="auto">⚡ توجيه ذكي تلقائي</option>` +
      availableModels.map(m => `<option value="${escapeHtml(m.id)}">🟢 ${escapeHtml(m.name)} (${escapeHtml(m.provider)})</option>`).join('');
    sel.value = availableModels.some(m => m.id === current) ? current : 'auto';
    if (sel.value !== current && current !== 'auto') {
      window.AppState.settings.ai.selectedMode = 'auto';
      window.saveSettingsState();
    }
  });
};

window.onQuickModelChange = function(selectEl) {
  const val = selectEl?.value || 'auto';
  window.AppState.settings.ai.selectedMode = val;
  window.saveSettingsState();
  window.showToast(`تم التبديل إلى النموذج: ${val}`, 'info');
};

window.updateVoiceBadgesUI = function() {
  const { stt, tts } = window.getActiveVoiceEngines ? window.getActiveVoiceEngines() : { stt: 'ai_cloud', tts: 'ai_cloud' };

  const sttBadge = document.getElementById('active-stt-badge');
  const ttsBadge = document.getElementById('active-tts-badge');

  if (sttBadge) {
    sttBadge.textContent = stt === 'ai_cloud' ? '🎙️ الإدخال: صوت النماذج السحابية (AI)' : '🎙️ الإدخال: مايكروفون الهاتف المحلي';
  }
  if (ttsBadge) {
    ttsBadge.textContent = tts === 'ai_cloud' ? '🔊 النطق: صوت النماذج السحابية (AI)' : '🔊 النطق: قارئ الهاتف المحلي';
  }

  const sttSelect = document.getElementById('cfg-stt-engine');
  const ttsSelect = document.getElementById('cfg-tts-engine');
  if (sttSelect) sttSelect.value = stt;
  if (ttsSelect) ttsSelect.value = tts;
};

window.appendChatMessageUI = function(role, text, attachmentMeta = null) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const isUser = role === 'user';
  const wrapper = document.createElement('div');
  wrapper.className = `flex w-full my-2 ${isUser ? 'justify-start' : 'justify-end'}`;

  const attachmentHtml = attachmentMeta && attachmentMeta.hasAttachment
    ? `<div class="mb-2 p-2 rounded-lg bg-black/30 border border-sky-400/30 text-xs flex items-center gap-2">
         <span>📎 مرفق:</span>
         <span class="font-bold text-amber-300 truncate">${escapeHtml(attachmentMeta.fileName)}</span>
       </div>`
    : '';

  const encodedForSpeech = encodeURIComponent(String(text || ''));

  wrapper.innerHTML = `
    <div class="max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 shadow-lg break-words leading-relaxed text-sm ${
      isUser
        ? 'bg-sky-700 text-white rounded-tr-none border border-sky-500/40'
        : 'bg-slate-800/95 text-slate-100 rounded-tl-none border border-slate-700'
    }">
      <div class="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-white/10 text-[11px] text-slate-300">
        <span class="font-extrabold">${isUser ? '👨‍⚕️ الطبيب / المستخدم' : '🤖 المساعد الذكي (DOCAI RAG)'}</span>
        ${!isUser ? `
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="window.speakText(decodeURIComponent('${encodedForSpeech}'))" class="px-2 py-0.5 rounded bg-sky-600/40 hover:bg-sky-600 text-white font-bold" title="قراءة صوتية">🔊 استماع</button>
            <button type="button" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodedForSpeech}')); window.showToast('تم نسخ الرد', 'success')" class="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white">📋 نسخ</button>
          </div>
        ` : ''}
      </div>
      ${attachmentHtml}
      <div class="chat-body-content space-y-1">${formatMarkdownSimple(text)}</div>
    </div>
  `;

  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
};

window.sendChatMessageUI = async function() {
  const inputEl = document.getElementById('chat-user-input');
  const userText = inputEl?.value?.trim() || '';
  const att = window.VoiceVisionState?.attachment || { hasAttachment: false };

  if (!userText && !att.hasAttachment) {
    window.showToast('يرجى كتابة سؤالك أو إرفاق ملف/صورة أولاً', 'warning');
    return;
  }

  const displayMsg = userText || `تحليل الملف المرفق: ${att.fileName}`;
  window.appendChatMessageUI('user', displayMsg, att);
  if (inputEl) inputEl.value = '';

  let fullPrompt = userText || 'حلل هذا المرفق الطبي/المالي بالتفصيل وقدّم الخلاصة باللغة العربية.';
  let imageBase64 = null;

  if (att.hasAttachment) {
    if (att.fileType === 'image' || att.fileType === 'pdf') {
      imageBase64 = att.base64Data;
    }
    if (att.extractedText) {
      fullPrompt += `\n\n[محتوى الملف المرفق (${att.fileName})]:\n${att.extractedText}`;
    }
    if (window.clearChatAttachment) window.clearChatAttachment();
  }

  try {
    const reply = await window.callAI(fullPrompt, imageBase64);
    window.appendChatMessageUI('ai', reply);

    if (window.AppState.settings.ai.autoSpeakReplies) {
      window.speakText(reply);
    }
  } catch (err) {
    window.appendChatMessageUI('ai', `⚠️ تعذر إكمال الطلب: ${err.message}`);
  }
};

window.clearChatHistoryUI = function() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;
  container.innerHTML = '';
  window.appendChatMessageUI('ai', 'مرحباً بك يا دكتور! تم تنظيف شاشة المحادثة. أنا متصل بقاعدة بيانات العيادة بنظام السياق الذكي (Smart RAG)، كيف يمكنني مساعدتك؟');
};

/* ==================== 10. إدارة الإعدادات الشاملة وتغيير هوية الموقع والخدمات ==================== */

window.loadSettingsToUI = function() {
  const s = window.AppState.settings;
  const id = s.identity || {};
  const app = s.appearance || {};
  const ai = s.ai || {};
  const cloud = s.cloud || {};
  const feat = s.features || {};

  const setVal = (elId, val) => {
    const el = document.getElementById(elId);
    if (el && val !== undefined) el.value = val;
  };
  const setCheck = (elId, val) => {
    const el = document.getElementById(elId);
    if (el) el.checked = Boolean(val);
  };

  setVal('cfg-sys-title', id.systemTitleAr);
  setVal('cfg-sys-badge', id.systemBadgeAr);
  setVal('cfg-doc-ar', id.doctorAr);
  setVal('cfg-spec-ar', id.specialtyAr);
  setVal('cfg-clinic-en', id.clinicEn);
  setVal('cfg-doc-en', id.doctorEn);
  setVal('cfg-address', id.address);
  setVal('cfg-phones', id.phones);
  setVal('cfg-currency', id.defaultCurrency);

  setVal('cfg-theme-select', app.theme || 'navy');
  setVal('cfg-color-primary', app.customPrimaryColor || '#0B2545');
  setVal('cfg-color-secondary', app.customSecondaryColor || '#1d6fa5');
  setVal('cfg-color-accent', app.customAccentColor || '#00A8E8');
  setVal('cfg-logo-url', app.customLogoDataUrl || '');
  setVal('cfg-watermark-opacity', app.watermarkOpacity ?? 6);

  setVal('cfg-gemini-key', ai.geminiKey || '');
  setVal('cfg-groq-key', ai.groqKey || '');
  setVal('cfg-openrouter-key', ai.openrouterKey || '');
  setVal('cfg-stt-engine', ai.sttEngine || 'ai_cloud');
  setVal('cfg-tts-engine', ai.ttsEngine || 'ai_cloud');
  setCheck('cfg-auto-speak', ai.autoSpeakReplies !== false);

  setVal('cfg-cloud-key', cloud.apiKey || '');
  setVal('cfg-cloud-bin', cloud.binId || '');

  setCheck('cfg-feat-aibar', feat.showAiBar !== false);
  setCheck('cfg-feat-autoprice', feat.autoPrice !== false);
  setCheck('cfg-feat-qrcode', feat.showQrCode !== false);
  setCheck('cfg-feat-debtalert', feat.debtAlert !== false);
  setCheck('cfg-feat-autoinv', feat.autoInventory !== false);

  window.renderSettingsServicesList();
  window.applyIdentityAndThemeToDOM();
};

window.saveAllSettingsFromUI = function() {
  const s = window.AppState.settings;
  const getVal = (elId, fallback = '') => document.getElementById(elId)?.value?.trim() ?? fallback;
  const getCheck = (elId) => Boolean(document.getElementById(elId)?.checked);

  s.identity = {
    systemTitleAr: getVal('cfg-sys-title', s.identity.systemTitleAr),
    systemBadgeAr: getVal('cfg-sys-badge', s.identity.systemBadgeAr),
    doctorAr: getVal('cfg-doc-ar', s.identity.doctorAr),
    specialtyAr: getVal('cfg-spec-ar', s.identity.specialtyAr),
    clinicEn: getVal('cfg-clinic-en', s.identity.clinicEn),
    doctorEn: getVal('cfg-doc-en', s.identity.doctorEn),
    address: getVal('cfg-address', s.identity.address),
    phones: getVal('cfg-phones', s.identity.phones),
    defaultCurrency: getVal('cfg-currency', s.identity.defaultCurrency || 'ريال يمني')
  };

  s.appearance = {
    ...s.appearance,
    theme: getVal('cfg-theme-select', 'navy'),
    customPrimaryColor: getVal('cfg-color-primary', '#0B2545'),
    customSecondaryColor: getVal('cfg-color-secondary', '#1d6fa5'),
    customAccentColor: getVal('cfg-color-accent', '#00A8E8'),
    customLogoDataUrl: getVal('cfg-logo-url', s.appearance.customLogoDataUrl),
    watermarkOpacity: Number(getVal('cfg-watermark-opacity', 6)) || 6
  };

  s.ai = {
    ...s.ai,
    geminiKey: getVal('cfg-gemini-key', ''),
    groqKey: getVal('cfg-groq-key', ''),
    openrouterKey: getVal('cfg-openrouter-key', ''),
    sttEngine: getVal('cfg-stt-engine', 'ai_cloud'),
    ttsEngine: getVal('cfg-tts-engine', 'ai_cloud'),
    autoSpeakReplies: getCheck('cfg-auto-speak')
  };

  s.cloud = {
    apiKey: getVal('cfg-cloud-key', ''),
    binId: getVal('cfg-cloud-bin', '')
  };

  s.features = {
    showAiBar: getCheck('cfg-feat-aibar'),
    autoPrice: getCheck('cfg-feat-autoprice'),
    showQrCode: getCheck('cfg-feat-qrcode'),
    debtAlert: getCheck('cfg-feat-debtalert'),
    autoInventory: getCheck('cfg-feat-autoinv')
  };

  // قراءة قائمة الخدمات العلاجية من جدول الإعدادات
  const serviceRows = document.querySelectorAll('.settings-service-row');
  if (serviceRows.length > 0) {
    const updatedServices = [];
    serviceRows.forEach((row, idx) => {
      const name = row.querySelector('.srv-name-input')?.value?.trim();
      const price = Number(row.querySelector('.srv-price-input')?.value) || 0;
      const kwRaw = row.querySelector('.srv-kw-input')?.value || '';
      if (name) {
        updatedServices.push({
          id: 'srv_' + idx + '_' + Date.now(),
          name,
          price,
          keywords: kwRaw.split(',').map(k => k.trim()).filter(Boolean)
        });
      }
    });
    if (updatedServices.length > 0) s.services = updatedServices;
  }

  window.saveSettingsState();
  window.applyIdentityAndThemeToDOM();
  window.renderServiceChips();
  window.showToast('✅ تم حفظ وتطبيق الهوية والإعدادات بالكامل!', 'success');
};

window.handleLogoUpload = function(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    window.AppState.settings.appearance.customLogoDataUrl = dataUrl;
    const urlInput = document.getElementById('cfg-logo-url');
    if (urlInput) urlInput.value = dataUrl;
    window.saveSettingsState();
    window.applyIdentityAndThemeToDOM();
    window.showToast('تم رفع وتحديث شعار العيادة والعلامة المائية بنجاح!', 'success');
  };
  reader.readAsDataURL(file);
};

window.renderSettingsServicesList = function() {
  const container = document.getElementById('settings-services-list');
  if (!container) return;
  const services = window.AppState.settings.services || [];

  container.innerHTML = services.map((srv, idx) => `
    <div class="settings-service-row grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-900/70 p-2.5 rounded-xl border border-slate-700">
      <div class="sm:col-span-4">
        <input type="text" class="srv-name-input w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white font-bold" value="${escapeHtml(srv.name)}" placeholder="اسم الخدمة العلاجية" />
      </div>
      <div class="sm:col-span-3">
        <input type="number" class="srv-price-input w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-bold" value="${Number(srv.price) || 0}" placeholder="السعر الافتراضي" />
      </div>
      <div class="sm:col-span-4">
        <input type="text" class="srv-kw-input w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-300" value="${escapeHtml((srv.keywords || []).join(', '))}" placeholder="كلمات مفتاحية مفصولة بفاصلة" />
      </div>
      <div class="sm:col-span-1 flex justify-end">
        <button type="button" onclick="window.removeServiceRow(${idx})" class="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold">✕</button>
      </div>
    </div>
  `).join('');
};

window.addNewServiceRow = function() {
  window.AppState.settings.services.push({
    id: 'srv_' + Date.now(),
    name: 'خدمة علاجية جديدة',
    price: 5000,
    keywords: ['خدمة']
  });
  window.renderSettingsServicesList();
};

window.removeServiceRow = function(index) {
  const services = window.AppState?.settings?.services;
  if (!Array.isArray(services) || index < 0 || index >= services.length) return;
  const service = services[index];
  const label = String(service?.name || 'هذه الخدمة');
  if (!window.confirm(`هل تريد حذف "${label}" من قائمة الخدمات؟ لن تُحذف السندات السابقة.`)) return;
  services.splice(index, 1);
  window.renderSettingsServicesList();
  if (window.showToast) window.showToast('تمت إزالة الخدمة من القائمة. اضغط حفظ الإعدادات لتثبيت التغيير.', 'info');
};

/* ==================== 11. التهيئة الشاملة للواجهة عند بدء التشغيل ==================== */

window.initAppUI = function() {
  window.populateInventoryUnitsSelect();
  window.loadSettingsToUI();
  window.resetReceiptForm();
  window.renderRecordsTable();
  window.renderInventoryTable();
  window.renderFinanceAndExpenses();
  window.updateModelSelectDropdown();
  window.updateVoiceBadgesUI();

  const chatContainer = document.getElementById('chat-messages-container');
  if (chatContainer && chatContainer.children.length === 0) {
    window.clearChatHistoryUI();
  }

  // Refresh the live model list on startup when credentials already exist.
  const ai = window.AppState?.settings?.ai || {};
  if (ai.geminiKey || ai.groqKey || ai.openrouterKey) {
    window.setTimeout(() => window.testAndDiscoverAllModels?.().catch(err => console.warn('Startup model discovery failed', err)), 900);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.initAppUI();
});
