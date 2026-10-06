const ASSET_CLASSES = {
    cash: { name: 'เงินสด & เงินฝากสำรอง', icon: 'fa-money-bill-wave', color: '#10b981', lightColor: '#d1fae5' },
    funds: { name: 'กองทุนรวม & หุ้นปันผล', icon: 'fa-chart-pie', color: '#3b82f6', lightColor: '#dbeafe' },
    gold: { name: 'ทองคำ & สินทรัพย์มั่นคง', icon: 'fa-coins', color: '#f59e0b', lightColor: '#fef3c7' },
    business: { name: 'ทรัพย์สินเพื่อการค้า & กิจการ', icon: 'fa-shop', color: '#8b5cf6', lightColor: '#ede9fe' },
    crypto: { name: 'สินทรัพย์ทางเลือก / ดิจิทัล', icon: 'fa-cube', color: '#ec4899', lightColor: '#fce7f3' }
};

let profiles = JSON.parse(localStorage.getItem('wt_profiles')) || [
    { id: 'prof_default', name: 'พอร์ตส่วนตัวของฉัน' }
];
let activeProfileId = localStorage.getItem('wt_active_profile_id') || profiles[0].id;

if (!profiles.find(p => p.id === activeProfileId)) {
    activeProfileId = profiles[0].id;
}

const getProfileData = () => {
    const dataStr = localStorage.getItem(`wt_profile_data_${activeProfileId}`);
    if (dataStr) {
        try { return JSON.parse(dataStr); } catch(e) { }
    }
    return {
        holdings: [],
        sources: { shop: 0, personal: 0, emergency: 0 },
        transactions: [],
        targets: { cash: 20, funds: 35, gold: 25, business: 15, crypto: 5 }
    };
};

let currentData = getProfileData();
let holdings = currentData.holdings;
let capitalSources = currentData.sources;
let transactions = currentData.transactions;
let targetAllocation = currentData.targets;

let currentUsdThbRate = 35.8;
let allocationChartInstance = null;
let growthChartInstance = null;
let gainLossChartInstance = null;

const formatMoney = (num) => '฿' + Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatCompact = (num) => '฿' + Number(num || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });

function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function saveProfileData() {
    currentData = { holdings, sources: capitalSources, transactions, targets: targetAllocation };
    localStorage.setItem(`wt_profile_data_${activeProfileId}`, JSON.stringify(currentData));
    localStorage.setItem('wt_profiles', JSON.stringify(profiles));
    localStorage.setItem('wt_active_profile_id', activeProfileId);
}

function loadProfile(profileId) {
    activeProfileId = profileId;
    currentData = getProfileData();
    holdings = currentData.holdings;
    capitalSources = currentData.sources;
    transactions = currentData.transactions;
    targetAllocation = currentData.targets;
    localStorage.setItem('wt_active_profile_id', activeProfileId);

    const activeProf = profiles.find(p => p.id === activeProfileId);
    document.getElementById('activeProfileName').textContent = activeProf ? activeProf.name : 'พอร์ตหลัก';

    closeProfileModal();
    populateAssetDropdowns();
    renderDashboard();
    renderHistoryTable();
    showToast(`สลับไปยังโปรไฟล์: ${activeProf ? activeProf.name : ''}`);
}

function openProfileModal() {
    renderProfileList();
    document.getElementById('profileModal').classList.remove('hidden');
}
function closeProfileModal() {
    document.getElementById('profileModal').classList.add('hidden');
}

