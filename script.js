const state = {
    tasks: [
        { id: 1, name: "Asset Depreciation Run (AFAB)", module: "FI-AA", status: "Pending" },
        { id: 2, name: "Foreign Currency Valuation", module: "FI-GL", status: "Pending" }
    ],
    checklist: [
        { id: 'check1', label: "Bank Reconciliation", done: false },
        { id: 'check2', label: "Inventory Verified", done: false },
        { id: 'check3', label: "Tax Accruals Validated", done: false },
        { id: 'check4', label: "Intercompany Squared", done: false }
    ],
    financials: { cash: 25000, ar: 15000, ppe: 50000, accumulatedDep: 0, revenue: 45000, cogs: 20000, admin: 5000, depExpense: 0 }
};

let pnlChart = null;

function initChart() {
    const canvas = document.getElementById('pnlChart');
    if (!canvas) return;
    
    // Destroy existing chart to prevent errors during re-renders
    if (pnlChart !== null) { pnlChart.destroy(); }

    const ctx = canvas.getContext('2d');
    pnlChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Revenue', 'Expenses', 'Net'],
            datasets: [{
                data: [45000, 25000, 20000],
                backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true, grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } },
                x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } }
            }
        }
    });
}

function updateFinancialsUI() {
    const f = state.financials;
    const totalExp = f.cogs + f.admin + f.depExpense;
    const netIncome = f.revenue - totalExp;
    const totalAssets = (f.cash + f.ar + f.ppe) - f.accumulatedDep;

    // DOM Updates
    if(document.getElementById('report-cash')) document.getElementById('report-cash').innerText = `$${f.cash.toLocaleString()}`;
    if(document.getElementById('report-dep')) document.getElementById('report-dep').innerText = `-$${f.accumulatedDep.toLocaleString()}`;
    if(document.getElementById('report-total-assets')) document.getElementById('report-total-assets').innerText = `$${totalAssets.toLocaleString()}`;
    if(document.getElementById('report-net-income')) document.getElementById('report-net-income').innerText = `$${netIncome.toLocaleString()}`;

    const depRow = document.getElementById('pnl-dep-row');
    if (f.depExpense > 0 && depRow) {
        depRow.classList.remove('hidden');
        document.getElementById('report-dep-expense').innerText = `-$${f.depExpense.toLocaleString()}`;
    }

    // Chart Refresh
    if (pnlChart) {
        pnlChart.data.datasets[0].data = [f.revenue, totalExp, netIncome];
        pnlChart.update();
    }
}

// Ensure executeJob calls the update
function executeJob(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task || task.status !== 'Pending') return;

    task.status = 'Running';
    logActivity(`KERNEL: Executing Job ${task.id}...`, 'text-blue-400');
    renderTasks();

    setTimeout(() => {
        task.status = 'Completed';
        const name = task.name.toLowerCase();
        
        if (name.includes("depreciation")) {
            state.financials.accumulatedDep += 2500;
            state.financials.depExpense += 2500;
            logActivity("FI-AA: Depreciation calculated & posted.", "text-amber-400");
        }
        
        updateFinancialsUI();
        renderTasks();
        logActivity(`SUCCESS: Job ${task.id} finalized.`, 'text-emerald-400');
    }, 1500);
}

// Standard helper functions
function showSection(id) {
    document.querySelectorAll('.content-view').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${id}-section`).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-blue-600', 'text-white'));
    document.getElementById(`nav-${id}`).classList.add('active', 'bg-blue-600', 'text-white');
    document.getElementById('page-title').innerText = id === 'cockpit' ? 'Closing Cockpit' : 'Financial Statements';
}

function renderTasks() {
    const list = document.getElementById('task-list');
    list.innerHTML = state.tasks.map(t => `
        <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition">
            <td class="p-6 font-bold text-slate-700">${t.name}</td>
            <td class="p-6 text-[10px] font-black text-slate-400 uppercase">${t.module || 'FI'}</td>
            <td class="p-6">
                <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${t.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                    ${t.status}
                </span>
            </td>
            <td class="p-6 text-right">
                ${t.status === 'Pending' ? `<button onclick="executeJob(${t.id})" class="bg-slate-100 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all">Execute</button>` : '<i class="fas fa-check-circle text-emerald-500"></i>'}
            </td>
        </tr>
    `).join('');
    
    document.getElementById('stat-total').innerText = state.tasks.length;
    document.getElementById('stat-done').innerText = state.tasks.filter(t => t.status === 'Completed').length;
    document.getElementById('stat-running').innerText = state.tasks.filter(t => t.status === 'Running').length;
}

// Checklist logic
function renderChecklist() {
    const container = document.getElementById('checklist-items');
    container.innerHTML = state.checklist.map(item => `
        <label class="flex items-center space-x-3 bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer hover:bg-white hover:shadow-md transition-all">
            <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleCheck('${item.id}')" class="w-4 h-4 text-blue-600 rounded">
            <span class="text-[10px] font-black text-slate-600 uppercase tracking-tighter">${item.label}</span>
        </label>
    `).join('');
}

function toggleCheck(id) {
    const item = state.checklist.find(i => i.id === id);
    item.done = !item.done;
    updateReadiness();
    logActivity(`AUDIT: Verification ${id} updated.`);
}

function updateReadiness() {
    const percent = Math.round((state.checklist.filter(i => i.done).length / state.checklist.length) * 100);
    const el = document.getElementById('readiness-score');
    if(el) {
        el.innerText = `${percent}%`;
        el.className = percent === 100 ? "text-xl font-black px-6 py-2 rounded-full bg-emerald-500 text-white shadow-lg" : "text-xl font-black px-6 py-2 rounded-full bg-slate-100 text-slate-400";
    }
    const prog = document.getElementById('top-progress');
    if(prog) prog.style.width = `${percent}%`;
}

function logActivity(msg, color = 'text-emerald-400') {
    const log = document.getElementById('audit-log');
    if(log) log.innerHTML = `<p class="${color}">> [${new Date().toLocaleTimeString()}] ${msg}</p>` + log.innerHTML;
}

function openModal() { document.getElementById('task-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('task-modal').classList.add('hidden'); }
function addNewTask() {
    const name = document.getElementById('new-task-name').value;
    if (!name) return;
    state.tasks.push({ id: Date.now(), name, module: document.getElementById('new-task-module').value, status: 'Pending' });
    renderTasks(); closeModal();
}

// Boot up sequence
window.onload = () => {
    initChart();
    renderTasks();
    renderChecklist();
    updateFinancialsUI();
};