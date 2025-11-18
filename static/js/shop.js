class Shop {
    constructor() {
        this.items = [];
        this.currentPoints = 0;
        this.init();
    }

    async init() {
        await this.loadUserBalance();
        await this.loadShopItems();
        this.renderItems();
    }

    async loadUserBalance() {
        try {
            const response = await fetch('/api/inventory');
            const data = await response.json();
            
            if (data.success) {
                this.currentPoints = data.current_points;
                document.getElementById('current-points').textContent = this.currentPoints;
            }
        } catch (error) {
            console.error('Error loading user balance:', error);
        }
    }

    async loadShopItems() {
        try {
            const response = await fetch('/api/shop/items');
            const data = await response.json();
            
            if (data.success) {
                this.items = data.items;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error loading shop items:', error);
            this.showError('Không thể tải danh sách items');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    renderItems() {
        const grid = document.getElementById('items-grid');
        grid.innerHTML = '';

        this.items.forEach(item => {
            const itemElement = this.createItemElement(item);
            grid.appendChild(itemElement);
        });
    }

    createItemElement(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        
        const canAfford = this.currentPoints >= item.price;
        const priceClass = canAfford ? 'price affordable' : 'price expensive';
        
        itemDiv.innerHTML = `
            <div class="item-icon">🏆</div>
            <div class="item-name">${item.name}</div>
            <div class="${priceClass}">${item.price} điểm</div>
            <button class="buy-btn ${canAfford ? '' : 'disabled'}" 
                    onclick="shop.buyItem('${item.id}')"
                    ${!canAfford ? 'disabled' : ''}>
                ${canAfford ? 'Mua Ngay' : 'Không đủ điểm'}
            </button>
        `;
        
        return itemDiv;
    }

    async buyItem(itemId) {
        if (!confirm('Bạn có chắc muốn mua item này?')) {
            return;
        }

        try {
            const response = await fetch('/api/shop/buy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ item_id: itemId })
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                this.currentPoints = data.new_balance;
                document.getElementById('current-points').textContent = this.currentPoints;
                this.renderItems(); // Refresh items display
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error buying item:', error);
            alert('Có lỗi xảy ra khi mua item');
        }
    }

    showError(message) {
        const grid = document.getElementById('items-grid');
        grid.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// Khởi tạo shop khi trang load
const shop = new Shop();