function renderProfileList() {
    const container = document.getElementById('profileListContainer');
    if (!container) return;
    container.innerHTML = '';

    profiles.forEach(p => {
        const isActive = p.id === activeProfileId;
        const pData = JSON.parse(localStorage.getItem(`wt_profile_data_${p.id}`)) || { holdings: [] };
        const count = pData.holdings.length;

        const div = document.createElement('div');
        div.className = `p-3 rounded-2xl border flex justify-between items-center transition ${
            isActive 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold' 
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`;
        div.innerHTML = `
            <div class="flex items-center gap-3 cursor-pointer flex-1" onclick="loadProfile('${p.id}')">
                <div class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs">
                    <i class="fa-solid fa-wallet"></i>
                </div>
                <div>
                    <p class="text-xs font-bold">${p.name} ${isActive ? '<span class="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded ml-1">ใช้งานอยู่</span>' : ''}</p>
                    <p class="text-[10px] text-slate-400 font-normal">${count} สินทรัพย์ในพอร์ต</p>
                </div>
            </div>
            <div class="flex items-center gap-1.5">
                <button onclick="renameProfile('${p.id}')" title="เปลี่ยนชื่อ" class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center text-xs"><i class="fa-solid fa-pen"></i></button>
                ${profiles.length > 1 ? `<button onclick="deleteProfile('${p.id}')" title="ลบพอร์ต" class="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center text-xs"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
        `;
        container.appendChild(div);
    });

    const activeProf = profiles.find(p => p.id === activeProfileId);
    if (activeProf) document.getElementById('activeProfileName').textContent = activeProf.name;
}

function createNewProfile() {
    const input = document.getElementById('newProfileNameInput');
    const name = input.value.trim();
    if (!name) { alert('กรุณากรอกชื่อโปรไฟล์'); return; }

    const newId = 'prof_' + Date.now();
    profiles.push({ id: newId, name });
    localStorage.setItem(`wt_profile_data_${newId}`, JSON.stringify({ holdings: [], sources: {shop:0,personal:0,emergency:0}, transactions: [], targets: {cash:20,funds:35,gold:25,business:15,crypto:5} }));
    
    input.value = '';
    saveProfileData();
    loadProfile(newId);
}

function renameProfile(id) {
    const prof = profiles.find(p => p.id === id);
    if (!prof) return;
    const newName = prompt('เปลี่ยนชื่อโปรไฟล์:', prof.name);
    if (newName && newName.trim()) {
        prof.name = newName.trim();
        saveProfileData();
        renderProfileList();
        showToast('เปลี่ยนชื่อโปรไฟล์สำเร็จ');
    }
}

function deleteProfile(id) {
    if (profiles.length <= 1) { alert('ต้องมีอย่างน้อย 1 โปรไฟล์'); return; }
    if (confirm('ต้องการลบโปรไฟล์นี้พร้อมข้อมูลทั้งหมดใช่หรือไม่?')) {
        profiles = profiles.filter(p => p.id !== id);
        localStorage.removeItem(`wt_profile_data_${id}`);
        if (activeProfileId === id) activeProfileId = profiles[0].id;
        saveProfileData();
        loadProfile(activeProfileId);
        showToast('ลบโปรไฟล์เรียบร้อย');
    }
}

async function fetchLiveUsdThbRate() {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
            const data = await res.json();
            if (data && data.rates && data.rates.THB) {
                currentUsdThbRate = parseFloat(data.rates.THB);
                const rateTag = document.getElementById('liveRateStatus');
                if (rateTag) rateTag.textContent = `USD/THB: ฿${currentUsdThbRate.toFixed(2)}`;
            }
        }
    } catch (err) { console.warn('อัตราแลกเปลี่ยนใช้ค่าประมาณการ:', err); }
    return currentUsdThbRate;
}

async function fetchForeignFundPrice(ticker) {
    try {
        const sym = ticker.toLowerCase().trim();
        const url = `https://stooq.com/q/l/?s=${sym}.us&f=sd2t2ohlcv&h&e=csv`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const text = await res.text();
        const lines = text.trim().split('\n');
        if (lines.length >= 2) {
            const cols = lines[1].split(',');
            const closePriceUSD = parseFloat(cols[6]);
            if (!isNaN(closePriceUSD) && closePriceUSD > 0) {
                return { usd: closePriceUSD, thb: closePriceUSD * currentUsdThbRate };
            }
        }
    } catch (err) { console.warn(`ดึงราคากองทุนต่างประเทศ ${ticker} ไม่สำเร็จ:`, err); }
    return null;
}

async function fetchCryptoPriceFromBinance(symbol) {
    try {
        const cleanSym = symbol.toUpperCase().replace(/[^A-Z]/g, '');
        let pair = `${cleanSym}USDT`;
        if (cleanSym.endsWith('USDT')) pair = cleanSym;
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
        if (!res.ok) return null;
        const data = await res.json();
        const priceUSD = parseFloat(data.price);
        return { usd: priceUSD, thb: priceUSD * currentUsdThbRate };
    } catch (err) { return null; }
}

async function fetchGoldPriceThaiEstimate() {
    try {
        const res = await fetch('https://api.coincap.io/v2/rates/gold');
        if (res.ok) {
            const data = await res.json();
            const ozPriceUSD = parseFloat(data.data.rateUsd);
            const thaiGoldBahtPrice = (ozPriceUSD / 31.1035) * 15.244 * 0.965 * currentUsdThbRate;
            return Math.round(thaiGoldBahtPrice);
        }
    } catch (err) { console.warn('ดึงราคาทองคำไม่สำเร็จ:', err); }
    return null;
}

async function fetchRealtimeMarketPrices() {
    const icon = document.getElementById('liveFetchIcon');
    if (icon) icon.className = 'fa-solid fa-spinner fa-spin text-amber-300 text-xs';
    showToast('กำลังดึงราคาตลาดสดสำหรับโปรไฟล์นี้...');

    await fetchLiveUsdThbRate();
    const liveGoldPrice = await fetchGoldPriceThaiEstimate();

    let updatedCount = 0;
    for (const item of holdings) {
        const nameUpper = item.name.toUpperCase();
        if (item.assetClass === 'funds') {
            const fundTickers = ['SPY', 'IVV', 'VOO', 'QQQ', 'VT', 'VTI', 'SMH', 'XLK', 'SCHD', 'ARKK', 'EEM'];
            let matchedTicker = null;
            for (const tick of fundTickers) {
                if (nameUpper.includes(tick)) { matchedTicker = tick; break; }
            }
            if (matchedTicker) {
                const fundData = await fetchForeignFundPrice(matchedTicker);
                if (fundData) {
                    item.currentPrice = Math.round(fundData.thb * 100) / 100;
                    item.totalMarket = (item.quantity || 0) * item.currentPrice;
                    updatedCount++;
                }
            }
        } else if (item.assetClass === 'crypto') {
            const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'NEAR'];
            let matchedSymbol = null;
            for (const sym of cryptoSymbols) {
                if (nameUpper.includes(sym)) { matchedSymbol = sym; break; }
            }
            if (matchedSymbol) {
                const cData = await fetchCryptoPriceFromBinance(matchedSymbol);
                if (cData) {
                    item.currentPrice = Math.round(cData.thb * 100) / 100;
                    item.totalMarket = (item.quantity || 0) * item.currentPrice;
                    updatedCount++;
                }
            }
        } else if (item.assetClass === 'gold' && liveGoldPrice) {
            item.currentPrice = liveGoldPrice;
            item.totalMarket = (item.quantity || 0) * item.currentPrice;
            updatedCount++;
        }
    }

    saveProfileData();
    renderDashboard();
    renderHoldingsList();

    const timeNow = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tag = document.getElementById('lastUpdatedTag');
    if (tag) tag.textContent = `(สด ณ ${timeNow})`;

    if (icon) icon.className = 'fa-solid fa-bolt text-amber-300 text-xs';
    showToast(`อัปเดตราคาสำเร็จ ${updatedCount} รายการ`);
}

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('wt_dark_mode') === 'true') {
        document.documentElement.classList.add('dark');
        const icon = document.getElementById('darkModeIcon');
        if (icon) icon.className = 'fa-solid fa-sun text-sm text-amber-400';
    }

    document.getElementById('txDate').value = getTodayString();
    document.getElementById('depDate').value = getTodayString();

    const activeProf = profiles.find(p => p.id === activeProfileId);
    if (activeProf) document.getElementById('activeProfileName').textContent = activeProf.name;

    populateAssetDropdowns();
    renderDashboard();
    renderHoldingsList();
    renderHistoryTable();
    fetchLiveUsdThbRate();
});

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('wt_dark_mode', isDark);
    const icon = document.getElementById('darkModeIcon');
    if (icon) icon.className = isDark ? 'fa-solid fa-sun text-sm text-amber-400' : 'fa-solid fa-moon text-sm text-amber-400';
    renderCharts();
}

