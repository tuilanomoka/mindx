class Inventory {
    constructor() {
        this.inventory = [];
        this.init();
    }

    async init() {
        await this.loadInventory();
    }

    async loadInventory() {
        try {
            const response = await fetch('/api/inventory');
            const data = await response.json();
            
            if (data.success) {
                this.inventory = data.inventory;
                document.getElementById('total-points').textContent = data.total_points;
                document.getElementById('current-points').textContent = data.current_points;
                this.renderInventory();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.showError('Không thể tải inventory');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    renderInventory() {
        const grid = document.getElementById('inventory-grid');
        const emptyMsg = document.getElementById('empty-inventory');
        
        if (this.inventory.length === 0) {
            grid.style.display = 'none';
            emptyMsg.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        emptyMsg.style.display = 'none';
        grid.innerHTML = '';

        this.inventory.forEach(item => {
            const itemElement = this.createItemElement(item);
            grid.appendChild(itemElement);
        });
    }

    createItemElement(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = `inventory-item ${item.selected ? 'selected' : ''}`;
        
        itemDiv.innerHTML = `
            <div class="item-icon">🏆</div>
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-price">Giá: ${item.price} điểm</div>
            </div>
            <button class="select-btn ${item.selected ? 'selected' : ''}" 
                    onclick="inventory.selectItem('${item.id}')"
                    ${item.selected ? 'disabled' : ''}>
                ${item.selected ? 'Đang sử dụng' : 'Sử dụng'}
            </button>
        `;
        
        return itemDiv;
    }

    async selectItem(itemId) {
        try {
            const response = await fetch('/api/inventory/select', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ item_id: itemId })
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                await this.loadInventory(); // Refresh inventory
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error selecting item:', error);
            alert('Có lỗi xảy ra khi chọn item');
        }
    }

    showError(message) {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// Khởi tạo inventory khi trang load
const inventory = new Inventory();