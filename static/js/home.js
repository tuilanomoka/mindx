class HomePage {
    constructor() {
        this.userData = null;
        this.shopData = [];
        this.rankingData = [];
        this.itemMap = {}; 
        this.init();
    }

    async init() {
        
        await this.loadShopItems();
        
        
        await Promise.all([
            this.loadUserData(),
            this.loadRankings()
        ]);

        
        this.displayUserInfo();
        this.displaySelectedItem();
        this.renderInventory();
        this.renderShop();
        this.renderRankings();
    }

    async loadShopItems() {
        try {
            const response = await fetch('/static/json/shop.json'); 
            const data = await response.json();
            if (data.items) {
                this.shopData = data.items;
                
                this.shopData.forEach(item => {
                    this.itemMap[item.id] = item.name;
                });
            }
        } catch (error) {
            console.error('Lỗi tải shop.json:', error);
        }
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/inventory');
            const data = await response.json();
            if (data.success) {
                this.userData = data;
            }
        } catch (error) {
            console.error('Lỗi tải user data:', error);
        }
    }

    async loadRankings() {
        try {
            const response = await fetch('/api/rankings');
            const data = await response.json();
            
            if (data.success || Array.isArray(data.rankings)) {
                this.rankingData = data.rankings || [];
            }
        } catch (error) {
            console.error('Lỗi tải rankings:', error);
        }
    }

    
    getTitleName(itemId) {
        if (!itemId || itemId === 'none' || itemId === 'null') return 'Chưa có danh hiệu';
        return this.itemMap[itemId] || 'Danh hiệu ẩn';
    }

    displayUserInfo() {
        if (!this.userData) return;
        
        
        
        
        const total = this.userData.total_points ?? this.userData.totalpoint ?? 0;
        const current = this.userData.current_points ?? this.userData.currentpoint ?? 0;

        const totalEl = document.getElementById('total-points');
        const currentEl = document.getElementById('current-points');
        const shopEl = document.getElementById('shop-points');

        if (totalEl) totalEl.textContent = total;
        if (currentEl) currentEl.textContent = current;
        if (shopEl) shopEl.textContent = current;
    }

    displaySelectedItem() {
        const display = document.getElementById('selected-item-display');
        if (!display) return;

        if (!this.userData || !this.userData.inventory) {
            display.innerHTML = `<div class="no-item">Loading...</div>`;
            return;
        }

        
        const selected = this.userData.inventory.find(item => item.selected === true || item.selected === 1);

        if (selected) {
            
            const realName = this.getTitleName(selected.id);
            
            display.innerHTML = `
                <div class="active-item">
                    <div>✨ <span class="item-badge-inline">${realName}</span></div>
                </div>
            `;
        } else {
            display.innerHTML = `
                <div class="no-item">Chưa đeo danh hiệu</div>
            `;
        }
    }

    renderInventory() {
        const grid = document.getElementById('inventory-grid');
        const empty = document.getElementById('empty-inventory');
        const count = document.getElementById('inv-count');
        
        
        const inventory = this.userData?.inventory || [];

        if (inventory.length === 0) {
            if (grid) grid.innerHTML = '';
            if (empty) empty.style.display = 'flex';
            if (count) count.textContent = '0 danh hiệu';
            return;
        }

        if (empty) empty.style.display = 'none';
        if (count) count.textContent = `${inventory.length} danh hiệu`;
        
        if (grid) {
            grid.innerHTML = inventory.map(item => {
                
                const displayName = this.getTitleName(item.id);
                return `
                <div class="item-card inventory-item ${item.selected ? 'selected' : ''}" 
                     onclick="selectItem('${item.id}')">
                    <div class="item-icon">👑</div>
                    <div class="item-name">${displayName}</div>
                    ${item.selected ? '<div class="item-badge-small">✓</div>' : ''}
                </div>
            `}).join('');
        }
    }

    renderShop() {
        const grid = document.getElementById('items-grid');
        if (!grid || !this.shopData) return;

        const userPoints = this.userData?.current_points ?? 0;
        const inventoryIds = (this.userData?.inventory || []).map(i => i.id);

        grid.innerHTML = this.shopData.map(item => {
            const isOwned = inventoryIds.includes(item.id);
            const canBuy = userPoints >= item.price && !isOwned;
            
            let statusClass = isOwned ? 'owned-status' : (canBuy ? 'available-status' : 'disabled-status');
            let statusText = isOwned ? '✓ Đã sở hữu' : (canBuy ? '💰 Mua ngay' : '✗ Thiếu điểm');

            return `
                <div class="item-card shop-item" onclick="handleBuyClick('${item.id}', '${item.name}', ${item.price}, ${isOwned})">
                    <div class="item-icon">🛍️</div>
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">${item.price} điểm</div>
                    <span class="buy-status ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');
    }

    renderRankings() {
        const rankList = document.getElementById('rankList');
        if (!rankList || !this.rankingData) return;

        
        rankList.innerHTML = this.rankingData.map((item, index) => {
            let medalClass = '';
            let medal = '';
            if (index === 0) { medalClass = 'rank-first'; medal = '🥇'; }
            else if (index === 1) { medalClass = 'rank-second'; medal = '🥈'; }
            else if (index === 2) { medalClass = 'rank-third'; medal = '🥉'; }

            const rankNum = index + 1;
            
            
            const point = item.totalpoint !== undefined ? item.totalpoint : (item.points || 0);
            const itemId = item.selecteditem || item.title_id || 'none';
            const titleName = this.getTitleName(itemId);

            return `
                <div class="rank-row ${medalClass}">
                    <span class="rank-col rank-number">${medal || '#' + rankNum}</span>
                    <span class="rank-col rank-name">${item.username}</span>
                    <span class="rank-col rank-title">
                        <span class="title-badge ${itemId}">${titleName}</span>
                    </span>
                    <span class="rank-col rank-points">${point}</span>
                </div>
            `;
        }).join('');

        
        this.updateUserFixedRank();
    }

    updateUserFixedRank() {
        const userRankBox = document.getElementById('user-rank-box');
        if (!userRankBox) return;

        let currentUsername = this.userData?.username;
        if (!currentUsername) {
            const nameEl = document.querySelector('.username-text');
            if (nameEl) currentUsername = nameEl.innerText.trim();
        }

        if (!currentUsername) {
            console.warn("Không tìm thấy username để hiển thị rank");
            return;
        }


        const myIndex = this.rankingData.findIndex(r => r.username === currentUsername);
        
        let rankDisplay = '-';      
        let pointsDisplay = 0;    
        let titleId = 'none';     

        if (myIndex !== -1) {
          
            const rankData = this.rankingData[myIndex];
            rankDisplay = '#' + (myIndex + 1);
            pointsDisplay = rankData.totalpoint ?? rankData.points ?? 0;
            titleId = rankData.selecteditem ?? rankData.title_id ?? 'none';
        } else {
           
            rankDisplay = 'Bạn'; 
            
    
            pointsDisplay = this.userData?.total_points ?? 0;

            const selectedItem = this.userData?.inventory?.find(i => i.selected === true || i.selected === 1);
            titleId = selectedItem ? selectedItem.id : 'none';
        }

       
        const titleName = this.getTitleName(titleId);

        userRankBox.innerHTML = `
            <div class="rank-row user-rank active-user-row">
                <span class="rank-col rank-number">${rankDisplay}</span>
                <span class="rank-col rank-name">Bạn (${currentUsername})</span>
                <span class="rank-col rank-title">
                    <span class="title-badge ${titleId}">${titleName}</span>
                </span>
                <span class="rank-col rank-points">${pointsDisplay}</span>
            </div>
        `;
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const pane = document.getElementById(tabName);
    const btn = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    
    if (pane) pane.classList.add('active');
    if (btn) btn.classList.add('active');
}

function showModal(message, type = 'success') {
    const existing = document.querySelector('.notification-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = `notification-modal ${type}`;
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-icon">${type === 'success' ? '✅' : '❌'}</span>
            <p class="modal-message">${message}</p>
        </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    setTimeout(() => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }, 2500);
}

function showConfirmModal(message, itemName, itemPrice, itemId) {
    const existing = document.querySelector('.confirm-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeConfirmModal()"></div>
        <div class="modal-dialog">
            <div class="modal-header">
                <span class="modal-title-icon">🛍️</span>
                <h3 class="modal-title">Xác nhận mua danh hiệu</h3>
                <button class="modal-close" onclick="closeConfirmModal()">✕</button>
            </div>
            <div class="modal-body">
                <p class="modal-item-name">${itemName}</p>
                <p class="modal-item-price">💰 ${itemPrice} điểm</p>
                <p class="modal-question">Bạn có chắc muốn mua danh hiệu này?</p>
            </div>
            <div class="modal-footer">
                <button class="modal-btn modal-btn-cancel" onclick="closeConfirmModal()">Hủy</button>
                <button class="modal-btn modal-btn-confirm" onclick="buyItem('${itemId}', '${itemName}'); closeConfirmModal();">Xác nhận</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeConfirmModal() {
    const modal = document.querySelector('.confirm-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function handleBuyClick(itemId, itemName, itemPrice, isOwned) {
    if (isOwned) {
        showModal('❌ Bạn đã sở hữu danh hiệu này rồi!', 'error');
        return;
    }

    const userPoints = parseInt(document.getElementById('current-points').textContent) || 0;
    if (userPoints < itemPrice) {
        showModal('❌ Bạn không đủ điểm để mua danh hiệu này!', 'error');
        return;
    }

    showConfirmModal('Xác nhận mua danh hiệu', itemName, itemPrice, itemId);
}

function buyItem(itemId, itemName) {
    fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showModal(`✨ Mua thành công "${itemName}"!`, 'success');
            setTimeout(() => location.reload(), 1800);
        } else {
            showModal('❌ ' + (data.error || 'Mua thất bại'), 'error');
        }
    })
    .catch(err => {
        console.error('Buy error:', err);
        showModal('❌ Lỗi kết nối', 'error');
    });
}

function selectItem(itemId) {
    fetch('/api/inventory/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showModal('✨ Đổi danh hiệu thành công!', 'success');
            setTimeout(() => location.reload(), 1800);
        } else {
            showModal('❌ ' + (data.error || 'Đổi thất bại'), 'error');
        }
    })
    .catch(err => {
        console.error('Select error:', err);
        showModal('❌ Lỗi kết nối', 'error');
    });
}

function navigateToStudy() {
    window.location.href = '/learn';
}

function navigateToPractice() {
    window.location.href = '/practice';
}

function logout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        window.location.href = '/logout';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HomePage();
});
