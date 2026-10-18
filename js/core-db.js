
/* ==========================================================================
   DOCAI GEMINI ERP - MODULE 1: CORE DATABASE, DETAILED INVENTORY & SMART RAG
   File: js/core-db.js
   ========================================================================== */

window.DEFAULT_CLINIC_LOGO_DATA_URI = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22128%22%20height%3D%22128%22%20viewBox%3D%220%200%20128%20128%22%3E%3Crect%20width%3D%22128%22%20height%3D%22128%22%20rx%3D%2224%22%20fill%3D%22%230B2545%22%2F%3E%3Cpath%20d%3D%22M64%2022v84M22%2064h84%22%20stroke%3D%22%23fff%22%20stroke-width%3D%2217%22%20stroke-linecap%3D%22round%22%2F%3E%3Cpath%20d%3D%22M64%2036v56M36%2064h56%22%20stroke%3D%22%2300A8E8%22%20stroke-width%3D%227%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E';

const STORAGE_KEYS = {
  SETTINGS: 'docai_gemini_settings_v3',
  RECEIPTS: 'docai_gemini_receipts_v3',
  INVENTORY: 'docai_gemini_inventory_v3',
  EXPENSES: 'docai_gemini_expenses_v3',
  VERIFIED_MODELS: 'docai_gemini_verified_models_v3'
};

// قائمة وحدات القياس المعتمدة للمخزون الطبي
window.INVENTORY_UNITS = [
  { value: 'عدد', label: 'عدد / حبة (Piece)' },
  { value: 'علبة', label: 'علبة (Box)' },
  { value: 'أمبولة', label: 'أمبولة (Ampoule)' },
  { value: 'جرام', label: 'وزن بالجرام (g)' },
  { value: 'كيلوجرام', label: 'وزن بالكيلوجرام (kg)' },
  { value: 'مل', label: 'حجم بالمليلتر (ml)' },
  { value: 'طقم', label: 'طقم متكامل (Kit)' },
  { value: 'عبوة', label: 'عبوة / أنبوب (Tube)' }
];

const DEFAULT_SETTINGS = {
  identity: {
    systemTitleAr: 'نظام عيادة د. صلاح الدين السعيدي',
    systemBadgeAr: 'طب وجراحة الفم والأسنان',
    doctorAr: 'د. صلاح الدين السعيدي',
    specialtyAr: 'طب وجراحة الفم والأسنان',
    clinicEn: 'ALSSAEDY CLINIC FOR DENTISTRY',
    doctorEn: 'Dr. Salahaldeen Alssaedy',
    address: 'ريمة - كسمة - عزلة الضبارة',
    phones: '+967 716 339 366 | +967 739 550 138 | +967 775 956 520',
    defaultCurrency: 'ريال يمني'
  },
  appearance: {
    theme: 'navy',
    customPrimaryColor: '#0B2545',
    customSecondaryColor: '#1d6fa5',
    customAccentColor: '#00A8E8',
    customLogoDataUrl: window.DEFAULT_CLINIC_LOGO_DATA_URI,
    watermarkOpacity: 6,
    permanentAccountantSig: ''
  },
  ai: {
    selectedMode: 'auto',
    geminiKey: '',
    groqKey: '',
    openrouterKey: '',
    sttEngine: 'ai_cloud', // 'phone_native' أو 'ai_cloud'
    ttsEngine: 'ai_cloud', // 'phone_native' أو 'ai_cloud'
    autoSpeakReplies: true
  },
  cloud: {
    apiKey: '',
    binId: ''
  },
  features: {
    showAiBar: true,
    autoPrice: true,
    showQrCode: true,
    debtAlert: true,
    autoInventory: true
  },
  services: [
    { id: 'srv_exam', name: 'كشف ومعاينة', price: 2000, keywords: ['كشف', 'معاينة', 'فحص'] },
    { id: 'srv_fill', name: 'حشوات وتجميل', price: 8000, keywords: ['حشو', 'حشوة', 'حشوات', 'تجميل'] },
    { id: 'srv_endo', name: 'علاج عصب وجذور', price: 15000, keywords: ['عصب', 'جذور', 'سحب عصب'] },
    { id: 'srv_extr', name: 'خلع وجراحة', price: 5000, keywords: ['خلع', 'قلع', 'جراحة'] },
    { id: 'srv_scal', name: 'تنظيف وتجليح لثة', price: 10000, keywords: ['تنظيف', 'تجليح', 'لثة'] },
    { id: 'srv_pros', name: 'تركيبات أسنان', price: 35000, keywords: ['تركيب', 'تركيبات', 'تلبيس', 'زيركون', 'بورسلين'] },
    { id: 'srv_orth', name: 'تقويم أسنان', price: 150000, keywords: ['تقويم', 'شد تقويم'] },
    { id: 'srv_xray', name: 'أشعة تشخيصية', price: 3000, keywords: ['أشعة', 'اشعة', 'بانوراما'] }
  ]
};

