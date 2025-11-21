class HomePage {
    constructor() {
        this.userData = null;
        this.shopData = [];
        this.rankingData = [];
        this.itemMap = {};
        this.currentPurchaseItem = null;
        this.init();
    }

    async init() {
        await this.loadShopItems();
        await Promise.all([this.loadUserData(), this.loadRankings()]);
        
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
            this.rankingData = data.success ? (data.rankings || []) : [];
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

        this.updateElementText('total-points', total);
        this.updateElementText('current-points', current);
        this.updateElementText('shop-points', current);
    }

    updateElementText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
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
            display.innerHTML = `<div class="no-item">Chưa đeo danh hiệu</div>`;
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
                     onclick="homePage.selectItem('${item.id}')">
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
                <div class="item-card shop-item" onclick="homePage.handleBuyClick('${item.id}', '${item.name}', ${item.price}, ${isOwned})">
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
            <div class="rank-row user-rank">
                <span class="rank-col rank-number">${rankDisplay}</span>
                <span class="rank-col rank-name">Bạn (${currentUsername})</span>
                <span class="rank-col rank-title">
                    <span class="title-badge ${titleId}">${titleName}</span>
                </span>
                <span class="rank-col rank-points">${pointsDisplay}</span>
            </div>
        `;
    }

    switchTab(tabName) {
        // Hide all tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.add('hidden');
            pane.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab pane and activate button
        const pane = document.getElementById(tabName);
        const btn = document.querySelector(`[onclick*="switchTab('${tabName}')"]`);
        
        if (pane) {
            pane.classList.remove('hidden');
            pane.classList.add('active');
        }
        if (btn) btn.classList.add('active');
    }

    handleBuyClick(itemId, itemName, itemPrice, isOwned) {
        if (isOwned) {
            this.showModal('❌ Bạn đã sở hữu danh hiệu này rồi!', 'error');
            return;
        }

        const userPoints = parseInt(document.getElementById('current-points').textContent) || 0;
        if (userPoints < itemPrice) {
            this.showModal('❌ Bạn không đủ điểm để mua danh hiệu này!', 'error');
            return;
        }

        this.currentPurchaseItem = { id: itemId, name: itemName, price: itemPrice };
        this.showConfirmModal();
    }

    showConfirmModal() {
        if (!this.currentPurchaseItem) return;
        
        const modal = document.getElementById('confirm-modal');
        const modalDialog = modal.querySelector('.modal-dialog');
        const itemName = modal.querySelector('.modal-item-name');
        const itemPrice = modal.querySelector('.modal-item-price');
        
        if (modal && itemName && itemPrice) {
            itemName.textContent = this.currentPurchaseItem.name;
            itemPrice.textContent = `💰 ${this.currentPurchaseItem.price} điểm`;
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.add('show');
                modalDialog.style.transform = 'translateY(0)';
                modalDialog.style.opacity = '1';
            }, 10);
        }
    }

    closeConfirmModal() {
        const modal = document.getElementById('confirm-modal');
        const modalDialog = modal.querySelector('.modal-dialog');
        
        if (modal) {
            modal.classList.remove('show');
            modalDialog.style.transform = 'translateY(-20px)';
            modalDialog.style.opacity = '0';
            
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    }

    confirmPurchase() {
        if (!this.currentPurchaseItem) return;
        
        this.buyItem(this.currentPurchaseItem.id, this.currentPurchaseItem.name);
        this.closeConfirmModal();
    }

    async buyItem(itemId, itemName) {
        try {
            const response = await fetch('/api/shop/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId })
            });
            const data = await response.json();
            
            if (data.success) {
                this.showModal(`✨ Mua thành công "${itemName}"!`, 'success');
                setTimeout(() => location.reload(), 1800);
            } else {
                this.showModal('❌ ' + (data.error || 'Mua thất bại'), 'error');
            }
        } catch (err) {
            console.error('Buy error:', err);
            this.showModal('❌ Lỗi kết nối', 'error');
        }
    }

    async selectItem(itemId) {
        try {
            const response = await fetch('/api/inventory/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId })
            });
            const data = await response.json();
            
            if (data.success) {
                this.showModal('✨ Đổi danh hiệu thành công!', 'success');
                setTimeout(() => location.reload(), 1800);
            } else {
                this.showModal('❌ ' + (data.error || 'Đổi thất bại'), 'error');
            }
        } catch (err) {
            console.error('Select error:', err);
            this.showModal('❌ Lỗi kết nối', 'error');
        }
    }

    showModal(message, type = 'success') {
        const modal = document.getElementById('notification-modal');
        const modalIcon = modal.querySelector('.modal-icon');
        const modalMessage = modal.querySelector('.modal-message');
        
        if (modal && modalIcon && modalMessage) {
            modalIcon.textContent = type === 'success' ? '✅' : '❌';
            modalMessage.textContent = message;
            
            if (type === 'error') {
                modal.classList.add('error');
                modalIcon.style.animation = 'shakeIcon 0.6s ease';
            } else {
                modal.classList.remove('error');
                modalIcon.style.animation = 'bounceIcon 0.6s ease';
            }
            
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.add('show'), 10);
            
            setTimeout(() => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modalIcon.style.animation = '';
                }, 300);
            }, 2500);
        }
    }

    async SubmitAccountChanges() {
        const NewPassword = document.getElementById('NewPassword').value;
        const RepeatPassword = document.getElementById('RepeatPassword').value;
        const CurrentPassword = document.getElementById('CurrentPassword').value;
        
        if (!NewPassword || !RepeatPassword || !CurrentPassword) {
            this.showModal('❌ Vui lòng điền đầy đủ thông tin', 'error');
            return;
        }
        
        if (RepeatPassword !== NewPassword) {
            this.showModal('❌ Mật khẩu lặp lại không khớp', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/change_account_information', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "newpassword": NewPassword,
                    "repeatpassword": RepeatPassword,
                    "currentpassword": CurrentPassword
                })
            });
            const data = await response.json();
            
            if (data.success) {
                this.showModal(`✨ Đã cập nhật thông tin thành công!`, 'success');
                // Clear form
                document.getElementById('NewPassword').value = '';
                document.getElementById('RepeatPassword').value = '';
                document.getElementById('CurrentPassword').value = '';
            } else {
                this.showModal('❌ ' + (data.error || 'Cập nhật thông tin thất bại'), 'error');
            }
        } catch (err) {
            console.error('Change account information:', err);
            this.showModal('❌ Lỗi kết nối', 'error');
        }
    }
}

// Global functions for onclick handlers
// Global functions for onclick handlers
function switchTab(tabName) {
    // Kiểm tra homePage đã được khởi tạo chưa
    if (window.homePage && typeof window.homePage.switchTab === 'function') {
        window.homePage.switchTab(tabName);
    } else {
        // Fallback: xử lý tab cơ bản nếu homePage chưa sẵn sàng
        console.log('HomePage chưa sẵn sàng, sử dụng fallback tab switching');
        
        // Ẩn tất cả tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.add('hidden');
            pane.classList.remove('active');
        });
        
        // Bỏ active tất cả tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Hiển thị tab được chọn
        const pane = document.getElementById(tabName);
        const btn = document.querySelector(`[onclick*="switchTab('${tabName}')"]`);
        
        if (pane) {
            pane.classList.remove('hidden');
            pane.classList.add('active');
        }
        if (btn) btn.classList.add('active');
    }
}

function navigateToStudy() {
    window.location.href = '/learn';
}

function navigateToPractice() {
    window.location.href = '/practice';
}

function navigateToAdmin() {
    window.location.href = '/admin';
}

function logout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        window.location.href = '/logout';
    }
}

function closeConfirmModal() {
    homePage.closeConfirmModal();
}

function confirmPurchase() {
    homePage.confirmPurchase();
}

function SubmitAccountChanges() {
    homePage.SubmitAccountChanges();
}

// Initialize the application
let homePage;
document.addEventListener('DOMContentLoaded', () => {
    homePage = new HomePage();
});