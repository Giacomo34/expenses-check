import { createClient } from '@supabase/supabase-js';

// =============================================
// ENV VARS (injected by Vite from Vercel)
// =============================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const AI_GATEWAY_KEY = import.meta.env.VITE_VERCEL_AI_KEY || '';
const AI_GATEWAY_MODEL = import.meta.env.VITE_AI_MODEL || 'google/gemini-2.0-flash-001';

// =============================================
// CATEGORY CONFIG
// =============================================
const CATEGORIES = {
  // ---- PERSONAL EXPENSES ----
  'Food & Dining':    { icon: 'utensils',       color: 'text-brand-orange', bg: 'bg-orange-50',   chart: '#E8730F', type: 'expense', ctx: 'personal' },
  'Transport':        { icon: 'car',             color: 'text-brand-medium', bg: 'bg-slate-50',    chart: '#4a5f7f', type: 'expense', ctx: 'personal' },
  'Bills & Utilities':{ icon: 'zap',             color: 'text-brand-dark',   bg: 'bg-gray-50',     chart: '#1a2332', type: 'expense', ctx: 'personal' },
  'Shopping':         { icon: 'shopping-bag',    color: 'text-emerald-700',  bg: 'bg-green-50',    chart: '#059669', type: 'expense', ctx: 'personal' },
  'Entertainment':    { icon: 'clapperboard',    color: 'text-brand-red',    bg: 'bg-red-50',      chart: '#cc2f2f', type: 'expense', ctx: 'personal' },
  'Health':           { icon: 'heart-pulse',     color: 'text-pink-600',     bg: 'bg-pink-50',     chart: '#db2777', type: 'expense', ctx: 'personal' },
  'Travel':           { icon: 'plane',           color: 'text-blue-600',     bg: 'bg-blue-50',     chart: '#2563eb', type: 'expense', ctx: 'personal' },
  'Education':        { icon: 'book-open',       color: 'text-indigo-600',   bg: 'bg-indigo-50',   chart: '#4f46e5', type: 'expense', ctx: 'personal' },
  'Subscriptions':    { icon: 'repeat',          color: 'text-purple-600',   bg: 'bg-purple-50',   chart: '#9333ea', type: 'expense', ctx: 'personal' },
  'Other Personal':   { icon: 'package',         color: 'text-brand-medium', bg: 'bg-brand-cream', chart: '#E0E0E0', type: 'expense', ctx: 'personal' },
  
  // ---- PERSONAL INCOME ----
  'Salary':           { icon: 'banknote',        color: 'text-brand-green',  bg: 'bg-green-100',   chart: '#0d5d1a', type: 'income', ctx: 'personal' },
  'Freelance':        { icon: 'briefcase',       color: 'text-teal-600',     bg: 'bg-teal-50',     chart: '#0d9488', type: 'income', ctx: 'personal' },
  'Investments':      { icon: 'trending-up',     color: 'text-cyan-600',     bg: 'bg-cyan-50',     chart: '#0891b2', type: 'income', ctx: 'personal' },
  'Refund':           { icon: 'rotate-ccw',      color: 'text-lime-600',     bg: 'bg-lime-50',     chart: '#65a30d', type: 'income', ctx: 'personal' },
  'Other Income':     { icon: 'circle-dollar-sign', color: 'text-green-600', bg: 'bg-green-50',    chart: '#16a34a', type: 'income', ctx: 'personal' },

  // ---- BUSINESS EXPENSES (Italy On Demand) ----
  'Biz Projects Cost':{ icon: 'briefcase',       color: 'text-blue-800',     bg: 'bg-blue-100',    chart: '#1e40af', type: 'expense', ctx: 'business' },
  'Catering Cost':    { icon: 'coffee',          color: 'text-yellow-700',   bg: 'bg-yellow-100',  chart: '#a16207', type: 'expense', ctx: 'business' },
  'Photoshoot Cost':  { icon: 'camera',          color: 'text-brand-orange', bg: 'bg-orange-100',  chart: '#ea580c', type: 'expense', ctx: 'business' },
  'App Dev & Server': { icon: 'terminal',        color: 'text-slate-700',    bg: 'bg-slate-200',   chart: '#334155', type: 'expense', ctx: 'business' },
  'Event Setup':      { icon: 'party-popper',    color: 'text-pink-700',     bg: 'bg-pink-100',    chart: '#be185d', type: 'expense', ctx: 'business' },
  'Design Assets':    { icon: 'pen-tool',        color: 'text-purple-700',   bg: 'bg-purple-100',  chart: '#7e22ce', type: 'expense', ctx: 'business' },
  'Marketing':        { icon: 'megaphone',       color: 'text-brand-red',    bg: 'bg-red-100',     chart: '#b91c1c', type: 'expense', ctx: 'business' },
  'Biz Travel':       { icon: 'plane-takeoff',   color: 'text-cyan-700',     bg: 'bg-cyan-100',    chart: '#0e7490', type: 'expense', ctx: 'business' },
  'Other Biz Cost':   { icon: 'box',             color: 'text-brand-medium', bg: 'bg-gray-200',    chart: '#9ca3af', type: 'expense', ctx: 'business' },

  // ---- BUSINESS INCOME (Italy On Demand) ----
  'Biz Projects Rev': { icon: 'folder-check',    color: 'text-blue-600',     bg: 'bg-blue-50',     chart: '#2563eb', type: 'income', ctx: 'business' },
  'Catering Rev':     { icon: 'pie-chart',       color: 'text-yellow-600',   bg: 'bg-yellow-50',   chart: '#ca8a04', type: 'income', ctx: 'business' },
  'Photoshoot Rev':   { icon: 'image',           color: 'text-orange-500',   bg: 'bg-orange-50',   chart: '#f97316', type: 'income', ctx: 'business' },
  'App Rev':          { icon: 'smartphone',      color: 'text-slate-600',    bg: 'bg-slate-50',    chart: '#475569', type: 'income', ctx: 'business' },
  'Event Rev':        { icon: 'ticket',          color: 'text-pink-600',     bg: 'bg-pink-50',     chart: '#db2777', type: 'income', ctx: 'business' },
  'Design Rev':       { icon: 'palette',         color: 'text-purple-600',   bg: 'bg-purple-50',   chart: '#9333ea', type: 'income', ctx: 'business' },
  'Consulting':       { icon: 'messages-square', color: 'text-teal-600',     bg: 'bg-teal-50',     chart: '#0d9488', type: 'income', ctx: 'business' },
  'Other Biz Rev':    { icon: 'coins',           color: 'text-brand-green',  bg: 'bg-green-50',    chart: '#16a34a', type: 'income', ctx: 'business' },
};
const CAT_NAMES = Object.keys(CATEGORIES);
const INCOME_CATS = CAT_NAMES.filter(c => CATEGORIES[c].type === 'income');
const EXPENSE_CATS = CAT_NAMES.filter(c => CATEGORIES[c].type === 'expense');
const isIncome = cat => CATEGORIES[cat]?.type === 'income';