const DEFAULT_INVENTORY = [
  {
    id: 'inv_1',
    name: 'أمبولات بنج أسنان (Lidocaine)',
    qty: 50,
    unit: 'أمبولة',
    minQty: 15,
    unitPrice: 300,
    totalCost: 15000,
    linkedService: 'خلع وجراحة',
    notes: 'بنج موضعي مع أدرينالين',
    updatedAt: new Date().toISOString().slice(0, 10)
  },
  {
    id: 'inv_2',
    name: 'حشوات ضوئية كومبوزيت (3M)',
    qty: 40,
    unit: 'جرام',
    minQty: 10,
    unitPrice: 1200,
    totalCost: 48000,
    linkedService: 'حشوات وتجميل',
    notes: 'حشوة تجميلية درجات A1/A2',
    updatedAt: new Date().toISOString().slice(0, 10)
  },
  {
    id: 'inv_3',
    name: 'مبارد وأقماع عصب (Protaper)',
    qty: 15,
    unit: 'طقم',
    minQty: 5,
    unitPrice: 3500,
    totalCost: 52500,
    linkedService: 'علاج عصب وجذور',
    notes: 'أطقم سحب عصب كاملة',
    updatedAt: new Date().toISOString().slice(0, 10)
  },
  {
    id: 'inv_4',
    name: 'قفازات وكمامات طبية معقمة',
    qty: 100,
    unit: 'عدد',
    minQty: 25,
    unitPrice: 100,
    totalCost: 10000,
    linkedService: 'كشف ومعاينة',
    notes: 'استهلاك يومي لكل مريض',
    updatedAt: new Date().toISOString().slice(0, 10)
  }
];

function safeLoadStorage(key, fallbackKeyOld, defaultVal) {
  try {
    let raw = localStorage.getItem(key);
    if (!raw && fallbackKeyOld) raw = localStorage.getItem(fallbackKeyOld);
    if (!raw) return JSON.parse(JSON.stringify(defaultVal));
    const parsed = JSON.parse(raw);
    if (key === STORAGE_KEYS.SETTINGS) {
      return {
        ...defaultVal,
        ...parsed,
        identity: { ...defaultVal.identity, ...(parsed.clinic || {}), ...(parsed.identity || {}) },
        appearance: { ...defaultVal.appearance, ...(parsed.appearance || {}) },
        ai: { ...defaultVal.ai, ...(parsed.ai || {}) },
        cloud: { ...defaultVal.cloud, ...(parsed.cloud || {}) },
        features: { ...defaultVal.features, ...(parsed.features || {}) },
        services: Array.isArray(parsed.services) && parsed.services.length ? parsed.services : defaultVal.services
      };
    }
    return parsed;
  } catch (e) {
    return JSON.parse(JSON.stringify(defaultVal));
  }
}

window.AppState = {
  settings: safeLoadStorage(STORAGE_KEYS.SETTINGS, 'alssaedy_erp_s_v2', DEFAULT_SETTINGS),
  receipts: safeLoadStorage(STORAGE_KEYS.RECEIPTS, 'alssaedy_erp_r_v2', []),
  inventory: safeLoadStorage(STORAGE_KEYS.INVENTORY, 'alssaedy_erp_i_v2', DEFAULT_INVENTORY),
  expenses: safeLoadStorage(STORAGE_KEYS.EXPENSES, 'alssaedy_erp_e_v2', []),
  verifiedModels: safeLoadStorage(STORAGE_KEYS.VERIFIED_MODELS, null, []),
  selectedServices: new Set(),
  selectedServiceIds: new Set(),
  currentPreviousDebt: 0,
  editingReceiptId: null,
  editingInventoryId: null,
  currentReceiverSig: '',
  currentAccountantSig: ''
};

function docaiSettingsWithoutSecrets(settings) {
  const safe = JSON.parse(JSON.stringify(settings || {}));
  if (safe.ai) {
    safe.ai.geminiKey = '';
    safe.ai.groqKey = '';
    safe.ai.openrouterKey = '';
  }
  if (safe.cloud) safe.cloud.apiKey = '';
  return safe;
}
// Provider and cloud API keys remain in memory/form fields for this session only.
window.saveSettingsState = () => localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(docaiSettingsWithoutSecrets(window.AppState.settings)));
window.saveReceiptsState = () => localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(window.AppState.receipts));
window.saveInventoryState = () => localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(window.AppState.inventory));
window.saveExpensesState = () => localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(window.AppState.expenses));
window.saveVerifiedModelsState = () => localStorage.setItem(STORAGE_KEYS.VERIFIED_MODELS, JSON.stringify(window.AppState.verifiedModels));

