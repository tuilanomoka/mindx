class HomePage {
    constructor() {
        this.userData = null;
        this.init();
    }

    async init() {
        await this.loadUserData();
        this.displayUserInfo();
        this.displaySelectedItem();
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/inventory');
            const data = await response.json();
            
            if (data.success) {
                this.userData = data;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('Không thể tải thông tin người dùng');
        }
    }

    displayUserInfo() {
        if (this.userData) {
            document.getElementById('total-points').textContent = this.userData.total_points;
            document.getElementById('current-points').textContent = this.userData.current_points;
        }
    }

    displaySelectedItem() {
        const displayElement = document.getElementById('selected-item-display');
        
        if (!this.userData) {
            displayElement.innerHTML = '<div class="error">Không thể tải thông tin</div>';
            return;
        }

        // Tìm item đang được chọn
        const selectedItem = this.userData.inventory.find(item => item.selected);
        
        if (selectedItem) {
            displayElement.innerHTML = `
                <div class="active-item">
                    <div class="item-badge">${selectedItem.name}</div>
                    <div class="item-description">Đã mua với ${selectedItem.price} điểm</div>
                </div>
            `;
        } else {
            displayElement.innerHTML = `
                <div class="no-item">
                    <div class="no-item-icon">🎯</div>
                    <div class="no-item-text">
                        <div class="no-item-title">Chưa có danh hiệu</div>
                        <div class="no-item-desc">Truy cập cửa hàng để mua danh hiệu đầu tiên!</div>
                    </div>
                    <button class="goto-shop-btn" onclick="navigateToShop()">
                        Đến cửa hàng
                    </button>
                </div>
            `;
        }
    }

    showError(message) {
        const displayElement = document.getElementById('selected-item-display');
        displayElement.innerHTML = `<div class="error">${message}</div>`;
    }
}

// Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', () => {
    new HomePage();
});