// Context helper
const getContextCats = (type) => CAT_NAMES.filter(c => CATEGORIES[c].type === type && CATEGORIES[c].ctx === window.currentContext);

// =============================================
// STATE
// =============================================
let supabase = null;
let currentUser = null;
let expenses = []; // This will hold everything
let currentTab = 'today';
window.currentContext = 'personal'; // 'personal' or 'business'
let categoryChart = null;
let weeklyChart = null;
let pendingRows = [];

const brandColors = {
  orange: '#E8730F', green: '#0d5d1a', red: '#cc2f2f',
  cream: '#F5F5F2', dark: '#1a2332', medium: '#4a5f7f', light: '#E0E0E0',
};

// =============================================
// SUPABASE INIT
// =============================================
function initSupabase() {
  if (SUPABASE_URL && SUPABASE_URL.startsWith('https') && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 10) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
}

// =============================================
// POPULATE CATEGORY DROPDOWNS
// =============================================
function buildCategoryOptions(selectEl, selectedVal) {
  if (!selectEl) return;
  selectEl.innerHTML = CAT_NAMES.map(c =>
    `<option value="${c}" ${c === selectedVal ? 'selected' : ''}>${c}</option>`
  ).join('');
}

// =============================================
// APP INIT
// =============================================
window.onload = async () => {
  lucide.createIcons();
  initSupabase();
  buildCategoryOptions(document.getElementById('category'), 'Food & Dining');
  buildCategoryOptions(document.getElementById('edit-category'), 'Food & Dining');
  document.getElementById('date').valueAsDate = new Date();

  // Show AI key status in settings
  document.getElementById('ai-key-status').textContent = AI_GATEWAY_KEY
    ? '✅ Configured via environment variable'
    : '⚠️ Not set — add VITE_VERCEL_AI_KEY to your Vercel env vars';
  document.getElementById('ai-model-display').textContent = AI_GATEWAY_MODEL;

  if (!supabase) {
    document.getElementById('loading-screen').classList.add('hidden');
    showAuth();
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session) { currentUser = session.user; await loadExpenses(); showApp(); }
  else { showAuth(); }
  document.getElementById('loading-screen').classList.add('hidden');

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') { currentUser = session.user; await loadExpenses(); showApp(); }
    else if (event === 'SIGNED_OUT') { currentUser = null; expenses = []; showAuth(); }
  });
};

