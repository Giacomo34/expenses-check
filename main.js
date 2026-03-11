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
  'Food & Dining':    { icon: 'utensils',       color: 'text-brand-orange', bg: 'bg-orange-50',   chart: '#E8730F' },
  'Transport':        { icon: 'car',             color: 'text-brand-medium', bg: 'bg-slate-50',    chart: '#4a5f7f' },
  'Bills & Utilities':{ icon: 'zap',             color: 'text-brand-dark',   bg: 'bg-gray-50',     chart: '#1a2332' },
  'Shopping':         { icon: 'shopping-bag',    color: 'text-brand-green',  bg: 'bg-green-50',    chart: '#0d5d1a' },
  'Entertainment':    { icon: 'clapperboard',    color: 'text-brand-red',    bg: 'bg-red-50',      chart: '#cc2f2f' },
  'Health':           { icon: 'heart-pulse',     color: 'text-pink-600',     bg: 'bg-pink-50',     chart: '#db2777' },
  'Travel':           { icon: 'plane',           color: 'text-blue-600',     bg: 'bg-blue-50',     chart: '#2563eb' },
  'Education':        { icon: 'book-open',       color: 'text-indigo-600',   bg: 'bg-indigo-50',   chart: '#4f46e5' },
  'Subscriptions':    { icon: 'repeat',          color: 'text-purple-600',   bg: 'bg-purple-50',   chart: '#9333ea' },
  'Other':            { icon: 'package',         color: 'text-brand-medium', bg: 'bg-brand-cream', chart: '#E0E0E0' },
};
const CAT_NAMES = Object.keys(CATEGORIES);

// =============================================
// STATE
// =============================================
let supabase = null;
let currentUser = null;
let expenses = [];
let currentTab = 'today';
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

async function processFile(file) {
  if (!AI_GATEWAY_KEY) {
    showToast('AI key not configured. Add VITE_VERCEL_AI_KEY to your Vercel env vars.', 'red');
    window.openSettings();
    return;
  }
  const status = document.getElementById('import-status');
  const statusText = document.getElementById('import-status-text');
  status.classList.remove('hidden');
  statusText.textContent = 'Reading file...';
  const text = await file.text();
  statusText.textContent = 'Processing with AI...';
  try {
    const rows = await parseStatementWithAI(text, AI_GATEWAY_KEY, AI_GATEWAY_MODEL);
    status.classList.add('hidden');
    if (!rows || rows.length === 0) { showToast('No transactions found.', 'red'); return; }
    openReviewModal(rows);
  } catch (err) {
    status.classList.add('hidden');
    showToast('AI parsing failed: ' + err.message, 'red');
    console.error(err);
  }
}

async function parseStatementWithAI(rawText, apiKey, model) {
  const catList = CAT_NAMES.join(', ');
  const prompt = `You are a bank statement parser. Parse the following bank statement text and extract ALL expense transactions.

For each transaction return a JSON array with objects: { "date": "YYYY-MM-DD", "description": "merchant name", "amount": number (always positive), "category": one of [${catList}] }.

Rules:
- date must be YYYY-MM-DD format
- amount must always be a positive number
- category must be EXACTLY one of the listed categories
- if unsure, use "Other"
- skip header rows, balance rows, or non-transaction lines
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
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const sum = arr => arr.reduce((s, e) => s + Number(e.amount), 0);
  document.getElementById('stat-today').textContent = fmt(sum(expenses.filter(e => e.date === todayStr)));
  document.getElementById('stat-week').textContent = fmt(sum(expenses.filter(e => new Date(e.date) >= startOfWeek)));
  document.getElementById('stat-month').textContent = fmt(sum(expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })));
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
      const src = e.source === 'statement'
        ? `<span class="badge-statement text-[10px] font-poppins font-bold px-1.5 py-0.5 rounded ml-1">stmt</span>`
        : `<span class="badge-manual text-[10px] font-poppins font-bold px-1.5 py-0.5 rounded ml-1">manual</span>`;
      return `<div class="flex items-center justify-between p-4 mb-3 bg-white rounded-xl border border-brand-light hover:border-brand-green hover:shadow-sm transition-all group">
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
          <span class="font-poppins font-bold text-brand-dark">${fmt(e.amount)}</span>
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
  const now = new Date();
  const monthExp = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const catData = CAT_NAMES.map(c => monthExp.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0));
  const chartColors = CAT_NAMES.map(c => CATEGORIES[c].chart);
  document.getElementById('category-legend').innerHTML = CAT_NAMES.map((c, i) => {
    const ci = CATEGORIES[c];
    return `<div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-md ${ci.bg} ${ci.color} flex items-center justify-center">
          <i data-lucide="${ci.icon}" class="w-3 h-3"></i>
        </div>
        <span class="text-[13px] font-lato text-brand-medium">${c}</span>
      </div>
      <span class="text-[13px] font-poppins font-semibold text-brand-dark">${fmt(catData[i])}</span>
    </div>`;
  }).join('');
  Chart.defaults.font.family = "'Lato', sans-serif";
  Chart.defaults.color = brandColors.medium;
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById('categoryChart').getContext('2d'), {
    type: 'doughnut',
    data: { labels: CAT_NAMES, datasets: [{ data: catData, backgroundColor: chartColors, borderWidth: 2, borderColor: brandColors.cream, hoverOffset: 10 }] },
    options: { plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(26,35,50,0.95)', titleFont: { family: "'Poppins',sans-serif", size: 13, weight: 'bold' }, bodyFont: { family: "'Lato',sans-serif", size: 13 }, padding: 10, cornerRadius: 8, callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}` } } }, cutout: '70%', animation: { animateScale: true, animateRotate: true } }
  });
  const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse();
  const wkData = last7.map(d => expenses.filter(e => e.date === d).reduce((s, e) => s + Number(e.amount), 0));
  if (weeklyChart) weeklyChart.destroy();
  weeklyChart = new Chart(document.getElementById('weeklyChart').getContext('2d'), {
    type: 'bar',
    data: { labels: last7.map(d => new Date(d).toLocaleDateString('en-GB', { weekday: 'short' })), datasets: [{ label: 'Expenses', data: wkData, backgroundColor: brandColors.green, borderRadius: 8, hoverBackgroundColor: '#0a4a15' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(26,35,50,0.95)', callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}` } } }, scales: { y: { beginAtZero: true, grid: { display: false }, ticks: { callback: v => '€' + v } }, x: { grid: { display: false } } } }
  });
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
