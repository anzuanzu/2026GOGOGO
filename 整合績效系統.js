// 各分行業務目標數據
const branchTargets = {
    banqiao: {
        '張瓊月': 2000, '刁蕙鈺': 2000, '溫志剛': 2000, '周韻如': 2000,
        '許凱婷': 2000, '廖敏慧': 2000, '宋柏陞': 2000, '李宗杰': 2000,
        '吳采妍': 2000, '趙貞國': 200, '洪易佳': 200
    },
    huajiang: {
        '詹采榆': 1000, '劉家昇': 1000, '施雯晴': 1000,
        '黃柏飛': 1000, '曹馨勻': 1000, '徐小凡': 1000
    },
    xinban: {
        '璧菁': 3000, '麗鳳': 1000, '馨予': 1000, '淑芬': 1000,
        '靜芸': 1000, '品豪': 1000, '祺倫': 1000, '奕憲': 1000,
        '泓權': 1000, '至浩': 1000
    }
};

// 數據存儲
let branchData = {
    banqiao: { customers: [], salesTargets: branchTargets.banqiao },
    huajiang: { customers: [], salesTargets: branchTargets.huajiang },
    xinban: { customers: [], salesTargets: branchTargets.xinban }
};

const COLLECTION_NAME = 'customers_2026';