// =============================================
// AUTH
// =============================================
function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-content').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-content').classList.remove('hidden');
  const name = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'User';
  const avatar = currentUser?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d5d1a&color=fff`;
  document.getElementById('welcome-name').textContent = name;
  document.getElementById('user-name').textContent = name;
  document.getElementById('user-email').textContent = currentUser?.email || '';
  document.getElementById('user-photo').src = avatar;
  updateUI();
}

document.getElementById('login-btn').addEventListener('click', async () => {
  if (!supabase) {
    alert('Supabase not initialised. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars on Vercel.');
    return;
  }
  await supabase.auth.signInWithOAuth({ provider: 'google' });
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  if (supabase) await supabase.auth.signOut();
});

// Settings modal (read-only — shows env var status)
window.openSettings = () => {
  document.getElementById('settings-modal').classList.remove('hidden');
  lucide.createIcons();
};

// =============================================
// DATA
// =============================================
async function loadExpenses() {
  if (!currentUser || !supabase) return;
  const { data, error } = await supabase.from('expenses').select('*')
    .eq('user_id', currentUser.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (!error) expenses = data || [];
}

// =============================================
// ADD EXPENSE FORM
// =============================================
document.getElementById('expense-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabase || !currentUser) { alert('Connect Supabase first.'); return; }
  const btn = document.getElementById('save-btn');
  btn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px"></div> Saving...';
  btn.disabled = true;
  const newExp = {
    user_id: currentUser.id,
    amount: parseFloat(document.getElementById('amount').value),
    category: document.getElementById('category').value,
    date: document.getElementById('date').value,
    description: document.getElementById('description').value,
    source: 'manual',
    context: window.currentContext,
  };
  const { data, error } = await supabase.from('expenses').insert([newExp]).select();
  btn.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i> Save Expense';
  btn.disabled = false;
  if (error) { showToast('Error saving expense.', 'red'); console.error(error); return; }
  if (data?.[0]) {
    expenses.unshift(data[0]);
    updateUI();
    e.target.reset();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('suggestion-hint').classList.add('hidden');
    showToast('Expense saved!', 'green');
  }
  lucide.createIcons();
});

// Smart category suggestion from history
document.getElementById('description').addEventListener('input', function () {
  const val = this.value.toLowerCase().trim();
  const hint = document.getElementById('suggestion-hint');
  if (!val || val.length < 3) { hint.classList.add('hidden'); return; }
  const match = expenses.find(e => e.description && e.description.toLowerCase().includes(val));
  if (match) {
    document.getElementById('category').value = match.category;
    hint.classList.remove('hidden');
  } else { hint.classList.add('hidden'); }
});

// =============================================
// EDIT EXPENSE
// =============================================
document.getElementById('edit-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabase) return;
  const btn = document.getElementById('update-btn');
  btn.textContent = 'Updating...'; btn.disabled = true;
  const id = document.getElementById('edit-id').value;
  const updates = {
    amount: parseFloat(document.getElementById('edit-amount').value),
    category: document.getElementById('edit-category').value,
    date: document.getElementById('edit-date').value,
    description: document.getElementById('edit-description').value,
  };
  const { error } = await supabase.from('expenses').update(updates).eq('id', id).eq('user_id', currentUser.id);
  btn.textContent = 'Update'; btn.disabled = false;
  if (error) { showToast('Error updating.', 'red'); return; }
  const idx = expenses.findIndex(x => x.id === id);
  if (idx !== -1) expenses[idx] = { ...expenses[idx], ...updates };
  updateUI(); closeEditModal(); showToast('Updated!', 'green');
});

window.openEditModal = id => {
  const e = expenses.find(x => x.id === id);
  if (!e) return;
  document.getElementById('edit-id').value = e.id;
  document.getElementById('edit-amount').value = e.amount;
  buildCategoryOptions(document.getElementById('edit-category'), e.category);
  document.getElementById('edit-date').value = e.date;
  document.getElementById('edit-description').value = e.description || '';
  document.getElementById('edit-modal').classList.remove('hidden');
  lucide.createIcons();
};
window.closeEditModal = () => document.getElementById('edit-modal').classList.add('hidden');

// =============================================
// DELETE EXPENSE
// =============================================
window.deleteExpense = async id => {
  if (!confirm('Delete this expense? This cannot be undone.')) return;
  const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) { showToast('Error deleting.', 'red'); return; }
  expenses = expenses.filter(x => x.id !== id);
  updateUI(); showToast('Deleted.', 'red');
};

// =============================================
// BANK STATEMENT IMPORT
// =============================================
window.handleDrop = e => {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('border-brand-orange');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
};
window.handleFileSelect = input => {
  if (input.files[0]) processFile(input.files[0]);
};

async function extractPdfText(file) {
  // Dynamically import pdf.js (works both from CDN in HTML and as npm module)
  const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.worker.min.mjs';
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

async function processFile(file) {
  if (!AI_GATEWAY_KEY) {
    showToast('AI key not configured. Add VITE_VERCEL_AI_KEY to your Vercel env vars.', 'red');
    window.openSettings();
    return;
  }
  const status = document.getElementById('import-status');
  const statusText = document.getElementById('import-status-text');
  status.classList.remove('hidden');
  const isPdf = file.name.toLowerCase().endsWith('.pdf');
  let text;
  try {
    if (isPdf) {
      statusText.textContent = 'Extracting text from PDF...';
      text = await extractPdfText(file);
      if (!text.trim()) {
        status.classList.add('hidden');
        showToast('PDF has no readable text (scanned image PDFs are not supported yet).', 'red');
        return;
      }
    } else {
      statusText.textContent = 'Reading file...';
      text = await file.text();
    }
    statusText.textContent = 'Processing with AI...';
    const rows = await parseStatementWithAI(text, AI_GATEWAY_KEY, AI_GATEWAY_MODEL);
    status.classList.add('hidden');
    if (!rows || rows.length === 0) { showToast('No transactions found.', 'red'); return; }
    openReviewModal(rows);
  } catch (err) {
    status.classList.add('hidden');
    showToast('Failed to process file: ' + err.message, 'red');
    console.error(err);
  }
}

async function parseStatementWithAI(rawText, apiKey, model) {
  const expenseCatList = EXPENSE_CATS.join(', ');
  const incomeCatList = INCOME_CATS.join(', ');
  const prompt = `You are a bank statement parser. Parse the following bank statement text and extract ALL transactions (both expenses and income/credits).

