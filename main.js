import { createClient } from '@supabase/supabase-js';

// Env vars injected by Vite from Vercel Environment Variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// State
let currentUser = null;
let expenses = [];
let currentTab = 'today';
let categoryChart = null;
let weeklyChart = null;

const brandColors = {
    orange: '#E8730F', green: '#0d5d1a', red: '#cc2f2f',
    cream: '#F5F5F2', dark: '#1a2332', medium: '#4a5f7f', light: '#E0E0E0',
};

const loadingScreen = document.getElementById('loading-screen');
const authScreen = document.getElementById('auth-screen');
const appContent = document.getElementById('app-content');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const expenseForm = document.getElementById('expense-form');
const expenseList = document.getElementById('expense-list');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');

window.onload = async () => {
    lucide.createIcons();
    document.getElementById('date').valueAsDate = new Date();

    if (!supabase) {
        loadingScreen.classList.add('hidden');
        showAuth();
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadExpenses();
        showApp();
    } else {
        showAuth();
    }

    loadingScreen.classList.add('hidden');

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            await loadExpenses();
            showApp();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            expenses = [];
            showAuth();
        }
    });
};

function showAuth() {
    authScreen.classList.remove('hidden');
    appContent.classList.add('hidden');
}

function showApp() {
    authScreen.classList.add('hidden');
    appContent.classList.remove('hidden');

    const name = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Utente';
    const avatar = currentUser?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + name + '&background=0d5d1a&color=fff';

    document.getElementById('welcome-name').textContent = name;
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-email').textContent = currentUser?.email || '';
    document.getElementById('user-photo').src = avatar;

    updateUI();
}

loginBtn.addEventListener('click', async () => {
    if (!supabase) {
        alert('Errore: Supabase non inizializzato. Controlla le variabili d\'ambiente su Vercel.');
        return;
    }
    await supabase.auth.signInWithOAuth({ provider: 'google' });
});

logoutBtn.addEventListener('click', async () => {
    if (supabase) await supabase.auth.signOut();
});

async function loadExpenses() {
    if (!currentUser) return;
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
    if (error) { console.error('Errore nel caricamento spese:', error); return; }
    expenses = data || [];
}

expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase || !currentUser) { alert('Connetti Supabase per salvare!'); return; }

    const btn = document.getElementById('save-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px;"></div> Salvataggio...';
    btn.disabled = true;

    const newExpense = {
        user_id: currentUser.id,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value,
    };

    const { data, error } = await supabase.from('expenses').insert([newExpense]).select();
    btn.innerHTML = originalText;
    btn.disabled = false;

    if (error) { alert('Errore salvataggio spesa.'); console.error(error); return; }
    if (data && data[0]) {
        expenses.unshift(data[0]);
        updateUI();
        expenseForm.reset();
        document.getElementById('date').valueAsDate = new Date();
    }
});

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase) return;

    const btn = document.getElementById('update-btn');
    btn.innerHTML = 'Aggiornamento...';
    btn.disabled = true;

    const id = document.getElementById('edit-id').value;
    const updates = {
        amount: parseFloat(document.getElementById('edit-amount').value),
        category: document.getElementById('edit-category').value,
        date: document.getElementById('edit-date').value,
        description: document.getElementById('edit-description').value,
    };

    const { error } = await supabase.from('expenses').update(updates).eq('id', id).eq('user_id', currentUser.id);
    btn.innerHTML = 'Aggiorna';
    btn.disabled = false;

    if (error) { alert('Errore in aggiornamento.'); console.error(error); return; }

    const idx = expenses.findIndex(exp => exp.id === id);
    if (idx !== -1) { expenses[idx] = { ...expenses[idx], ...updates }; updateUI(); }
    window.closeEditModal();
});

window.deleteExpense = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questa spesa?')) {
        const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', currentUser.id);
        if (error) { alert('Errore in eliminazione.'); console.error(error); return; }
        expenses = expenses.filter(exp => exp.id !== id);
        updateUI();
    }
};

function updateUI() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayTotal = expenses.filter(e => e.date === todayStr).reduce((s, e) => s + Number(e.amount), 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const weekTotal = expenses.filter(e => new Date(e.date) >= startOfWeek).reduce((s, e) => s + Number(e.amount), 0);
    const monthTotal = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, e) => s + Number(e.amount), 0);

    document.getElementById('stat-today').textContent = formatCurrency(todayTotal);
    document.getElementById('stat-week').textContent = formatCurrency(weekTotal);
    document.getElementById('stat-month').textContent = formatCurrency(monthTotal);

    renderList();
    updateCharts();
    lucide.createIcons();
}