// 顯示提示訊息
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${isError ? '#e74c3c' : '#27ae60'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 從 Firestore 載入分行數據
async function loadBranchData(branchName) {
    try {
        console.log(`載入 ${branchName} 分行數據...`);

        if (!window.databases || !window.databases[branchName]) {
            throw new Error(`${branchName} 資料庫未初始化`);
        }

        const { collection, getDocs, query, orderBy } = window.firestoreActions;
        const db = window.databases[branchName];
        const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const customers = [];
        querySnapshot.forEach((doc) => {
            customers.push({ id: doc.id, ...doc.data() });
        });

        branchData[branchName].customers = customers;
        console.log(`${branchName} 分行載入 ${customers.length} 筆客戶資料`);

        return customers;
    } catch (error) {
        console.error(`載入 ${branchName} 分行數據時出錯:`, error);
        showToast(`載入 ${branchName} 分行數據失敗`, true);
        return [];
    }
}

// 載入所有分行數據
async function loadAllBranchData() {
    try {
        const promises = [
            loadBranchData('banqiao'),
            loadBranchData('huajiang'),
            loadBranchData('xinban')
        ];

        await Promise.all(promises);
        updateAllDisplays();
        updateLastUpdateTime();
        showToast('所有分行數據載入成功');
    } catch (error) {
        console.error('載入分行數據時出錯:', error);
        showToast('載入數據失敗', true);
    }
}

// 計算分行統計數據
function calculateBranchStats(branchName) {
    const { customers, salesTargets } = branchData[branchName];
    const totalTarget = Object.values(salesTargets).reduce((sum, target) => sum + target, 0);
    const totalAchieved = customers.reduce((sum, customer) => sum + customer.amount, 0);
    const totalRemaining = totalTarget - totalAchieved;
    const progressPercentage = totalTarget > 0 ? (totalAchieved / totalTarget * 100).toFixed(1) : 0;

    return {
        totalTarget,
        totalAchieved,
        totalRemaining,
        progressPercentage: parseFloat(progressPercentage)
    };
}

// 計算總體統計數據
function calculateGrandStats() {
    const banqiaoStats = calculateBranchStats('banqiao');
    const huajiangStats = calculateBranchStats('huajiang');
    const xinbanStats = calculateBranchStats('xinban');

    const grandTotalTarget = banqiaoStats.totalTarget + huajiangStats.totalTarget + xinbanStats.totalTarget;
    const grandTotalAchieved = banqiaoStats.totalAchieved + huajiangStats.totalAchieved + xinbanStats.totalAchieved;
    const grandTotalRemaining = grandTotalTarget - grandTotalAchieved;
    const grandProgressPercentage = grandTotalTarget > 0 ? (grandTotalAchieved / grandTotalTarget * 100).toFixed(1) : 0;

    return {
        grandTotalTarget,
        grandTotalAchieved,
        grandTotalRemaining,
        grandProgressPercentage: parseFloat(grandProgressPercentage),
        branches: {
            banqiao: banqiaoStats,
            huajiang: huajiangStats,
            xinban: xinbanStats
        }
    };
}

// 計算理專績效
function calculateRMStats(branchName) {
    const { customers, salesTargets } = branchData[branchName];
    const rmStats = [];

    Object.keys(salesTargets).forEach(rmName => {
        const target = salesTargets[rmName];
        const achieved = customers
            .filter(c => c.salesperson === rmName)
            .reduce((sum, c) => sum + c.amount, 0);
        const remaining = target - achieved;
        const progress = target > 0 ? (achieved / target * 100).toFixed(1) : 0;

        rmStats.push({
            name: rmName,
            branch: branchName,
            target,
            achieved,
            remaining,
            progress: parseFloat(progress)
        });
    });

    return rmStats;
}

// 更新總體統計顯示
function updateGrandStats() {
    const stats = calculateGrandStats();

    document.getElementById('grandTotalTarget').textContent = `${stats.grandTotalTarget.toLocaleString()}萬`;
    document.getElementById('grandTotalAchieved').textContent = `${stats.grandTotalAchieved.toLocaleString()}萬`;
    document.getElementById('grandTotalRemaining').textContent = `${stats.grandTotalRemaining.toLocaleString()}萬`;
    document.getElementById('grandTotalProgress').textContent = `${stats.grandProgressPercentage}%`;
}

// 更新分行卡片顯示
function updateBranchCards() {
    const stats = calculateGrandStats();

    // 更新板橋分行
    updateBranchCard('banqiao', stats.branches.banqiao);
    // 更新華江分行
    updateBranchCard('huajiang', stats.branches.huajiang);
    // 更新新板分行
    updateBranchCard('xinban', stats.branches.xinban);
}

function updateBranchCard(branchName, stats) {
    document.getElementById(`${branchName}-target`).textContent = `${stats.totalTarget.toLocaleString()}萬`;
    document.getElementById(`${branchName}-achieved`).textContent = `${stats.totalAchieved.toLocaleString()}萬`;
    document.getElementById(`${branchName}-progress`).textContent = `${stats.progressPercentage}%`;

    const progressBar = document.getElementById(`${branchName}-progress-bar`);
    progressBar.style.width = `${Math.min(stats.progressPercentage, 100)}%`;

    // 根據達成率設置進度條顏色
    if (stats.progressPercentage >= 100) {
        progressBar.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
    } else if (stats.progressPercentage >= 80) {
        progressBar.style.background = 'linear-gradient(90deg, #f39c12, #f1c40f)';
    } else if (stats.progressPercentage >= 50) {
        progressBar.style.background = 'linear-gradient(90deg, #3498db, #5dade2)';
    } else {
        progressBar.style.background = 'linear-gradient(90deg, #e74c3c, #ec7063)';
    }

    // 更新載入指示器
    const card = document.getElementById(`${branchName}-card`);
    const loadingIndicator = card.querySelector('.loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.textContent = '✓ 已載入';
        loadingIndicator.style.color = '#27ae60';
    }
}

// 更新理專績效排行榜
function updateRankingList() {
    const rankingType = document.getElementById('rankingType').value;
    const branchFilter = document.getElementById('branchFilter').value;

    // 收集所有理專數據
    let allRMStats = [];
    if (branchFilter === 'all') {
        allRMStats = [
            ...calculateRMStats('banqiao'),
            ...calculateRMStats('huajiang'),
            ...calculateRMStats('xinban')
        ];
    } else {
        allRMStats = calculateRMStats(branchFilter);
    }

    // 排序
    if (rankingType === 'amount') {
        allRMStats.sort((a, b) => b.achieved - a.achieved);
    } else {
        allRMStats.sort((a, b) => b.progress - a.progress);
    }

    // 取前10名
    const top10 = allRMStats.slice(0, 10);

    const rankingList = document.getElementById('rankingList');
    rankingList.innerHTML = '';

    const branchNameMap = {
        banqiao: '板橋',
        huajiang: '華江',
        xinban: '新板'
    };

    top10.forEach((rm, index) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'rank-item';

        let medalClass = '';
        let medalIcon = '';
        if (index === 0) {
            medalClass = 'gold';
            medalIcon = '<i class="fas fa-trophy"></i>';
        } else if (index === 1) {
            medalClass = 'silver';
            medalIcon = '<i class="fas fa-medal"></i>';
        } else if (index === 2) {
            medalClass = 'bronze';
            medalIcon = '<i class="fas fa-medal"></i>';
        } else {
            medalIcon = `<span class="rank-number">${index + 1}</span>`;
        }

        rankItem.innerHTML = `
            <div class="rank-badge ${medalClass}">
                ${medalIcon}
            </div>
            <div class="rank-info">
                <div class="rank-name">${rm.name}</div>
                <div class="rank-branch">${branchNameMap[rm.branch]}分行</div>
            </div>
            <div class="rank-stats">
                <div class="rank-stat">
                    <span class="rank-label">已達成</span>
                    <span class="rank-value">${rm.achieved.toLocaleString()}萬</span>
                </div>
                <div class="rank-stat">
                    <span class="rank-label">目標</span>
                    <span class="rank-value">${rm.target.toLocaleString()}萬</span>
                </div>
                <div class="rank-stat">
                    <span class="rank-label">達成率</span>
                    <span class="rank-value progress">${rm.progress}%</span>
                </div>
            </div>
            <div class="rank-progress">
                <div class="rank-progress-bar">
                    <div class="rank-progress-fill" style="width: ${Math.min(rm.progress, 100)}%"></div>
                </div>
            </div>
        `;

        rankingList.appendChild(rankItem);
    });
}