For each transaction return a JSON array with objects: { "date": "YYYY-MM-DD", "description": "merchant or payer name", "amount": number (always positive), "category": one of the categories below }.

Expense categories: [${expenseCatList}]
Income categories: [${incomeCatList}]

Rules:
- date must be YYYY-MM-DD format
- amount must always be a positive number
- for EXPENSES choose from expense categories; for INCOME/CREDITS choose from income categories
- category must be EXACTLY one of the listed categories
- if an expense is unsure, use "Other"; if income is unsure, use "Other Income"
- skip header rows, balance rows, or non-transaction lines
- salary/wages -> "Salary"; freelance/consulting -> "Freelance"; stock/dividends -> "Investments"
- cashback/returns -> "Refund"
- return ONLY valid JSON array, no markdown, no explanation

Bank statement:
${rawText.substring(0, 8000)}`;

  const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI Gateway error ${res.status}: ${errText.substring(0, 200)}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '[]';
  const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

// =============================================
// REVIEW MODAL
// =============================================
function openReviewModal(rows) {
  pendingRows = rows.map((r, i) => ({ ...r, _id: i, _selected: true, _deleted: false }));
  renderReviewTable();
  document.getElementById('review-modal').classList.remove('hidden');
  lucide.createIcons();
}
window.closeReviewModal = () => {
  document.getElementById('review-modal').classList.add('hidden');
  pendingRows = [];
  document.getElementById('file-input').value = '';
};
function renderReviewTable() {
  const body = document.getElementById('review-table-body');
  body.innerHTML = pendingRows.map(row => `
    <tr class="${row._deleted ? 'row-deleted' : ''} hover:bg-brand-cream/50 transition-colors border-b border-brand-light">
      <td class="px-4 py-3"><input type="checkbox" ${row._selected && !row._deleted ? 'checked' : ''} ${row._deleted ? 'disabled' : ''} onchange="toggleRow(${row._id},this.checked)" class="rounded"></td>
      <td class="px-4 py-3 font-lato text-brand-dark">${row.date}</td>
      <td class="px-4 py-3 font-lato text-brand-dark max-w-[200px] truncate" title="${row.description}">${row.description}</td>
      <td class="px-4 py-3 font-poppins font-semibold text-brand-dark">€${Number(row.amount).toFixed(2)}</td>
      <td class="px-4 py-3">
        <select onchange="changeRowCat(${row._id},this.value)" class="px-2 py-1 bg-brand-cream border border-brand-light rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-brand-orange" ${row._deleted ? 'disabled' : ''}>
          ${CAT_NAMES.map(c => `<option value="${c}" ${c === row.category ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </td>
      <td class="px-4 py-3">
        ${!row._deleted
          ? `<button onclick="deleteReviewRow(${row._id})" class="p-1.5 text-brand-medium hover:text-brand-red hover:bg-red-50 rounded-lg transition-all" title="Remove"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`
          : `<button onclick="restoreReviewRow(${row._id})" class="p-1.5 text-brand-medium hover:text-brand-green hover:bg-green-50 rounded-lg transition-all" title="Restore"><i data-lucide="undo-2" class="w-4 h-4"></i></button>`
        }
      </td>
    </tr>
  `).join('');
  const selected = pendingRows.filter(r => r._selected && !r._deleted).length;
  document.getElementById('review-count').textContent = `${selected} of ${pendingRows.length} transactions selected`;
  document.getElementById('select-all-cb').checked = pendingRows.every(r => r._deleted || r._selected);
  lucide.createIcons();
}
window.toggleRow = (id, checked) => {
  const r = pendingRows.find(x => x._id === id);
  if (r) { r._selected = checked; renderReviewTable(); }
};
window.changeRowCat = (id, cat) => {
  const r = pendingRows.find(x => x._id === id);
  if (r) r.category = cat;
};
window.deleteReviewRow = id => {
  const r = pendingRows.find(x => x._id === id);
  if (r) { r._deleted = true; r._selected = false; renderReviewTable(); }
};
window.restoreReviewRow = id => {
  const r = pendingRows.find(x => x._id === id);
  if (r) { r._deleted = false; r._selected = true; renderReviewTable(); }
};
window.toggleSelectAll = checked => {
  pendingRows.forEach(r => { if (!r._deleted) r._selected = checked; });
  renderReviewTable();
};
window.importSelected = async () => {
  if (!supabase || !currentUser) { showToast('Connect Supabase first.', 'red'); return; }
  const toImport = pendingRows.filter(r => r._selected && !r._deleted);
  if (!toImport.length) { showToast('No transactions selected.', 'red'); return; }
  const btn = document.getElementById('import-btn');
  btn.innerHTML = '<div class="loader" style="width:14px;height:14px;border-width:2px"></div> Importing...';
  btn.disabled = true;
  const rows = toImport.map(r => ({
    user_id: currentUser.id,
    amount: Number(r.amount),
    category: r.category,
    date: r.date,
    description: r.description,
    source: 'statement',
    context: window.currentContext,
  }));
  const { data, error } = await supabase.from('expenses').insert(rows).select();
  btn.innerHTML = '<i data-lucide="download" class="w-4 h-4"></i> Import Selected';
  btn.disabled = false;
  if (error) { showToast('Import failed: ' + error.message, 'red'); console.error(error); return; }
  if (data) expenses = [...data, ...expenses];
  updateUI();
  window.closeReviewModal();
  showToast(`${toImport.length} transactions imported!`, 'green');
};