/* ==================== محرك التفقيط العربي ==================== */
function convertUnderThousand(n) {
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const p = [];
  const h = Math.floor(n / 100);
  const rem = n % 100;
  if (h > 0) p.push(hundreds[h]);
  if (rem > 0) {
    if (rem < 20) p.push(ones[rem]);
    else {
      const u = rem % 10;
      const t = Math.floor(rem / 10);
      p.push(u > 0 ? `${ones[u]} و${tens[t]}` : tens[t]);
    }
  }
  return p.join(' و');
}

window.numberToArabicWords = function(amount, currency) {
  const curr = currency || window.AppState.settings.identity.defaultCurrency || 'ريال يمني';
  const num = Math.floor(Math.abs(Number(amount) || 0));
  if (num === 0) return `صفر ${curr} لا غير`;
  const mil = Math.floor(num / 1000000);
  const tho = Math.floor((num % 1000000) / 1000);
  const rem = num % 1000;
  const segs = [];
  if (mil > 0) segs.push(mil === 1 ? 'مليون' : mil === 2 ? 'مليونان' : mil >= 3 && mil <= 10 ? `${convertUnderThousand(mil)} ملايين` : `${convertUnderThousand(mil)} مليونًا`);
  if (tho > 0) segs.push(tho === 1 ? 'ألف' : tho === 2 ? 'ألفان' : tho >= 3 && tho <= 10 ? `${convertUnderThousand(tho)} آلاف` : `${convertUnderThousand(tho)} ألفًا`);
  if (rem > 0) segs.push(convertUnderThousand(rem));
  return `فقط ${segs.join(' و')} ${curr} لا غير`;
};