// 更新分行理專詳細績效
function updateBranchRMDetails(branchName) {
    const rmStats = calculateRMStats(branchName);
    const rmGrid = document.getElementById(`${branchName}-rm-grid`);
    rmGrid.innerHTML = '';

    // 按達成金額排序
    rmStats.sort((a, b) => b.achieved - a.achieved);

    rmStats.forEach(rm => {
        const rmCard = document.createElement('div');
        rmCard.className = 'rm-card';

        rmCard.innerHTML = `
            <div class="rm-name">${rm.name}</div>
            <div class="rm-stats-detail">
                <div class="rm-stat-item">
                    <span class="label">目標</span>
                    <span class="value">${rm.target.toLocaleString()}萬</span>
                </div>
                <div class="rm-stat-item">
                    <span class="label">已達成</span>
                    <span class="value achieved">${rm.achieved.toLocaleString()}萬</span>
                </div>
                <div class="rm-stat-item">
                    <span class="label">剩餘</span>
                    <span class="value">${rm.remaining.toLocaleString()}萬</span>
                </div>
                <div class="rm-stat-item">
                    <span class="label">達成率</span>
                    <span class="value progress">${rm.progress}%</span>
                </div>
            </div>
            <div class="rm-progress-bar">
                <div class="rm-progress-fill" style="width: ${Math.min(rm.progress, 100)}%"></div>
            </div>
        `;

        // 根據達成率設置進度條顏色
        const progressFill = rmCard.querySelector('.rm-progress-fill');
        if (rm.progress >= 100) {
            progressFill.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
        } else if (rm.progress >= 80) {
            progressFill.style.background = 'linear-gradient(90deg, #f39c12, #f1c40f)';
        } else if (rm.progress >= 50) {
            progressFill.style.background = 'linear-gradient(90deg, #3498db, #5dade2)';
        } else {
            progressFill.style.background = 'linear-gradient(90deg, #e74c3c, #ec7063)';
        }

        rmGrid.appendChild(rmCard);
    });
}

// 計算月度統計
function calculateMonthlyStats() {
    const months = ['2025-12', '2026-01', '2026-02'];
    const monthlyStats = {};

    months.forEach(month => {
        let totalAmount = 0;
        let financeAmount = 0;
        let insuranceAmount = 0;
        let branchAmounts = { banqiao: 0, huajiang: 0, xinban: 0 };

        ['banqiao', 'huajiang', 'xinban'].forEach(branchName => {
            const customers = branchData[branchName].customers.filter(c => c.orderMonth === month);
            const branchTotal = customers.reduce((sum, c) => sum + c.amount, 0);
            const finance = customers.filter(c => c.productType === '理財').reduce((sum, c) => sum + c.amount, 0);
            const insurance = customers.filter(c => c.productType === '保險').reduce((sum, c) => sum + c.amount, 0);

            totalAmount += branchTotal;
            financeAmount += finance;
            insuranceAmount += insurance;
            branchAmounts[branchName] = branchTotal;
        });

        monthlyStats[month] = {
            total: totalAmount,
            finance: financeAmount,
            insurance: insuranceAmount,
            branches: branchAmounts
        };
    });

    return monthlyStats;
}