function showToast(message) {
    const toast = document.getElementById('alertToast');
    const msgEl = document.getElementById('alertToastMessage');
    if (!toast || !msgEl) return;
    msgEl.textContent = message;
    toast.classList.remove('-translate-y-24', 'opacity-0');
    setTimeout(() => { toast.classList.add('-translate-y-24', 'opacity-0'); }, 3000);
}

function switchTab(tabId) {
    ['dashboard', 'assets', 'history'].forEach(id => {
        const el = document.getElementById(`tab-${id}`);
        const mobileBtn = document.getElementById(`nav-btn-${id}`);
        const desktopBtn = document.getElementById(`desktop-nav-${id}`);

        if (id === tabId) {
            if (el) el.classList.remove('hidden');
            if (mobileBtn) mobileBtn.className = 'flex flex-col items-center flex-1 py-1 text-emerald-600 dark:text-emerald-400';
            if (desktopBtn) desktopBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-sm';
        } else {
            if (el) el.classList.add('hidden');
            if (mobileBtn) mobileBtn.className = 'flex flex-col items-center flex-1 py-1 text-slate-400';
            if (desktopBtn) desktopBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 text-slate-300 hover:text-white';
        }
    });

    if (tabId === 'dashboard') renderDashboard();
    else if (tabId === 'assets') populateAssetDropdowns();
    else if (tabId === 'history') renderHistoryTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function calculatePortfolioTotals() {
    let totalMarket = 0;
    let totalCost = 0;
    let totalDividends = 0;
    const classTotals = { cash: 0, funds: 0, gold: 0, business: 0, crypto: 0 };
    const classCosts = { cash: 0, funds: 0, gold: 0, business: 0, crypto: 0 };

    holdings.forEach(item => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.avgCost) || 0;
        const price = Number(item.currentPrice) || 0;
        const div = Number(item.dividends) || 0;

        const itemCost = qty * cost;
        const itemMarket = qty * price;

        totalCost += itemCost;
        totalMarket += itemMarket;
        totalDividends += div;

        if (classTotals[item.assetClass] !== undefined) {
            classTotals[item.assetClass] += itemMarket;
            classCosts[item.assetClass] += itemCost;
        }
    });

    const unrealizedPL = totalMarket - totalCost;
    const unrealizedPLPct = totalCost > 0 ? ((unrealizedPL / totalCost) * 100) : 0;

    return { totalMarket, totalCost, unrealizedPL, unrealizedPLPct, totalDividends, classTotals, classCosts };
}

function renderDashboard() {
    const data = calculatePortfolioTotals();

    document.getElementById('kpiNetWorth').textContent = formatMoney(data.totalMarket);
    const netChangeEl = document.getElementById('kpiNetWorthChange');
    netChangeEl.textContent = `${data.unrealizedPLPct >= 0 ? '+' : ''}${data.unrealizedPLPct.toFixed(2)}%`;
    netChangeEl.className = data.unrealizedPLPct >= 0 ? 'font-bold text-emerald-200' : 'font-bold text-rose-300';

    document.getElementById('kpiPrincipal').textContent = formatMoney(data.totalCost);

    const glEl = document.getElementById('kpiGainLoss');
    const glPctEl = document.getElementById('kpiGainLossPct');
    glEl.textContent = `${data.unrealizedPL >= 0 ? '+' : ''}${formatMoney(data.unrealizedPL)}`;
    glPctEl.textContent = `${data.unrealizedPLPct >= 0 ? '+' : ''}${data.unrealizedPLPct.toFixed(2)}%`;
    if (data.unrealizedPL >= 0) {
        glEl.className = 'text-base sm:text-2xl font-bold mt-1.5 sm:mt-2 text-emerald-600 dark:text-emerald-400 truncate';
        glPctEl.className = 'text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-2';
    } else {
        glEl.className = 'text-base sm:text-2xl font-bold mt-1.5 sm:mt-2 text-rose-500 dark:text-rose-400 truncate';
        glPctEl.className = 'text-[10px] sm:text-[11px] font-bold text-rose-500 dark:text-rose-400 mt-1 sm:mt-2';
    }

    document.getElementById('kpiDividends').textContent = formatMoney(data.totalDividends);

    renderCapitalSourceBreakdown();
    renderHoldingsList();
    renderCharts(data);
}

function renderCapitalSourceBreakdown() {
    const shop = capitalSources.shop || 0;
    const personal = capitalSources.personal || 0;
    const emergency = capitalSources.emergency || 0;
    const sum = shop + personal + emergency;

    const shopPct = sum > 0 ? (shop / sum) * 100 : 0;
    const persPct = sum > 0 ? (personal / sum) * 100 : 0;
    const emerPct = sum > 0 ? (emergency / sum) * 100 : 0;

    document.getElementById('srcShopAmount').textContent = formatCompact(shop);
    document.getElementById('srcShopPct').textContent = `${shopPct.toFixed(1)}%`;
    document.getElementById('srcPersonalAmount').textContent = formatCompact(personal);
    document.getElementById('srcPersonalPct').textContent = `${persPct.toFixed(1)}%`;
    document.getElementById('srcEmergencyAmount').textContent = formatCompact(emergency);
    document.getElementById('srcEmergencyPct').textContent = `${emerPct.toFixed(1)}%`;

    const bar = document.getElementById('sourceProgressBar');
    if (bar && bar.children.length === 3) {
        bar.children[0].style.width = `${shopPct}%`;
        bar.children[1].style.width = `${persPct}%`;
        bar.children[2].style.width = `${emerPct}%`;
    }
}