/* ==================== محرك قاعدة بيانات العيادة (ClinicDB) ==================== */
window.ClinicDB = {
  getNextReceiptNumber() {
    const list = window.AppState.receipts || [];
    if (list.length === 0) return '1001';
    let maxNo = 1000;
    list.forEach(i => {
      const n = parseInt(String(i.receiptNo).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > maxNo) maxNo = n;
    });
    return String(maxNo + 1);
  },

  saveReceipt(data) {
    const list = window.AppState.receipts;
    const idx = list.findIndex(r => r.id === data.id || String(r.receiptNo) === String(data.receiptNo));
    const cleanData = {
      ...data,
      totalAmount: Number(data.totalAmount) || 0,
      paidAmount: Number(data.paidAmount) || 0,
      remainingAmount: Math.max(0, (Number(data.totalAmount) || 0) - (Number(data.paidAmount) || 0)),
      updatedAt: new Date().toISOString()
    };
    if (!cleanData.amountWords) {
      cleanData.amountWords = window.numberToArabicWords(cleanData.paidAmount, cleanData.currency);
    }

    if (idx > -1) {
      // Keep the original services before updating the receipt. Only newly
      // added services should consume inventory during an edit.
      const previousServices = Array.isArray(list[idx].services) ? list[idx].services : [];
      const nextServices = Array.isArray(cleanData.services) ? cleanData.services : [];
      const newlyAddedServices = nextServices.filter(service => !previousServices.includes(service));

      list[idx] = { ...list[idx], ...cleanData };

      if (
        window.AppState.settings.features.autoInventory &&
        newlyAddedServices.length > 0
      ) {
        this.deductInventoryForServices(newlyAddedServices);
      }
    } else {
      cleanData.id = cleanData.id || ('REC_' + Date.now());
      cleanData.createdAt = new Date().toISOString();
      list.unshift(cleanData);
      if (window.AppState.settings.features.autoInventory && Array.isArray(cleanData.services)) {
        this.deductInventoryForServices(cleanData.services);
      }
    }
    window.saveReceiptsState();
    return cleanData;
  },

  deleteReceipt(id) {
    window.AppState.receipts = window.AppState.receipts.filter(r => r.id !== id);
    window.saveReceiptsState();
  },

  settleReceiptDebt(id, addPaid) {
    const list = window.AppState.receipts;
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const rec = list[idx];
    const newPaid = (Number(rec.paidAmount) || 0) + (Number(addPaid) || 0);
    const newRem = Math.max(0, (Number(rec.totalAmount) || 0) - newPaid);
    list[idx] = {
      ...rec,
      paidAmount: newPaid,
      remainingAmount: newRem,
      amountWords: window.numberToArabicWords(newPaid, rec.currency || 'ريال يمني'),
      updatedAt: new Date().toISOString()
    };
    window.saveReceiptsState();
    return list[idx];
  },

  getPatientDebtSummary(name, phone) {
    const cN = (name || '').trim();
    const cP = (phone || '').replace(/\D/g, '');
    if (!cN && !cP) return { totalDebt: 0, records: [] };
    const matches = window.AppState.receipts.filter(r => {
      if ((Number(r.remainingAmount) || 0) <= 0) return false;
      const nameMatch = cN && r.patientName?.trim() === cN;
      const phoneMatch = cP && cP.length >= 7 && r.patientPhone?.replace(/\D/g, '').endsWith(cP.slice(-7));
      return nameMatch || phoneMatch;
    });
    return {
      totalDebt: matches.reduce((s, r) => s + (Number(r.remainingAmount) || 0), 0),
      records: matches
    };
  },

  getUniquePatients() {
    const m = new Map();
    window.AppState.receipts.forEach(r => {
      if (r.patientName && !m.has(r.patientName.trim())) {
        m.set(r.patientName.trim(), r.patientPhone || '');
      }
    });
    return Array.from(m.entries()).map(([name, phone]) => ({ name, phone }));
  },

  saveInventoryItem(payload) {
    const list = window.AppState.inventory;
    const qty = Number(payload.qty) || 0;
    const unitPrice = Number(payload.unitPrice) || 0;
    const totalCost = payload.totalCost !== undefined && payload.totalCost !== ''
      ? Number(payload.totalCost)
      : +(qty * unitPrice).toFixed(2);

    const itemData = {
      id: payload.id || ('inv_' + Date.now()),
      name: (payload.name || 'مادة طبية').trim(),
      qty: qty,
      unit: payload.unit || 'عدد',
      minQty: Number(payload.minQty) || 3,
      unitPrice: unitPrice,
      totalCost: totalCost,
      linkedService: payload.linkedService || '',
      notes: (payload.notes || '').trim(),
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    const existingIdx = list.findIndex(i => i.id === itemData.id);
    if (existingIdx > -1) {
      list[existingIdx] = itemData;
    } else {
      list.unshift(itemData);
      if (payload.recordAsExpense && totalCost > 0) {
        this.addExpense(`شراء مخزون: ${itemData.name} (${qty} ${itemData.unit})`, totalCost, 'مشتريات مخزون');
      }
    }
    window.saveInventoryState();
    return itemData;
  },

  consumeInventoryItem(id, amount = 1) {
    const item = window.AppState.inventory.find(i => i.id === id);
    if (!item) return null;
    const deduct = Math.abs(Number(amount) || 1);
    item.qty = Math.max(0, +(Number(item.qty) - deduct).toFixed(2));
    item.totalCost = +(item.qty * (Number(item.unitPrice) || 0)).toFixed(2);
    item.updatedAt = new Date().toISOString().slice(0, 10);
    window.saveInventoryState();
    return item;
  },

  restockInventoryItem(id, addAmount = 1, newUnitPrice = null, recordExpense = false) {
    const item = window.AppState.inventory.find(i => i.id === id);
    if (!item) return null;
    const added = Math.abs(Number(addAmount) || 1);
    if (newUnitPrice !== null && !isNaN(newUnitPrice) && Number(newUnitPrice) >= 0) {
      item.unitPrice = Number(newUnitPrice);
    }
    item.qty = +(Number(item.qty) + added).toFixed(2);
    item.totalCost = +(item.qty * (Number(item.unitPrice) || 0)).toFixed(2);
    item.updatedAt = new Date().toISOString().slice(0, 10);
    window.saveInventoryState();

    if (recordExpense && item.unitPrice > 0) {
      const costAdded = +(added * item.unitPrice).toFixed(2);
      this.addExpense(`تزويد مخزون: ${item.name} (+${added} ${item.unit})`, costAdded, 'مشتريات مخزون');
    }
    return item;
  },

  deductInventoryForServices(servicesList) {
    window.AppState.inventory.forEach(i => {
      if (servicesList.includes(i.linkedService) || i.linkedService === 'كشف ومعاينة') {
        if (i.qty > 0) {
          i.qty = Math.max(0, +(Number(i.qty) - 1).toFixed(2));
          i.totalCost = +(i.qty * (Number(i.unitPrice) || 0)).toFixed(2);
        }
      }
    });
    window.saveInventoryState();
  },

  deleteInventoryItem(id) {
    window.AppState.inventory = window.AppState.inventory.filter(i => i.id !== id);
    window.saveInventoryState();
  },

  addExpense(title, amount, category = 'عام') {
    const exp = {
      id: 'exp_' + Date.now(),
      title: (title || 'مصروف عيادة').trim(),
      amount: Number(amount) || 0,
      category: category,
      date: new Date().toISOString().slice(0, 10)
    };
    window.AppState.expenses.unshift(exp);
    window.saveExpensesState();
    return exp;
  },

  deleteExpense(id) {
    window.AppState.expenses = window.AppState.expenses.filter(e => e.id !== id);
    window.saveExpensesState();
  },

  getFinancialOverview() {
    const receipts = window.AppState.receipts || [];
    const inventory = window.AppState.inventory || [];
    const expenses = window.AppState.expenses || [];

    const totalBilled = receipts.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    const totalCollected = receipts.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);
    const totalDebts = receipts.reduce((s, r) => s + (Number(r.remainingAmount) || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalInventoryValue = inventory.reduce((s, i) => s + ((Number(i.qty) || 0) * (Number(i.unitPrice) || 0)), 0);
    const lowStockItems = inventory.filter(i => Number(i.qty) <= Number(i.minQty));

    return {
      totalReceiptsCount: receipts.length,
      totalBilledAmount: totalBilled,
      totalCollectedRevenue: totalCollected,
      totalPendingDebts: totalDebts,
      debtorsCount: receipts.filter(r => (Number(r.remainingAmount) || 0) > 0).length,
      totalExpenses: totalExpenses,
      netCashProfit: totalCollected - totalExpenses,
      totalInventoryItems: inventory.length,
      totalInventoryValue: totalInventoryValue,
      lowStockCount: lowStockItems.length,
      lowStockNames: lowStockItems.map(i => `${i.name} (${i.qty} ${i.unit || 'عدد'})`)
    };
  },

  getSmartContextForQuery(userQuery = '') {
    const q = (userQuery || '').toLowerCase();
    const overview = this.getFinancialOverview();
    const receipts = window.AppState.receipts || [];
    const inventory = window.AppState.inventory || [];
    const expenses = window.AppState.expenses || [];

    const contextPacket = {
      clinicIdentity: {
        name: window.AppState.settings.identity.systemTitleAr,
        doctor: window.AppState.settings.identity.doctorAr,
        currency: window.AppState.settings.identity.defaultCurrency
      },
      overallSummary: overview
    };

    const asksInventory = /مخزون|مواد|مادة|نقص|ناقص|بنج|حشو|عصب|قفاز|كمية|وحدة|وزن|جرام|سعر|شراء|استهلاك|اصناف|أصناف/.test(q);
    const asksExpenses = /مصروف|مصاريف|نفقات|تكلفة|تكاليف|ربح|أرباح|صافي|خسارة|مالي/.test(q);
    const asksDebts = /دين|ديون|متبقي|ذمم|مديون|تأخير|سداد|لم يدفع/.test(q);
    const asksServices = /خدمة|خدمات|أسعار|اسعار|قائمة|علاج|خلع|تقويم|تركيب|تنظيف/.test(q);
    const asksAllOrReceipts = /سند|سندات|مريض|مرضى|تقرير|راجع|جميع|كل|اليوم|شهر|إيراد|ايراد|قبض/.test(q);

    const matchedPatientReceipts = receipts.filter(r => {
      const pName = (r.patientName || '').toLowerCase();
      const pPhone = String(r.patientPhone || '');
      const rNo = String(r.receiptNo || '');
      const words = q.split(/\s+/).filter(w => w.length >= 3);
      return (rNo && q.includes(rNo)) ||
             (pPhone && pPhone.length >= 5 && q.includes(pPhone)) ||
             words.some(w => pName.includes(w));
    });

    if (matchedPatientReceipts.length > 0) {
      contextPacket.specificMatchedPatients = matchedPatientReceipts;
    }

    if (asksDebts) {
      contextPacket.pendingDebtsList = receipts
        .filter(r => (Number(r.remainingAmount) || 0) > 0 && (!matchedPatientReceipts.length || matchedPatientReceipts.includes(r)))
        .map(r => ({
          receiptNo: r.receiptNo,
          date: r.date,
          patientName: r.patientName,
          phone: r.patientPhone,
          total: r.totalAmount,
          paid: r.paidAmount,
          remainingDebt: r.remainingAmount,
          services: r.services
        }));
    }

    if (asksInventory) {
      contextPacket.inventoryDetails = inventory.map(i => ({
        name: i.name,
        qty: i.qty,
        unit: i.unit || 'عدد',
        minQty: i.minQty,
        unitPrice: i.unitPrice || 0,
        totalValue: (Number(i.qty) || 0) * (Number(i.unitPrice) || 0),
        status: Number(i.qty) <= Number(i.minQty) ? 'نقص حرج' : 'متوفر',
        linkedService: i.linkedService
      }));
    }

    if (asksExpenses) {
      contextPacket.expensesList = expenses.slice(0, 60);
    }

    if (asksServices) {
      contextPacket.clinicServicesCatalog = window.AppState.settings.services;
    }

    // لا تُرفق سجلات العيادة في الأسئلة العامة؛ هذا يقلل حجم الطلب وزمن الاستجابة.
    if (asksAllOrReceipts && /سندات|تقرير|راجع|جميع|كل|اليوم|شهر|إيراد|ايراد|قبض/.test(q)) {
      contextPacket.recentReceiptsCompact = receipts.slice(0, 80).map(r => ({
        no: r.receiptNo,
        date: r.date,
        patient: r.patientName,
        phone: r.patientPhone,
        srv: (r.services || []).join('+'),
        total: r.totalAmount,
        paid: r.paidAmount,
        rem: r.remainingAmount
      }));
      if (!contextPacket.inventoryDetails) {
        contextPacket.inventoryCompact = inventory.map(i => `${i.name}: ${i.qty} ${i.unit || 'عدد'} (سعر الوحدة: ${i.unitPrice || 0})`);
      }
      if (!contextPacket.expensesList && expenses.length > 0) {
        contextPacket.recentExpensesCompact = expenses.slice(0, 30).map(e => `${e.title}: ${e.amount} (${e.date})`);
      }
    }

    return contextPacket;
  },

  buildClinicFullContext() {
    return {
      stats: this.getFinancialOverview(),
      receipts: window.AppState.receipts,
      inventory: window.AppState.inventory,
      expenses: window.AppState.expenses,
      services: window.AppState.settings.services
    };
  }
};

/* ==================== التصدير والاستيراد والمزامنة ==================== */
window.exportLocalBackupJSON = function() {
  const backup = {
    app: 'DOCAI_GEMINI_CLINIC_ERP',
    version: '3.0',
    exportedAt: new Date().toISOString(),
    settings: docaiSettingsWithoutSecrets(window.AppState.settings),
    receipts: window.AppState.receipts,
    inventory: window.AppState.inventory,
    expenses: window.AppState.expenses
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DOCAI_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (window.showToast) window.showToast('تم تصدير ملف النسخة الاحتياطية (JSON) بنجاح', 'success');
};

window.importLocalBackupJSON = function(event) {
  const input = event?.target;
  const file = input?.files?.[0];
  if (!file) return;

  // Protect the browser from accidentally reading a huge or unrelated file.
  if (file.size > 25 * 1024 * 1024) {
    if (window.showToast) window.showToast('حجم النسخة الاحتياطية يتجاوز الحد المسموح (25 MB).', 'warning');
    if (input) input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => {
    if (window.showToast) window.showToast('تعذر قراءة الملف. تحقق من الملف ثم حاول مرة أخرى.', 'warning');
    if (input) input.value = '';
  };

  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
      const validBackup =
        isObject(data) &&
        data.app === 'DOCAI_GEMINI_CLINIC_ERP' &&
        isObject(data.settings) &&
        Array.isArray(data.receipts) &&
        Array.isArray(data.inventory) &&
        Array.isArray(data.expenses);

      if (!validBackup) {
        throw new Error('INVALID_BACKUP_FORMAT');
      }

      // Import replaces local clinic records. Never do that without explicit consent.
      const accepted = window.confirm(
        'تنبيه: استيراد هذه النسخة سيستبدل الإعدادات والسندات والمخزون والمصروفات الحالية على هذا الجهاز.\n\n' +
        'تأكد من تنزيل نسخة احتياطية حديثة قبل المتابعة. هل تريد الاستمرار؟'
      );
      if (!accepted) {
        if (window.showToast) window.showToast('تم إلغاء الاستيراد؛ لم يتم تغيير البيانات.', 'info');
        return;
      }

      window.AppState.settings = { ...DEFAULT_SETTINGS, ...data.settings };
      if (window.AppState.settings.ai) {
        window.AppState.settings.ai.geminiKey = '';
        window.AppState.settings.ai.groqKey = '';
        window.AppState.settings.ai.openrouterKey = '';
      }
      if (window.AppState.settings.cloud) window.AppState.settings.cloud.apiKey = '';
      window.AppState.settings = { ...window.AppState.settings, cloud: { ...DEFAULT_SETTINGS.cloud, ...(window.AppState.settings.cloud || {}), apiKey: '' } };
      window.AppState.receipts = data.receipts;
      window.AppState.inventory = data.inventory;
      window.AppState.expenses = data.expenses;

      window.saveSettingsState();
      window.saveReceiptsState();
      window.saveInventoryState();
      window.saveExpensesState();

      if (window.loadSettingsToUI) window.loadSettingsToUI();
      if (window.initAppUI) window.initAppUI();
      if (window.showToast) window.showToast('تم استيراد النسخة الاحتياطية بنجاح.', 'success');
    } catch (err) {
      console.warn('DOCAI backup import rejected:', err);
      if (window.showToast) {
        window.showToast(
          err?.message === 'INVALID_BACKUP_FORMAT'
            ? 'الملف ليس نسخة احتياطية كاملة وصالحة من DOCAI.'
            : 'تعذر استيراد الملف؛ تأكد من سلامة ملف JSON.',
          'warning'
        );
      }
    } finally {
      if (input) input.value = '';
    }
  };

  reader.readAsText(file);
};

window.exportDataToCSV = function(type = 'receipts') {
  let csvRows = [];
  let filename = '';

  if (type === 'inventory') {
    filename = `DOCAI_Inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    csvRows.push(['اسم المادة', 'الكمية الحالية', 'وحدة القياس', 'حد التنبيه', 'سعر الوحدة', 'التكلفة الإجمالية', 'الخدمة المرتبطة', 'آخر تحديث'].join(','));
    (window.AppState.inventory || []).forEach(i => {
      csvRows.push([
        `"${(i.name || '').replace(/"/g, '""')}"`,
        i.qty || 0,
        `"${i.unit || 'عدد'}"`,
        i.minQty || 0,
        i.unitPrice || 0,
        (Number(i.qty) || 0) * (Number(i.unitPrice) || 0),
        `"${i.linkedService || ''}"`,
        i.updatedAt || ''
      ].join(','));
    });
  } else {
    filename = `DOCAI_Receipts_${new Date().toISOString().slice(0, 10)}.csv`;
    csvRows.push(['رقم السند', 'التاريخ', 'اسم المريض', 'رقم الهاتف', 'الخدمات', 'الإجمالي', 'المدفوع', 'المتبقي', 'العملة', 'طريقة الدفع'].join(','));
    (window.AppState.receipts || []).forEach(r => {
      csvRows.push([
        `"${r.receiptNo || ''}"`,
        r.date || '',
        `"${(r.patientName || '').replace(/"/g, '""')}"`,
        `"${r.patientPhone || ''}"`,
        `"${(r.services || []).join(' + ')}"`,
        r.totalAmount || 0,
        r.paidAmount || 0,
        r.remainingAmount || 0,
        `"${r.currency || ''}"`,
        `"${r.paymentMethod || ''}"`
      ].join(','));
    });
  }

  const csvString = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (window.showToast) window.showToast('تم تصدير ملف الجدول (CSV/Excel) بنجاح', 'success');
};