function renderList() {
    const now = new Date();
    const sorted = [...expenses].sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return new Date(b.created_at) - new Date(a.created_at);
    });

    let filtered = [];
    if (currentTab === 'today') {
        filtered = sorted.filter(e => e.date === now.toISOString().split('T')[0]);
    } else if (currentTab === 'week') {
        const start = new Date(now); start.setDate(now.getDate() - now.getDay());
        filtered = sorted.filter(e => new Date(e.date) >= start);
    } else {
        filtered = sorted.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    }

    if (filtered.length === 0) {
        expenseList.innerHTML = `<div class="py-12 text-center text-brand-medium"><i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-dark"></i><p>Nessuna spesa trovata per questo periodo.</p></div>`;
    } else {
        expenseList.innerHTML = filtered.map(e => {
            const catInfo = getCategoryInfo(e.category);
            const catLabel = { Food:'Cibo', Transport:'Trasporti', Bills:'Bollette', Shopping:'Shopping', Entertainment:'Intrattenimento', Other:'Altro' }[e.category] || 'Altro';
            return `<div class="flex items-center justify-between p-4 mb-3 bg-white rounded-xl border border-brand-light hover:border-brand-green hover:shadow-sm transition-all group">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl ${catInfo.bg} ${catInfo.color} flex items-center justify-center shadow-sm border border-brand-light">
                        <i data-lucide="${catInfo.icon}" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h4 class="font-poppins font-semibold text-brand-dark">${catLabel}</h4>
                        <p class="text-[14px] font-lato text-brand-medium">${e.description || 'Nessuna descrizione'} &bull; ${formatDate(e.date)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <span class="font-poppins font-bold text-brand-dark">${formatCurrency(e.amount)}</span>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.openEditModal('${e.id}')" class="p-1.5 text-brand-medium hover:text-brand-green hover:bg-green-50 rounded-lg transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                        <button onclick="window.deleteExpense('${e.id}')" class="p-1.5 text-brand-medium hover:text-brand-red hover:bg-red-50 rounded-lg transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
    lucide.createIcons();
}

function updateCharts() {
    const now = new Date();
    const monthExp = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const categories = ['Food', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Other'];
    const labelsIt = ['Cibo', 'Trasporti', 'Bollette', 'Shopping', 'Intrattenimento', 'Altro'];
    const categoryData = categories.map(cat => monthExp.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0));
    const pieColors = ['#E8730F', '#0d5d1a', '#cc2f2f', '#f59e0b', '#4a5f7f', '#1a2332'];

    document.getElementById('category-legend').innerHTML = categories.map((cat, i) => {
        const info = getCategoryInfo(cat);
        return `<div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg ${info.bg} ${info.color} flex items-center justify-center border border-brand-light"><i data-lucide="${info.icon}" class="w-3.5 h-3.5"></i></div>
                <span class="text-[14px] font-lato text-brand-medium">${labelsIt[i]}</span>
            </div>
            <span class="text-[14px] font-poppins font-semibold text-brand-dark">${formatCurrency(categoryData[i])}</span>
        </div>`;
    }).join('');

    Chart.defaults.font.family = "'Lato', sans-serif";
    Chart.defaults.color = brandColors.medium;

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(document.getElementById('categoryChart').getContext('2d'), {
        type: 'doughnut',
        data: { labels: labelsIt, datasets: [{ data: categoryData, backgroundColor: pieColors, borderWidth: 2, borderColor: brandColors.cream, hoverOffset: 10 }] },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26,35,50,0.95)',
                    titleFont: { family: "'Poppins',sans-serif", size: 14, weight: 'bold' },
                    bodyFont: { family: "'Lato',sans-serif", size: 14 },
                    padding: 12, cornerRadius: 8,
                    callbacks: { label: ctx => (ctx.label || '') + ': ' + formatCurrency(ctx.parsed) }
                }
            },
            cutout: '70%',
            animation: { animateScale: true, animateRotate: true }
        }
    });

    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(document.getElementById('weeklyChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: last7Days.map(d => new Date(d).toLocaleDateString('it-IT', { weekday: 'short' })),
            datasets: [{ label: 'Spese', data: last7Days.map(date => expenses.filter(e => e.date === date).reduce((s, e) => s + Number(e.amount), 0)), backgroundColor: brandColors.green, borderRadius: 8, hoverBackgroundColor: '#0a4a15' }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26,35,50,0.95)',
                    titleFont: { family: "'Poppins',sans-serif", size: 14, weight: 'bold' },
                    bodyFont: { family: "'Lato',sans-serif", size: 14 },
                    padding: 12, cornerRadius: 8,
                    callbacks: { label: ctx => (ctx.dataset.label || '') + ': ' + formatCurrency(ctx.parsed.y) }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { display: false }, ticks: { callback: v => '\u20AC' + v } },
                x: { grid: { display: false } }
            }
        }
    });
}

function formatCurrency(val) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' });
}

function getCategoryInfo(cat) {
    const map = {
        'Food': { icon: 'utensils', bg: 'bg-white', color: 'text-brand-orange' },
        'Transport': { icon: 'bus', bg: 'bg-white', color: 'text-brand-medium' },
        'Bills': { icon: 'file-text', bg: 'bg-white', color: 'text-brand-dark' },
        'Shopping': { icon: 'shopping-cart', bg: 'bg-white', color: 'text-brand-green' },
        'Entertainment': { icon: 'clapperboard', bg: 'bg-white', color: 'text-brand-red' },
        'Other': { icon: 'package', bg: 'bg-white', color: 'text-brand-medium' },
    };
    return map[cat] || { icon: 'circle', bg: 'bg-brand-cream', color: 'text-brand-medium' };
}

window.switchTab = (tab) => {
    currentTab = tab;
    ['today', 'week', 'month'].forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if (t === tab) { el.classList.add('border-brand-green', 'text-brand-green'); el.classList.remove('border-transparent', 'text-brand-medium'); }
        else { el.classList.remove('border-brand-green', 'text-brand-green'); el.classList.add('border-transparent', 'text-brand-medium'); }
    });
    renderList();
};

window.openEditModal = (id) => {
    const e = expenses.find(exp => exp.id === id);
    if (!e) return;
    document.getElementById('edit-id').value = e.id;
    document.getElementById('edit-amount').value = e.amount;
    document.getElementById('edit-category').value = e.category;
    document.getElementById('edit-date').value = e.date;
    document.getElementById('edit-description').value = e.description || '';
    editModal.classList.remove('hidden');
    lucide.createIcons();
};

window.closeEditModal = () => {
    editModal.classList.add('hidden');
};