function renderCharts(calcData) {
    const data = calcData || calculatePortfolioTotals();
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const donutCtx = document.getElementById('allocationDonutChart');
    if (donutCtx) {
        const labels = Object.keys(ASSET_CLASSES).map(k => ASSET_CLASSES[k].name);
        const values = Object.keys(ASSET_CLASSES).map(k => data.classTotals[k] || 0);
        const colors = Object.keys(ASSET_CLASSES).map(k => ASSET_CLASSES[k].color);
        const isAllZero = values.every(v => v === 0);

        if (allocationChartInstance) allocationChartInstance.destroy();
        allocationChartInstance = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: isAllZero ? ['ยังไม่มีสินทรัพย์'] : labels,
                datasets: [{ data: isAllZero ? [1] : values, backgroundColor: isAllZero ? ['#94a3b8'] : colors, borderWidth: 2, borderColor: isDark ? '#0f172a' : '#ffffff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false } } }
        });

        const legendBox = document.getElementById('allocationLegend');
        if (legendBox) {
            legendBox.innerHTML = '';
            if (isAllZero) {
                legendBox.innerHTML = '<p class="text-center text-slate-400 text-xs py-2">ยังไม่มีสินทรัพย์ในพอร์ต กดปุ่ม "เพิ่มสินทรัพย์" เพื่อเริ่มต้น</p>';
            } else {
                Object.keys(ASSET_CLASSES).forEach(k => {
                    const val = data.classTotals[k] || 0;
                    const pct = data.totalMarket > 0 ? ((val / data.totalMarket) * 100).toFixed(1) : '0.0';
                    const cfg = ASSET_CLASSES[k];
                    const div = document.createElement('div');
                    div.className = 'flex justify-between items-center text-slate-600 dark:text-slate-300';
                    div.innerHTML = `<div class="flex items-center gap-2 truncate"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${cfg.color}"></span><span class="truncate">${cfg.name}</span></div><span class="font-bold shrink-0">${formatCompact(val)} (${pct}%)</span>`;
                    legendBox.appendChild(div);
                });
            }
        }
    }

    const lineCtx = document.getElementById('growthLineChart');
    if (lineCtx) {
        const datePoints = {};
        let runningNetWorth = 0;
        const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedTx.forEach(t => {
            const d = t.date || getTodayString();
            if (!datePoints[d]) datePoints[d] = 0;
            if (t.type === 'buy' || t.type === 'deposit') runningNetWorth += Number(t.amount) || 0;
            else if (t.type === 'sell') runningNetWorth = Math.max(0, runningNetWorth - (Number(t.amount) || 0));
            datePoints[d] = runningNetWorth;
        });

        let labels = Object.keys(datePoints);
        let trendData = Object.values(datePoints);
        if (labels.length === 0) { labels = ['เริ่มต้น', 'ปัจจุบัน']; trendData = [0, data.totalMarket]; }

        if (growthChartInstance) growthChartInstance.destroy();
        growthChartInstance = new Chart(lineCtx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'มูลค่าเงินต้นทุนสะสม', data: trendData, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)', fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 3 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor, font: { family: 'Prompt', size: 10 } }, grid: { color: gridColor } }, y: { ticks: { color: textColor, font: { family: 'Prompt', size: 10 } }, grid: { color: gridColor } } } }
        });
    }

    const barCtx = document.getElementById('gainLossBarChart');
    if (barCtx) {
        const assetLabels = []; const gainLossAmounts = []; const bgColors = [];
        holdings.forEach(item => {
            const cost = (Number(item.quantity) || 0) * (Number(item.avgCost) || 0);
            const market = (Number(item.quantity) || 0) * (Number(item.currentPrice) || 0);
            const pl = market - cost;
            assetLabels.push(item.name); gainLossAmounts.push(pl); bgColors.push(pl >= 0 ? '#10b981' : '#f43f5e');
        });

        if (gainLossChartInstance) gainLossChartInstance.destroy();
        gainLossChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: { labels: assetLabels.length ? assetLabels : ['ยังไม่มีรายการ'], datasets: [{ label: 'กำไร / ขาดทุน (บาท)', data: gainLossAmounts.length ? gainLossAmounts : [0], backgroundColor: bgColors.length ? bgColors : ['#94a3b8'], borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor, font: { family: 'Prompt', size: 10 } }, grid: { color: gridColor } }, y: { ticks: { color: textColor, font: { family: 'Prompt', size: 10 } }, grid: { color: gridColor } } } }
        });
    }
}