// =============================================
// UI RENDERING
// =============================================
function updateUI() {
  const ctxExpenses = expenses.filter(e => e.context === window.currentContext || (!e.context && window.currentContext === 'personal')); // fallback old rows to personal
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  // Only count expenses (not income) for budget comparison
  const sumExp = arr => arr.reduce((s, e) => !isIncome(e.category) ? s + Number(e.amount) : s, 0);
  const net = arr => arr.reduce((s, e) => isIncome(e.category) ? s + Number(e.amount) : s - Number(e.amount), 0);
  const fmtNet = v => (v >= 0 ? '+' : '-') + fmt(Math.abs(v));
  const todayArr = ctxExpenses.filter(e => e.date === todayStr);
  const weekArr = ctxExpenses.filter(e => new Date(e.date) >= startOfWeek);
  const monthArr = ctxExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const netToday = net(todayArr); const spentToday = sumExp(todayArr);
  const netWeek  = net(weekArr);  const spentWeek  = sumExp(weekArr);
  const netMonth = net(monthArr); const spentMonth = sumExp(monthArr);
  const statToday = document.getElementById('stat-today');
  const statWeek  = document.getElementById('stat-week');
  const statMonth = document.getElementById('stat-month');
  statToday.textContent = fmtNet(netToday);
  statToday.className = `text-4xl font-poppins font-bold mb-1 ${netToday >= 0 ? 'text-brand-green' : 'text-brand-dark'}`;
  statWeek.textContent = fmtNet(netWeek);
  statWeek.className = `text-4xl font-poppins font-bold mb-1 ${netWeek >= 0 ? 'text-brand-green' : 'text-brand-dark'}`;
  statMonth.textContent = fmtNet(netMonth);
  statMonth.className = `text-4xl font-poppins font-bold mb-1 ${netMonth >= 0 ? 'text-brand-green' : 'text-brand-dark'}`;
  // Budget indicators in stat cards
  const b = loadBudget();
  function renderStatBudget(elId, spent, budgetVal) {
    const el = document.getElementById(elId);
    if (!budgetVal || !el) { el && el.classList.add('hidden'); return; }
    const pct = Math.min(100, (spent / budgetVal) * 100);
    const over = spent > budgetVal;
    const remaining = budgetVal - spent;
    el.classList.remove('hidden');
    el.innerHTML = `<div class="progress-bar mb-1"><div class="progress-fill ${over ? 'bg-brand-red' : 'bg-brand-green'}" style="width:${pct}%"></div></div><p class="text-[11px] font-poppins ${over ? 'text-brand-red font-bold' : 'text-brand-medium'}">${over ? 'Over budget by ' + fmt(Math.abs(remaining)) : fmt(remaining) + ' remaining'} of ${fmt(budgetVal)}</p>`;
  }
  renderStatBudget('stat-today-budget', spentToday, b.daily);
  renderStatBudget('stat-week-budget', spentWeek, b.weekly);
  renderStatBudget('stat-month-budget', spentMonth, b.monthly || b._total);
  renderList(); updateCharts(); lucide.createIcons();
}