// 更新月度統計顯示
function updateMonthlyStats() {
    const monthlyStats = calculateMonthlyStats();

    // 2025年12月
    document.getElementById('december-total').textContent = `${monthlyStats['2025-12'].total.toLocaleString()}萬`;
    document.getElementById('december-finance').textContent = `${monthlyStats['2025-12'].finance.toLocaleString()}萬`;
    document.getElementById('december-insurance').textContent = `${monthlyStats['2025-12'].insurance.toLocaleString()}萬`;
    document.getElementById('december-banqiao').textContent = `${monthlyStats['2025-12'].branches.banqiao.toLocaleString()}萬`;
    document.getElementById('december-huajiang').textContent = `${monthlyStats['2025-12'].branches.huajiang.toLocaleString()}萬`;
    document.getElementById('december-xinban').textContent = `${monthlyStats['2025-12'].branches.xinban.toLocaleString()}萬`;

    // 2026年1月
    document.getElementById('january-total').textContent = `${monthlyStats['2026-01'].total.toLocaleString()}萬`;
    document.getElementById('january-finance').textContent = `${monthlyStats['2026-01'].finance.toLocaleString()}萬`;
    document.getElementById('january-insurance').textContent = `${monthlyStats['2026-01'].insurance.toLocaleString()}萬`;
    document.getElementById('january-banqiao').textContent = `${monthlyStats['2026-01'].branches.banqiao.toLocaleString()}萬`;
    document.getElementById('january-huajiang').textContent = `${monthlyStats['2026-01'].branches.huajiang.toLocaleString()}萬`;
    document.getElementById('january-xinban').textContent = `${monthlyStats['2026-01'].branches.xinban.toLocaleString()}萬`;

    // 2026年2月
    document.getElementById('february-total').textContent = `${monthlyStats['2026-02'].total.toLocaleString()}萬`;
    document.getElementById('february-finance').textContent = `${monthlyStats['2026-02'].finance.toLocaleString()}萬`;
    document.getElementById('february-insurance').textContent = `${monthlyStats['2026-02'].insurance.toLocaleString()}萬`;
    document.getElementById('february-banqiao').textContent = `${monthlyStats['2026-02'].branches.banqiao.toLocaleString()}萬`;
    document.getElementById('february-huajiang').textContent = `${monthlyStats['2026-02'].branches.huajiang.toLocaleString()}萬`;
    document.getElementById('february-xinban').textContent = `${monthlyStats['2026-02'].branches.xinban.toLocaleString()}萬`;
}

// 更新最後更新時間
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('lastUpdate').textContent = `最後更新：${timeString}`;
}

// 更新所有顯示
function updateAllDisplays() {
    updateGrandStats();
    updateBranchCards();
    updateRankingList();
    updateBranchRMDetails('banqiao');
    updateBranchRMDetails('huajiang');
    updateBranchRMDetails('xinban');
    updateMonthlyStats();
}

// 切換分行標籤
function switchBranchTab(branchName) {
    // 移除所有 active 類
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.rm-tab-content').forEach(content => content.classList.remove('active'));

    // 添加 active 類到選中的標籤
    event.target.classList.add('active');
    document.getElementById(`${branchName}-rm-tab`).classList.add('active');
}

// 重新載入所有數據
async function reloadAllData() {
    showToast('正在重新載入所有分行數據...', false);
    await loadAllBranchData();
}

// 初始化頁面
async function initializePage() {
    console.log('開始初始化整合績效頁面...');

    // 監聽 Firebase 準備就緒事件
    window.addEventListener('firebaseReady', async () => {
        console.log('收到 Firebase 準備就緒事件');
        await loadAllBranchData();
    });

    // 如果 Firebase 已經準備好，直接載入數據
    if (window.databases && window.firestoreActions) {
        console.log('Firebase 已經準備就緒');
        await loadAllBranchData();
    } else {
        console.log('等待 Firebase 準備就緒...');
    }

    // 設置排行榜篩選器事件
    document.getElementById('rankingType').addEventListener('change', updateRankingList);
    document.getElementById('branchFilter').addEventListener('change', updateRankingList);

    console.log('頁面初始化完成');
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', initializePage);

// 導出函數供全域使用
window.switchBranchTab = switchBranchTab;
window.reloadAllData = reloadAllData;