function renderHoldingsList() {
    const container = document.getElementById('holdingsListContainer');
    if (!container) return;
    container.innerHTML = '';

    if (holdings.length === 0) {
        container.innerHTML = `<div class="py-12 text-center text-xs text-slate-400 space-y-2"><i class="fa-solid fa-folder-open text-2xl text-slate-300 dark:text-slate-600 block"></i><p>พอร์ตของคุณยังว่างเปล่า เริ่มต้นสร้างความมั่งคั่งได้ทันที</p><button onclick="switchTab('assets')" class="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold shadow-sm inline-block mt-1">+ เพิ่มสินทรัพย์แรกของคุณ</button></div>`;
        return;
    }

    holdings.forEach(item => {
        const cfg = ASSET_CLASSES[item.assetClass] || ASSET_CLASSES.cash;
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.avgCost) || 0;
        const price = Number(item.currentPrice) || 0;
        const div = Number(item.dividends) || 0;

        const totalCost = qty * cost;
        const totalMarket = qty * price;
        const pl = totalMarket - totalCost;
        const plPct = totalCost > 0 ? (pl / totalCost) * 100 : 0;

        const nameUpper = item.name.toUpperCase();
        const isAutoFund = item.assetClass === 'funds' && ['SPY','IVV','VOO','QQQ','VT','VTI','SMH','XLK'].some(t => nameUpper.includes(t));
        const isCrypto = item.assetClass === 'crypto';
        const isGold = item.assetClass === 'gold';

        const card = document.createElement('div');
        card.className = 'p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3';
        card.innerHTML = `
            <div class="flex items-center gap-3 w-full sm:w-auto">
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style="background-color: ${cfg.lightColor}; color: ${cfg.color}"><i class="fa-solid ${cfg.icon} text-sm"></i></div>
                <div class="truncate flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <h4 class="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">${item.name}</h4>
                        <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase" style="background-color: ${cfg.lightColor}; color: ${cfg.color}">${cfg.name}</span>
                         ${(isAutoFund || isCrypto || isGold) ? '<span class="text-[8px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-500 font-bold border border-amber-400/30">Auto Live</span>' : ''}
                    </div>
                    <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">${qty.toLocaleString()} หน่วย @ ทุน ฿${cost.toLocaleString()} | ตลาด ฿${price.toLocaleString()} ${div > 0 ? ` • <span class="text-amber-500 font-semibold">ปันผล ฿${div.toLocaleString()}</span>` : ''}</p>
                </div>
            </div>
            <div class="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                <div class="text-left sm:text-right">
                    <span class="text-xs sm:text-sm font-bold block text-slate-800 dark:text-slate-100">${formatMoney(totalMarket)}</span>
                    <span class="text-[10px] font-bold ${pl >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${pl >= 0 ? '+' : ''}${formatMoney(pl)} (${pl >= 0 ? '+' : ''}${plPct.toFixed(1)}%)</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button onclick="editAsset('${item.id}')" title="แก้ไข" class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center hover:bg-slate-300 transition"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    <button onclick="deleteAsset('${item.id}')" title="ลบ" class="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center hover:bg-rose-200 transition"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function handleAssetClassChange() {
    const ac = document.getElementById('assetClass').value;
    const lblQty = document.getElementById('lblQuantity');
    const lblAvg = document.getElementById('lblAvgCost');
    const lblPrice = document.getElementById('lblCurrentPrice');

    if (ac === 'cash') { lblQty.textContent = 'จำนวน (ใส่ 1)'; lblAvg.textContent = 'ยอดเงินต้น (บาท)'; lblPrice.textContent = 'ยอดคงเหลือปัจจุบัน (บาท)'; }
    else if (ac === 'gold') { lblQty.textContent = 'น้ำหนักทอง (บาททอง)'; lblAvg.textContent = 'ราคาทุนซื้อต่อบาท (บาท)'; lblPrice.textContent = 'ราคาตลาดปัจจุบันต่อบาท (บาท)'; }
    else if (ac === 'funds') { lblQty.textContent = 'จำนวนหน่วยลงทุน (Units)'; lblAvg.textContent = 'ต้นทุนเฉลี่ย / NAV ซื้อ (บาท)'; lblPrice.textContent = 'ราคา NAV / ตลาดปัจจุบัน (บาท)'; }
    else { lblQty.textContent = 'จำนวนหน่วย / ปริมาณ'; lblAvg.textContent = 'ต้นทุนเฉลี่ยต่อหน่วย (บาท)'; lblPrice.textContent = 'ราคาประเมินตลาดปัจจุบัน (บาท)'; }
}

function calculateAssetTotals() {
    const qty = parseFloat(document.getElementById('assetQuantity').value) || 0;
    const cost = parseFloat(document.getElementById('assetAvgCost').value) || 0;
    const price = parseFloat(document.getElementById('assetCurrentPrice').value) || 0;
    document.getElementById('assetTotalCost').value = (qty * cost).toFixed(2);
    document.getElementById('assetTotalMarket').value = (qty * price).toFixed(2);
}

function saveAsset(e) {
    e.preventDefault();
    const editId = document.getElementById('assetEditId').value;
    const assetClass = document.getElementById('assetClass').value;
    const name = document.getElementById('assetName').value.trim();
    const quantity = parseFloat(document.getElementById('assetQuantity').value) || 0;
    const avgCost = parseFloat(document.getElementById('assetAvgCost').value) || 0;
    const currentPrice = parseFloat(document.getElementById('assetCurrentPrice').value) || 0;
    const dividends = parseFloat(document.getElementById('assetDividends').value) || 0;
    const note = document.getElementById('assetNote').value.trim();

    const totalCost = quantity * avgCost;
    const totalMarket = quantity * currentPrice;

    if (editId !== "-1") {
        const idx = holdings.findIndex(h => h.id === editId);
        if (idx !== -1) {
            holdings[idx] = { ...holdings[idx], assetClass, name, quantity, avgCost, currentPrice, totalCost, totalMarket, dividends, note };
            showToast('อัปเดตสินทรัพย์เรียบร้อยแล้ว');
        }
    } else {
        holdings.push({ id: 'ast_' + Date.now(), assetClass, name, quantity, avgCost, currentPrice, totalCost, totalMarket, dividends, note });
        showToast('เพิ่มสินทรัพย์ใหม่เข้าพอร์ตสำเร็จ');
    }

    saveProfileData();
    resetAssetForm();
    populateAssetDropdowns();
    renderDashboard();
}

function editAsset(id) {
    const item = holdings.find(h => h.id === id);
    if (!item) return;

    switchTab('assets');
    document.getElementById('assetEditId').value = item.id;
    document.getElementById('assetClass').value = item.assetClass;
    handleAssetClassChange();

    document.getElementById('assetName').value = item.name;
    document.getElementById('assetQuantity').value = item.quantity;
    document.getElementById('assetAvgCost').value = item.avgCost;
    document.getElementById('assetCurrentPrice').value = item.currentPrice;
    document.getElementById('assetDividends').value = item.dividends || 0;
    document.getElementById('assetNote').value = item.note || '';

    calculateAssetTotals();
    document.getElementById('assetFormTitle').innerHTML = '<i class="fa-solid fa-pen text-amber-500"></i> แก้ไขสินทรัพย์';
    document.getElementById('btnSaveAsset').textContent = 'บันทึกการแก้ไขสินทรัพย์';
    document.getElementById('btnCancelEditAsset').classList.remove('hidden');
}

function resetAssetForm() {
    document.getElementById('assetEditId').value = "-1";
    document.getElementById('assetForm').reset();
    handleAssetClassChange();
    document.getElementById('assetTotalCost').value = '';
    document.getElementById('assetTotalMarket').value = '';
    document.getElementById('assetFormTitle').innerHTML = '<i class="fa-solid fa-plus-circle text-emerald-600"></i> เพิ่มสินทรัพย์ใหม่เข้าพอร์ต';
    document.getElementById('btnSaveAsset').textContent = 'บันทึกสินทรัพย์';
    document.getElementById('btnCancelEditAsset').classList.add('hidden');
}

function deleteAsset(id) {
    const item = holdings.find(h => h.id === id);
    if (!item) return;
    if (confirm(`ต้องการลบสินทรัพย์ "${item.name}" ออกจากพอร์ตใช่หรือไม่?`)) {
        holdings = holdings.filter(h => h.id !== id);
        transactions.forEach(t => { if (t.assetId === id) t.assetName = `${item.name} (ลบแล้ว)`; });
        saveProfileData();
        populateAssetDropdowns();
        renderDashboard();
        renderHistoryTable();
        showToast('ลบสินทรัพย์เรียบร้อยแล้ว');
    }
}

function populateAssetDropdowns() {
    const select = document.getElementById('txAssetSelect');
    if (!select) return;
    select.innerHTML = '';

    if (holdings.length === 0) {
        select.innerHTML = '<option value="">ยังไม่มีสินทรัพย์ในพอร์ต (กรุณาเพิ่มก่อน)</option>';
        return;
    }

    holdings.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.id;
        opt.textContent = `${h.name} (${ASSET_CLASSES[h.assetClass]?.name || ''})`;
        select.appendChild(opt);
    });
    handleTxAssetSelected();
}

function handleTxAssetSelected() {
    const assetId = document.getElementById('txAssetSelect').value;
    const asset = holdings.find(h => h.id === assetId);
    if (asset) {
        const priceInput = document.getElementById('txPricePerUnit');
        if (priceInput && (!priceInput.value || parseFloat(priceInput.value) === 0)) {
            priceInput.value = asset.currentPrice || asset.avgCost || 0;
            calculateTxTotal();
        }
    }
}

function calculateTxTotal() {
    const units = parseFloat(document.getElementById('txUnits').value) || 0;
    const price = parseFloat(document.getElementById('txPricePerUnit').value) || 0;
    const totalEl = document.getElementById('txTotalAmount');
    if (totalEl) totalEl.value = (units * price).toFixed(2);
}

function handleTxTypeChange() {
    const type = document.getElementById('txType').value;
    const boxUnits = document.getElementById('boxTxUnits');
    const boxPrice = document.getElementById('boxTxPrice');
    const boxSource = document.getElementById('boxTxSource');

    if (type === 'dividend') {
        boxUnits.classList.add('hidden'); boxPrice.classList.add('hidden'); boxSource.classList.add('hidden');
    } else {
        boxUnits.classList.remove('hidden'); boxPrice.classList.remove('hidden'); boxSource.classList.remove('hidden');
    }
}

function saveTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('txType').value;
    const assetId = document.getElementById('txAssetSelect').value;
    const date = document.getElementById('txDate').value || getTodayString();
    const units = parseFloat(document.getElementById('txUnits').value) || 0;
    const pricePerUnit = parseFloat(document.getElementById('txPricePerUnit').value) || 0;
    const amount = parseFloat(document.getElementById('txTotalAmount').value) || 0;
    const source = document.getElementById('txSource').value;
    const note = document.getElementById('txNote').value.trim();

    const asset = holdings.find(h => h.id === assetId);
    if (!asset && type !== 'deposit') { alert('กรุณาเลือกสินทรัพย์ที่ถูกต้อง'); return; }
    if (type === 'sell' && asset && units > (asset.quantity || 0)) { alert(`ไม่สามารถขายเกินจำนวนที่มีได้ (ถืออยู่ ${asset.quantity} หน่วย)`); return; }

    transactions.unshift({ id: 'tx_' + Date.now(), date, type, assetId, assetName: asset ? asset.name : 'เงินฝาก', units, pricePerUnit, amount, source, note });

    if (asset) {
        if (type === 'buy') {
            const currentCost = (asset.quantity || 0) * (asset.avgCost || 0);
            const newTotalUnits = (asset.quantity || 0) + units;
            const newTotalCost = currentCost + amount;
            asset.quantity = newTotalUnits;
            asset.avgCost = newTotalUnits > 0 ? (newTotalCost / newTotalUnits) : 0;
            asset.currentPrice = pricePerUnit > 0 ? pricePerUnit : asset.currentPrice;
            asset.totalCost = newTotalCost;
            asset.totalMarket = newTotalUnits * asset.currentPrice;

            if (capitalSources[source] !== undefined) capitalSources[source] += amount;
        } else if (type === 'sell') {
            const newQuantity = Math.max(0, (asset.quantity || 0) - units);
            asset.quantity = newQuantity;
            asset.totalCost = newQuantity * (asset.avgCost || 0);
            asset.totalMarket = newQuantity * (asset.currentPrice || 0);
        } else if (type === 'dividend') {
            asset.dividends = (asset.dividends || 0) + amount;
        }
    }

    saveProfileData();
    document.getElementById('txForm').reset();
    document.getElementById('txDate').value = getTodayString();
    renderDashboard();
    renderHistoryTable();
    showToast('บันทึกรายการเคลื่อนไหวสำเร็จ');
}

function openDepositModal() { document.getElementById('depDate').value = getTodayString(); document.getElementById('depositModal').classList.remove('hidden'); }
function closeDepositModal() { document.getElementById('depositModal').classList.add('hidden'); }

function saveDeposit(e) {
    e.preventDefault();
    const source = document.getElementById('depSource').value;
    const targetClass = document.getElementById('depTargetClass').value;
    const amount = parseFloat(document.getElementById('depAmount').value) || 0;
    const date = document.getElementById('depDate').value || getTodayString();
    const note = document.getElementById('depNote').value.trim();

    if (amount <= 0) { alert('กรุณากรอกจำนวนเงินมากกว่า 0'); return; }

    if (capitalSources[source] !== undefined) capitalSources[source] += amount;
    else capitalSources[source] = amount;

    let targetAsset = holdings.find(h => h.assetClass === targetClass);
    if (!targetAsset) {
        targetAsset = { id: 'ast_' + Date.now(), assetClass: targetClass, name: `เงินสดสำรอง (${ASSET_CLASSES[targetClass].name})`, quantity: 1, avgCost: amount, currentPrice: amount, totalCost: amount, totalMarket: amount, dividends: 0, note: note || 'เติมทุน' };
        holdings.push(targetAsset);
    } else {
        targetAsset.quantity = 1;
        targetAsset.avgCost = (targetAsset.avgCost || 0) + amount;
        targetAsset.currentPrice = (targetAsset.currentPrice || 0) + amount;
        targetAsset.totalCost = targetAsset.avgCost;
        targetAsset.totalMarket = targetAsset.currentPrice;
    }

    transactions.unshift({ id: 'tx_dep_' + Date.now(), date, type: 'deposit', assetId: targetAsset.id, assetName: targetAsset.name, units: 1, pricePerUnit: amount, amount, source, note: note ? `โอนเติมพอร์ต: ${note}` : 'โอนเติมพอร์ต' });

    saveProfileData();
    closeDepositModal();
    populateAssetDropdowns();
    renderDashboard();
    renderHistoryTable();
    showToast(`เติมเงินทุน ฿${amount.toLocaleString()} เรียบร้อยแล้ว`);
}

function openRebalanceModal() { calculateRebalance(); document.getElementById('rebalanceModal').classList.remove('hidden'); }
function closeRebalanceModal() { document.getElementById('rebalanceModal').classList.add('hidden'); }

function calculateRebalance() {
    const injection = parseFloat(document.getElementById('rebalanceInjection').value) || 0;
    const data = calculatePortfolioTotals();
    const totalProjected = data.totalMarket + injection;

    const tbody = document.getElementById('rebalanceTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let sumTarget = 0;
    Object.keys(ASSET_CLASSES).forEach(k => {
        const cfg = ASSET_CLASSES[k];
        const currentVal = data.classTotals[k] || 0;
        const currentPct = data.totalMarket > 0 ? (currentVal / data.totalMarket) * 100 : 0;
        const targetPct = targetAllocation[k] || 20;
        sumTarget += targetPct;

        const targetVal = totalProjected * (targetPct / 100);
        const diff = targetVal - currentVal;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-xs';
        tr.innerHTML = `
            <td class="py-2.5 flex items-center gap-1.5 font-bold truncate"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${cfg.color}"></span><span class="truncate">${cfg.name}</span></td>
            <td class="py-2.5 text-right font-medium">${formatCompact(currentVal)}</td>
            <td class="py-2.5 text-center text-slate-400 font-semibold">${currentPct.toFixed(1)}%</td>
            <td class="py-2.5 text-center"><input type="number" min="0" max="100" value="${targetPct}" onchange="updateTargetVal('${k}', this.value)" class="w-12 sm:w-14 text-center bg-slate-100 dark:bg-slate-800 border rounded-lg py-1 text-xs font-bold outline-none"></td>
            <td class="py-2.5 text-right font-bold ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${diff >= 0 ? '+' : ''}${formatCompact(diff)}<span class="text-[9px] block text-slate-400 font-normal">${diff >= 0 ? 'เติมเพิ่ม' : 'ขายลด'}</span></td>
        `;
        tbody.appendChild(tr);
    });
    document.getElementById('rebalanceTargetSum').textContent = `รวมเป้าหมาย: ${sumTarget}%`;
}

function updateTargetVal(k, val) { targetAllocation[k] = parseFloat(val) || 0; calculateRebalance(); }
function saveTargetAllocation() { saveProfileData(); showToast('บันทึกเป้าหมายสัดส่วนพอร์ตแล้ว'); closeRebalanceModal(); }

function openPriceUpdateModal() {
    const container = document.getElementById('priceUpdateListContainer');
    if (!container) return;
    container.innerHTML = '';

    if (holdings.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 text-xs py-4">ยังไม่มีสินทรัพย์ในพอร์ต</p>';
        document.getElementById('priceModal').classList.remove('hidden');
        return;
    }

    holdings.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs gap-2';
        div.innerHTML = `<div class="truncate flex-1"><h5 class="font-bold text-slate-800 dark:text-slate-100 truncate">${item.name}</h5><p class="text-[10px] text-slate-400">ทุนเดิม @ ฿${Number(item.avgCost).toLocaleString()}</p></div><div class="flex items-center gap-2 shrink-0"><input type="number" step="any" min="0" data-id="${item.id}" value="${item.currentPrice}" class="price-input w-24 sm:w-28 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-right font-bold text-emerald-600 outline-none"></div>`;
        container.appendChild(div);
    });
    document.getElementById('priceModal').classList.remove('hidden');
}
function closePriceUpdateModal() { document.getElementById('priceModal').classList.add('hidden'); }

function saveAllMarketPrices() {
    const inputs = document.querySelectorAll('.price-input');
    inputs.forEach(inp => {
        const id = inp.getAttribute('data-id');
        const newPrice = parseFloat(inp.value) || 0;
        const asset = holdings.find(h => h.id === id);
        if (asset) { asset.currentPrice = newPrice; asset.totalMarket = (asset.quantity || 0) * newPrice; }
    });
    saveProfileData();
    closePriceUpdateModal();
    renderDashboard();
    showToast('อัปเดตราคาตลาดสำเร็จ');
}

function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    const empty = document.getElementById('historyEmptyState');
    const search = (document.getElementById('historySearch')?.value || '').toLowerCase();
    const filterType = document.getElementById('historyFilterType')?.value || 'all';

    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = transactions.filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (search && !(t.assetName || '').toLowerCase().includes(search) && !(t.note || '').toLowerCase().includes(search)) return false;
        return true;
    });

    if (filtered.length === 0) { if (empty) empty.classList.remove('hidden'); return; }
    if (empty) empty.classList.add('hidden');

    filtered.forEach(t => {
        let badgeClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400';
        let typeName = 'ซื้อเพิ่ม';
        if (t.type === 'sell') { badgeClass = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'; typeName = 'ขายทำกำไร'; }
        else if (t.type === 'dividend') { badgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'; typeName = 'รับปันผล'; }
        else if (t.type === 'deposit') { badgeClass = 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'; typeName = 'เติมเงินทุน'; }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-xs';
        tr.innerHTML = `<td class="p-3 text-slate-400 whitespace-nowrap">${t.date}</td><td class="p-3 whitespace-nowrap"><span class="px-2 py-0.5 rounded-full font-bold text-[10px] ${badgeClass}">${typeName}</span></td><td class="p-3 font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px] sm:max-w-none">${t.assetName || '-'}</td><td class="p-3 text-right">${t.units > 0 ? t.units.toLocaleString() : '-'}</td><td class="p-3 text-right font-bold ${t.type === 'sell' || t.type === 'dividend' ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100'} whitespace-nowrap">${formatMoney(t.amount)}</td><td class="p-3 text-slate-500 dark:text-slate-400 truncate max-w-[150px] sm:max-w-xs">${t.note || '-'}</td><td class="p-3 text-center"><button onclick="deleteTransaction('${t.id}')" title="ลบ" class="w-6 h-6 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 transition"><i class="fa-solid fa-trash text-[10px]"></i></button></td>`;
        tbody.appendChild(tr);
    });
}

function deleteTransaction(id) {
    if (confirm('ต้องการลบประวัติรายการนี้ใช่หรือไม่?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveProfileData();
        renderHistoryTable();
        renderCharts();
        showToast('ลบรายการสำเร็จ');
    }
}

function clearHistory() {
    if (confirm('ต้องการล้างประวัติธุรกรรมทั้งหมดในโปรไฟล์นี้ใช่หรือไม่?')) {
        transactions = [];
        saveProfileData();
        renderHistoryTable();
        renderCharts();
        showToast('ล้างประวัติเรียบร้อย');
    }
}

function openSettingsModal() { document.getElementById('settingsModal').classList.remove('hidden'); }
function closeSettingsModal() { document.getElementById('settingsModal').classList.add('hidden'); }

function clearCurrentProfileData() {
    const activeProf = profiles.find(p => p.id === activeProfileId);
    if (confirm(`ยืนยันล้างข้อมูลพอร์ตของโปรไฟล์ "${activeProf ? activeProf.name : ''}" ทั้งหมด? ข้อมูลจะกลับเป็น 0 ฿`)) {
        holdings = []; capitalSources = { shop: 0, personal: 0, emergency: 0 }; transactions = [];
        saveProfileData();
        closeSettingsModal();
        populateAssetDropdowns();
        renderDashboard();
        renderHistoryTable();
        showToast('ล้างข้อมูลโปรไฟล์สำเร็จ');
    }
}

function exportWealthExcel() {
    if (typeof XLSX === 'undefined') { alert('ไม่สามารถโหลดไลบรารี XLSX ได้'); return; }
    const data = calculatePortfolioTotals();
    const todayStr = getTodayString();
    const activeProf = profiles.find(p => p.id === activeProfileId);

    const sheet1Rows = [
        [`รายงานพอร์ตความมั่งคั่งสุทธิ - โปรไฟล์: ${activeProf ? activeProf.name : ''}`, '', '', '', '', ''],
        [`วันที่จัดทำ: ${todayStr}`, '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['สรุปภาพรวมความมั่งคั่ง', '', '', '', '', ''],
        ['มูลค่าความมั่งคั่งสุทธิรวม (Net Worth)', data.totalMarket, 'บาท', '', '', ''],
        ['เงินต้นทุนลงทุนรวม (Total Principal)', data.totalCost, 'บาท', '', '', ''],
        ['กำไร/ขาดทุนที่ยังไม่รับรู้ (Unrealized P/L)', data.unrealizedPL, 'บาท', `(${data.unrealizedPLPct.toFixed(2)}%)`, '', ''],
        ['เงินปันผลสะสม', data.totalDividends, 'บาท', '', '', ''],
        ['', '', '', '', '', ''],
        ['รายละเอียดสินทรัพย์แต่ละรายการ', '', '', '', '', ''],
        ['คลาส', 'ชื่อสินทรัพย์', 'จำนวนหน่วย', 'ต้นทุนเฉลี่ย', 'ราคาตลาด', 'เงินต้นรวม', 'มูลค่าตลาดรวม', 'กำไร/ขาดทุน (฿)', '% ผลตอบแทน', 'ปันผล', 'หมายเหตุ']
    ];

    holdings.forEach(item => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.avgCost) || 0;
        const price = Number(item.currentPrice) || 0;
        const div = Number(item.dividends) || 0;
        const totalCost = qty * cost; const totalMarket = qty * price;
        const pl = totalMarket - totalCost; const plPct = totalCost > 0 ? (pl / totalCost) * 100 : 0;
        sheet1Rows.push([ASSET_CLASSES[item.assetClass]?.name || item.assetClass, item.name, qty, cost, price, totalCost, totalMarket, pl, `${plPct.toFixed(2)}%`, div, item.note || '']);
    });

    const sheet2Rows = [['ประวัติรายการลงทุน', '', '', '', '', '', ''], [`วันที่: ${todayStr}`, '', '', '', '', '', ''], ['', '', '', '', '', '', ''], ['วันที่', 'ประเภท', 'สินทรัพย์', 'จำนวน', 'มูลค่า (฿)', 'แหล่งเงิน/หมายเหตุ']];
    transactions.forEach(t => { sheet2Rows.push([t.date, t.type, t.assetName, t.units || 0, t.amount || 0, `${t.source || ''} ${t.note ? `(${t.note})` : ''}`]); });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
    XLSX.utils.book_append_sheet(wb, ws1, 'งบความมั่งคั่ง');
    XLSX.utils.book_append_sheet(wb, ws2, 'ประวัติธุรกรรม');
    XLSX.writeFile(wb, `Wealth_Report_${activeProf ? activeProf.name : 'Portfolio'}_${todayStr}.xlsx`);
    showToast('ส่งออก Excel สำเร็จ');
}

function exportJSONBackup() {
    const fullData = { profiles, activeProfileId, allData: localStorage.getItem(`wt_profile_data_${activeProfileId}`) };
    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Wealth_Backup_${getTodayString()}.json`;
    link.click();
    showToast('ดาวน์โหลด JSON Backup สำเร็จ');
}

function importDataFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            if (parsed.profiles) profiles = parsed.profiles;
            if (parsed.activeProfileId) activeProfileId = parsed.activeProfileId;
            if (parsed.allData) localStorage.setItem(`wt_profile_data_${activeProfileId}`, parsed.allData);
            saveProfileData();
            loadProfile(activeProfileId);
            closeSettingsModal();
            showToast('นำเข้าข้อมูลสำเร็จ');
        } catch(err) { alert('ไฟล์ไม่ถูกต้อง'); }
    };
    reader.readAsText(file);
}