async function docaiBackupCryptoKey(passphrase, salt) {
  if (!window.crypto?.subtle) throw new Error('المتصفح لا يدعم التشفير الآمن؛ استخدم HTTPS أو متصفحاً حديثاً.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}
function docaiBytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function docaiBase64ToBytes(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function docaiEncryptCloudBackup(payload, passphrase) {
  if (!passphrase || passphrase.length < 8) throw new Error('اختر كلمة تشفير من 8 أحرف على الأقل للنسخة السحابية.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await docaiBackupCryptoKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    docaiEncryptedBackup: 1, format: 'DOCAI_AES_GCM_V1', kdf: 'PBKDF2-SHA-256',
    iterations: 250000, salt: docaiBytesToBase64(salt), iv: docaiBytesToBase64(iv),
    ciphertext: docaiBytesToBase64(new Uint8Array(ciphertext)), encryptedAt: new Date().toISOString()
  };
}
async function docaiDecryptCloudBackup(record, passphrase) {
  if (!passphrase) throw new Error('أدخل كلمة تشفير النسخة السحابية نفسها التي استخدمتها عند الرفع.');
  const salt = docaiBase64ToBytes(record.salt), iv = docaiBase64ToBytes(record.iv);
  const key = await docaiBackupCryptoKey(passphrase, salt);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, docaiBase64ToBytes(record.ciphertext));
  return JSON.parse(new TextDecoder().decode(plaintext));
}

window.syncDataToCloud = async function() {
  const key = document.getElementById('cfg-cloud-key')?.value?.trim() || window.AppState.settings.cloud.apiKey;
  let binId = document.getElementById('cfg-cloud-bin')?.value?.trim() || window.AppState.settings.cloud.binId;
  if (!key) {
    if (window.showToast) window.showToast('يرجى إدخال مفتاح JSONBin API Key أولاً', 'warning');
    return;
  }

  // Keep the JSONBin master key in the current form/session only; never include it in persisted settings or backups.
  if (window.AppState.settings.cloud) window.AppState.settings.cloud.apiKey = '';
  window.saveSettingsState();
  const passphrase = document.getElementById('cfg-cloud-backup-password')?.value || '';
  if (passphrase.length < 8) {
    if (window.showToast) window.showToast('أدخل كلمة تشفير للنسخة السحابية من 8 أحرف على الأقل.', 'warning');
    return;
  }
  if (window.showToast) window.showToast('جارٍ تشفير النسخة الاحتياطية ورفعها إلى السحابة...', 'info');

  const safeSettings = docaiSettingsWithoutSecrets(window.AppState.settings);
  const payload = {
    schema: 'DOCAI_CLINIC_BACKUP_V1',
    updatedAt: new Date().toISOString(),
    settings: safeSettings,
    receipts: window.AppState.receipts,
    inventory: window.AppState.inventory,
    expenses: window.AppState.expenses
  };

  try {
    const url = binId ? `https://api.jsonbin.io/v3/b/${binId}` : 'https://api.jsonbin.io/v3/b';
    const method = binId ? 'PUT' : 'POST';
    const encryptedPayload = await docaiEncryptCloudBackup(payload, passphrase);
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': key,
        'X-Bin-Name': 'DOCAI_CLINIC_ERP_ENCRYPTED'
      },
      body: JSON.stringify(encryptedPayload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'فشل الرفع السحابي');
    if (data.metadata?.id) {
      window.AppState.settings.cloud.binId = data.metadata.id;
      const binInput = document.getElementById('cfg-cloud-bin');
      if (binInput) binInput.value = data.metadata.id;
      window.saveSettingsState();
    }
    if (window.showToast) window.showToast('تم رفع البيانات إلى السحابة بنجاح!', 'success');
  } catch (e) {
    if (window.showToast) window.showToast('فشل الرفع للسحابة: ' + e.message, 'warning');
  }
};

window.syncDataFromCloud = async function() {
  const key = document.getElementById('cfg-cloud-key')?.value?.trim() || window.AppState.settings.cloud.apiKey;
  const binId = document.getElementById('cfg-cloud-bin')?.value?.trim() || window.AppState.settings.cloud.binId;
  if (!key || !binId) {
    if (window.showToast) window.showToast('يرجى إدخال مفتاح JSONBin ومعرف Bin ID للاستعادة', 'warning');
    return;
  }

  const passphrase = document.getElementById('cfg-cloud-backup-password')?.value || '';
  if (window.AppState.settings.cloud) window.AppState.settings.cloud.apiKey = '';
  window.saveSettingsState();
  if (window.showToast) window.showToast('جاري جلب النسخة السحابية المشفرة...', 'info');
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Master-Key': key }
    });
    const data = await res.json();
    if (!res.ok || !data.record) throw new Error(data.message || 'تعذر قراءة البيانات');
    let rec = data.record;
    if (rec?.docaiEncryptedBackup === 1 && rec?.format === 'DOCAI_AES_GCM_V1') {
      try { rec = await docaiDecryptCloudBackup(rec, passphrase); }
      catch (_) { throw new Error('كلمة التشفير غير صحيحة أو أن النسخة المشفرة تالفة.'); }
    } else if (window.showToast) {
      window.showToast('تنبيه: هذه نسخة قديمة غير مشفرة. بعد الاستعادة ارفع نسخة جديدة بكلمة تشفير.', 'warning');
    }
    if (!rec || !Array.isArray(rec.receipts) || !Array.isArray(rec.inventory) || !Array.isArray(rec.expenses)) {
      throw new Error('تنسيق النسخة الاحتياطية غير صالح.');
    }
    if (rec.settings) window.AppState.settings = { ...DEFAULT_SETTINGS, ...rec.settings };
    if (window.AppState.settings.cloud) window.AppState.settings.cloud.apiKey = '';
    if (Array.isArray(rec.receipts)) window.AppState.receipts = rec.receipts;
    if (Array.isArray(rec.inventory)) window.AppState.inventory = rec.inventory;
    if (Array.isArray(rec.expenses)) window.AppState.expenses = rec.expenses;

    window.saveSettingsState();
    window.saveReceiptsState();
    window.saveInventoryState();
    window.saveExpensesState();

    if (window.loadSettingsToUI) window.loadSettingsToUI();
    if (window.initAppUI) window.initAppUI();
    if (window.showToast) window.showToast('تمت استعادة البيانات من السحابة بنجاح!', 'success');
  } catch (e) {
    if (window.showToast) window.showToast('فشل الاستعادة: ' + e.message, 'warning');
  }
};