function renderList() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || new Date(b.created_at) - new Date(a.created_at));
  let filtered = sorted;
  if (currentTab === 'today') filtered = sorted.filter(e => e.date === todayStr);
  else if (currentTab === 'week') filtered = sorted.filter(e => new Date(e.date) >= startOfWeek);
  else if (currentTab === 'month') filtered = sorted.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const el = document.getElementById('expense-list');
  if (!filtered.length) {
    el.innerHTML = `<div class="py-12 text-center text-brand-medium"><i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-30"></i><p>No expenses for this period.</p></div>`;
  } else {
    el.innerHTML = filtered.map(e => {
      const ci = CATEGORIES[e.category] || CATEGORIES['Other'];
      const income = isIncome(e.category);
      const src = e.source === 'statement'
        ? `<span class="badge-statement text-[10px] font-poppins font-bold px-1.5 py-0.5 rounded ml-1">stmt</span>`
        : `<span class="badge-manual text-[10px] font-poppins font-bold px-1.5 py-0.5 rounded ml-1">manual</span>`;
      const amountStr = income
        ? `<span class="font-poppins font-bold text-brand-green">+${fmt(e.amount)}</span>`
        : `<span class="font-poppins font-bold text-brand-dark">${fmt(e.amount)}</span>`;
      return `<div class="flex items-center justify-between p-4 mb-3 bg-white rounded-xl border ${income ? 'border-green-100' : 'border-brand-light'} hover:border-brand-green hover:shadow-sm transition-all group">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl ${ci.bg} ${ci.color} flex items-center justify-center shadow-sm shrink-0">
            <i data-lucide="${ci.icon}" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <h4 class="font-poppins font-semibold text-brand-dark flex items-center gap-1">${e.category}${src}</h4>
            <p class="text-[13px] text-brand-medium truncate max-w-[200px]">${e.description || 'No description'} • ${fmtDate(e.date)}</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          ${amountStr}
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="openEditModal('${e.id}')" class="p-1.5 text-brand-medium hover:text-brand-green hover:bg-green-50 rounded-lg transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
            <button onclick="deleteExpense('${e.id}')" class="p-1.5 text-brand-medium hover:text-brand-red hover:bg-red-50 rounded-lg transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  lucide.createIcons();
}

function updateCharts() {
  const ctxExpenses = expenses.filter(e => e.context === window.currentContext || (!e.context && window.currentContext === 'personal'));
  const now = new Date();
  Chart.defaults.font.family = "'Lato', sans-serif";
  Chart.defaults.color = brandColors.medium;
  const tooltipBase = { backgroundColor: 'rgba(26,35,50,0.95)', titleFont: { family: "'Poppins',sans-serif", size: 13, weight: 'bold' }, bodyFont: { family: "'Lato',sans-serif", size: 13 }, padding: 10, cornerRadius: 8 };

  // --- Doughnut: monthly expense categories ---
  const currentExpCats = getContextCats('expense');
  const monthExp = ctxExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !isIncome(e.category); });
  const catData = currentExpCats.map(c => monthExp.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0));
  const chartColors = currentExpCats.map(c => CATEGORIES[c].chart);
  document.getElementById('category-legend').innerHTML = currentExpCats.map((c, i) => {
    const ci = CATEGORIES[c];
    return `<div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-md ${ci.bg} ${ci.color} flex items-center justify-center"><i data-lucide="${ci.icon}" class="w-3 h-3"></i></div>
        <span class="text-[13px] font-lato text-brand-medium">${c}</span>
      </div>
      <span class="text-[13px] font-poppins font-semibold text-brand-dark">${fmt(catData[i])}</span>
    </div>`;
  }).join('');
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById('categoryChart').getContext('2d'), {
    type: 'doughnut',
    data: { labels: currentExpCats, datasets: [{ data: catData, backgroundColor: chartColors, borderWidth: 2, borderColor: brandColors.cream, hoverOffset: 10 }] },
    options: { plugins: { legend: { display: false }, tooltip: { ...tooltipBase, callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}` } } }, cutout: '70%', animation: { animateScale: true, animateRotate: true } }
  });

  // --- Weekly spending bar ---
  const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse();
  const wkExpData = last7.map(d => ctxExpenses.filter(e => e.date === d && !isIncome(e.category)).reduce((s, e) => s + Number(e.amount), 0));
  if (weeklyChart) weeklyChart.destroy();
  weeklyChart = new Chart(document.getElementById('weeklyChart').getContext('2d'), {
    type: 'bar',
    data: { labels: last7.map(d => new Date(d).toLocaleDateString('en-GB', { weekday: 'short' })), datasets: [{ label: 'Spending', data: wkExpData, backgroundColor: brandColors.green, borderRadius: 8, hoverBackgroundColor: '#0a4a15' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...tooltipBase, callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}` } } }, scales: { y: { beginAtZero: true, grid: { display: false }, ticks: { callback: v => '€' + v } }, x: { grid: { display: false } } } }
  });

  // --- Income vs Expenses: last 6 months grouped bar ---
  const last6Months = [...Array(6)].map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) };
  }).reverse();
  const ieIncomeData = last6Months.map(m => ctxExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === m.month && d.getFullYear() === m.year && isIncome(e.category); }).reduce((s, e) => s + Number(e.amount), 0));
  const ieExpData = last6Months.map(m => ctxExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === m.month && d.getFullYear() === m.year && !isIncome(e.category); }).reduce((s, e) => s + Number(e.amount), 0));
  if (window._ieChart) window._ieChart.destroy();
  window._ieChart = new Chart(document.getElementById('incomeExpenseChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: last6Months.map(m => m.label),
      datasets: [
        { label: 'Income', data: ieIncomeData, backgroundColor: '#0d5d1a', borderRadius: 6 },
        { label: 'Expenses', data: ieExpData, backgroundColor: '#E8730F', borderRadius: 6 },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } }, tooltip: { ...tooltipBase, callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } } }, scales: { y: { beginAtZero: true, grid: { display: false }, ticks: { callback: v => '€' + v } }, x: { grid: { display: false } } } }
  });

  // --- 6-month net balance line ---
  const balData = last6Months.map(m => {
    const inc = ctxExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === m.month && d.getFullYear() === m.year && isIncome(e.category); }).reduce((s, e) => s + Number(e.amount), 0);
    const exp = ctxExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === m.month && d.getFullYear() === m.year && !isIncome(e.category); }).reduce((s, e) => s + Number(e.amount), 0);
    return inc - exp;
  });
  if (window._balChart) window._balChart.destroy();
  window._balChart = new Chart(document.getElementById('balanceChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: last6Months.map(m => m.label),
      datasets: [{ label: 'Net Balance', data: balData, borderColor: '#0d5d1a', backgroundColor: 'rgba(13,93,26,0.08)', fill: true, tension: 0.4, pointBackgroundColor: balData.map(v => v >= 0 ? '#0d5d1a' : '#cc2f2f'), pointRadius: 5 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...tooltipBase, callbacks: { label: ctx => ` Net: ${fmt(ctx.parsed.y)}` } } }, scales: { y: { grid: { display: false }, ticks: { callback: v => '€' + v } }, x: { grid: { display: false } } } }
  });

  // Update budget bars after charts
  renderBudgetBars();
}

// =============================================
// TABS
// =============================================
window.switchTab = tab => {
  currentTab = tab;
  ['today', 'week', 'month', 'all'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (t === tab) { el.classList.add('border-brand-green', 'text-brand-green'); el.classList.remove('border-transparent', 'text-brand-medium'); }
    else { el.classList.remove('border-brand-green', 'text-brand-green'); el.classList.add('border-transparent', 'text-brand-medium'); }
  });
  renderList();
};

// =============================================
// BUDGET SYSTEM
// =============================================
// window.* exposure needed: ES module functions are not global, so
// HTML onclick="saveBudget()" / onclick="loadBudget()" would fail otherwise.
const loadBudget = () => {
  try { return JSON.parse(localStorage.getItem('sw_budget') || '{}'); } catch { return {}; }
};
window.saveBudget = function saveBudget() {
  const budget = {};
  const daily = parseFloat(document.getElementById('budget-daily').value);
  const weekly = parseFloat(document.getElementById('budget-weekly').value);
  const monthly = parseFloat(document.getElementById('budget-monthly').value);
  if (daily > 0) budget.daily = daily;
  if (weekly > 0) budget.weekly = weekly;
  if (monthly > 0) budget.monthly = monthly;
  EXPENSE_CATS.forEach(c => {
    const v = parseFloat(document.getElementById(`budget-cat-${c.replace(/[^a-z0-9]/gi,'_')}`).value);
    if (v > 0) budget[c] = v;
  });
  localStorage.setItem('sw_budget', JSON.stringify(budget));
  document.getElementById('budget-modal').classList.add('hidden');
  updateUI();
  showToast('Budget saved! ✓', 'green');
};
window.openBudget = () => {
  const b = loadBudget();
  document.getElementById('budget-daily').value = b.daily || '';
  document.getElementById('budget-weekly').value = b.weekly || '';
  document.getElementById('budget-monthly').value = b.monthly || '';
  // Build per-category inputs
  const currentExpCats = getContextCats('expense');
  document.getElementById('cat-budget-inputs').innerHTML = currentExpCats.map(c => {
    const id = `budget-cat-${c.replace(/[^a-z0-9]/gi,'_')}`;
    const ci = CATEGORIES[c];
    return `<div class="flex items-center gap-3">
      <div class="w-7 h-7 rounded-lg ${ci.bg} ${ci.color} flex items-center justify-center shrink-0"><i data-lucide="${ci.icon}" class="w-3.5 h-3.5"></i></div>
      <label class="flex-1 text-[13px] font-lato text-brand-dark">${c}</label>
      <div class="relative w-28"><span class="absolute left-2 top-1/2 -translate-y-1/2 text-brand-medium text-[13px]">€</span>
        <input type="number" id="${id}" step="10" min="0" value="${b[c] || ''}" placeholder="–" class="w-full pl-5 pr-2 py-1.5 bg-brand-cream border border-brand-light rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-brand-orange">
      </div>
    </div>`;
  }).join('');
  document.getElementById('budget-modal').classList.remove('hidden');
  lucide.createIcons();
};
function renderBudgetBars() {
  const b = loadBudget();
  const ctxExpenses = expenses.filter(e => e.context === window.currentContext || (!e.context && window.currentContext === 'personal'));
  const now = new Date();
  const monthExpenses = ctxExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !isIncome(e.category); });
  const totalSpent = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const section = document.getElementById('budget-section');
  const bars = document.getElementById('budget-bars');
  
  const currentExpCats = getContextCats('expense');
  
  // Notice we must check if there is a general budget or if any category in the Current Context has a budget
  const hasAny = b.monthly || currentExpCats.some(c => b[c]);
  if (!hasAny) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  let html = '';
  if (b.monthly) {
    const pct = Math.min(100, (totalSpent / b.monthly) * 100);
    const over = totalSpent > b.monthly;
    html += `<div>
      <div class="flex justify-between text-[13px] mb-1">
        <span class="font-poppins font-semibold text-brand-dark">Total</span>
        <span class="${over ? 'text-brand-red font-bold' : 'text-brand-medium'}">${fmt(totalSpent)} / ${fmt(b.monthly)}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill ${over ? 'bg-brand-red' : 'bg-brand-green'}" style="width:${pct}%"></div></div>
    </div>`;
  }
  currentExpCats.forEach(c => {
    if (!b[c]) return;
    const spent = monthExpenses.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0);
    const pct = Math.min(100, (spent / b[c]) * 100);
    const over = spent > b[c];
    const ci = CATEGORIES[c];
    html += `<div>
      <div class="flex items-center justify-between text-[13px] mb-1">
        <div class="flex items-center gap-1.5"><div class="w-4 h-4 rounded ${ci.bg} ${ci.color} flex items-center justify-center"><i data-lucide="${ci.icon}" class="w-2.5 h-2.5"></i></div><span class="text-brand-dark">${c}</span></div>
        <span class="${over ? 'text-brand-red font-bold' : 'text-brand-medium'}">${fmt(spent)} / ${fmt(b[c])}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill ${over ? 'bg-brand-red' : 'bg-brand-green'}" style="width:${pct}%"></div></div>
    </div>`;
  });
  bars.innerHTML = html;
  lucide.createIcons();
}

// =============================================
// AI ADVISOR
// =============================================
window.openAdvisor = () => {
  document.getElementById('advisor-modal').classList.remove('hidden');
  lucide.createIcons();
};
window.askAIAdvisor = async () => {
  if (!AI_GATEWAY_KEY) {
    showToast('Add VITE_VERCEL_AI_KEY to use AI Advisor.', 'red');
    return;
  }
  const btn = document.getElementById('ask-ai-btn');
  const loading = document.getElementById('advisor-loading');
  const content = document.getElementById('advisor-content');
  const empty = document.getElementById('advisor-empty');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px"></div> Analysing...';
  loading.classList.remove('hidden');
  content.innerHTML = '';
  empty.classList.add('hidden');
  // Build spending summary for last 30 days
  const since = new Date(); since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().split('T')[0];
  const recent = expenses.filter(e => e.date >= sinceStr);
  const totalInc = recent.filter(e => isIncome(e.category)).reduce((s, e) => s + Number(e.amount), 0);
  const totalExp = recent.filter(e => !isIncome(e.category)).reduce((s, e) => s + Number(e.amount), 0);
  const byCat = EXPENSE_CATS.map(c => ({ cat: c, spent: recent.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0) })).filter(x => x.spent > 0).sort((a, b) => b.spent - a.spent);
  const budget = loadBudget();
  const budgetStr = budget._total ? `Monthly budget set: €${budget._total}` : 'No monthly budget set';
  const catStr = byCat.map(x => `  - ${x.cat}: €${x.spent.toFixed(2)}`).join('\n');
  const prompt = `You are a personal finance advisor. Analyse the following spending data and provide:
1. A brief summary of the user's financial health (2-3 sentences)
2. The top 3 concrete actionable tips to reduce expenses
3. One specific category where they can save the most money and how

Spending data (last 30 days):
- Total income: €${totalInc.toFixed(2)}
- Total expenses: €${totalExp.toFixed(2)}
- Net balance: €${(totalInc - totalExp).toFixed(2)}
- ${budgetStr}
- Expenses by category:
${catStr}

Be specific, friendly, and concise. Use simple language. Format your response with clear sections using markdown (## for headers, - for bullet points, **bold** for emphasis). Do not repeat the raw numbers back, focus on insights and advice.`;
  try {
    const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_GATEWAY_KEY}` },
      body: JSON.stringify({ model: AI_GATEWAY_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.7 }),
    });
    loading.classList.add('hidden');
    if (!res.ok) { showToast('AI Advisor failed. Check your API key.', 'red'); empty.classList.remove('hidden'); return; }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || '';
    // Simple markdown-to-HTML renderer
    content.innerHTML = text
      .replace(/^## (.+)$/gm, '<p class="font-poppins font-bold text-brand-dark text-[15px] mt-4 mb-1">$1</p>')
      .replace(/^### (.+)$/gm, '<p class="font-poppins font-semibold text-brand-dark text-[14px] mt-3 mb-1">$1</p>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li class="mb-1">$1</li>')
      .replace(/(<li.*<\/li>\n?)+/gs, m => `<ul class="list-disc pl-5 mb-3">${m}</ul>`)
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/^(?!<[pul])/gm, '');
  } catch (err) {
    loading.classList.add('hidden');
    showToast('AI Advisor error: ' + err.message, 'red');
    empty.classList.remove('hidden');
  }
  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="sparkles" class="w-4 h-4"></i> Analyse my spending';
  lucide.createIcons();
};

// =============================================
// HELPERS
// =============================================
function fmt(v) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(v); }
function fmtDate(s) { return new Date(s).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }); }

function showToast(msg, type = 'green') {
  const el = document.createElement('div');
  const bg = type === 'green' ? 'bg-brand-green' : type === 'red' ? 'bg-brand-red' : 'bg-brand-dark';
  el.className = `fixed bottom-6 right-6 z-[70] ${bg} text-white font-poppins font-semibold px-5 py-3 rounded-xl shadow-xl text-[14px]`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}


