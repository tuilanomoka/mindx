// static/js/admin.js
class AdminPanel {
    constructor() {
        this.currentTab = 'users';
        this.users = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUsers();
        this.loadStats();
    }

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Search functionality
        document.getElementById('search-users').addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        // Password change
        document.getElementById('change-password-btn').addEventListener('click', () => {
            this.changeOwnPassword();
        });

        document.getElementById('change-user-password-btn').addEventListener('click', () => {
            this.changeUserPassword();
        });

        // Modal events
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('save-user-btn').addEventListener('click', () => {
            this.saveUserChanges();
        });

        document.getElementById('delete-user-btn').addEventListener('click', () => {
            this.deleteUser();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('edit-user-modal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        // Load data for specific tabs
        if (tabName === 'stats') {
            this.loadStats();
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.users = data.users;
                this.renderUsers(this.users);
            } else {
                this.showError('Không thể tải danh sách users');
            }
        } catch (error) {
            this.showError('Lỗi kết nối đến server');
        }
    }

    renderUsers(users) {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            
            // Get items information
            const items = [];
            for (let i = 1; i <= 5; i++) {
                if (user[`item${i}`]) items.push(i);
            }
            const itemsText = items.length > 0 ? items.join(', ') : 'Không có';

            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.totalpoint || 0}</td>
                <td>${user.currentpoint || 0}</td>
                <td>${itemsText}</td>
                <td>${user.selecteditem || 'Không có'}</td>
                <td>
                    <button class="btn btn-primary btn-sm edit-btn" data-username="${user.username}">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Bind edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.closest('.edit-btn').dataset.username;
                this.openEditModal(username);
            });
        });
    }

    filterUsers(searchTerm) {
        const filteredUsers = this.users.filter(user => 
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderUsers(filteredUsers);
    }

    openEditModal(username) {
        const user = this.users.find(u => u.username === username);
        if (!user) return;

        document.getElementById('edit-username').value = user.username;
        document.getElementById('edit-total-points').value = user.totalpoint || 0;
        document.getElementById('edit-current-points').value = user.currentpoint || 0;

        document.getElementById('edit-user-modal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('edit-user-modal').style.display = 'none';
    }

    async saveUserChanges() {
        const username = document.getElementById('edit-username').value;
        const totalPoints = parseInt(document.getElementById('edit-total-points').value);
        const currentPoints = parseInt(document.getElementById('edit-current-points').value);

        try {
            const response = await fetch('/api/admin/update-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    total_point: totalPoints,
                    current_point: currentPoints
                })
            });

            if (response.ok) {
                this.showSuccess('Cập nhật user thành công');
                this.closeModal();
                this.loadUsers();
                this.loadStats();
            } else {
                this.showError('Không thể cập nhật user');
            }
        } catch (error) {
            this.showError('Lỗi kết nối đến server');
        }
    }

    async deleteUser() {
        const username = document.getElementById('edit-username').value;
        
        if (username === 'admin') {
            this.showError('Không thể xóa tài khoản admin');
            return;
        }

        if (!confirm(`Bạn có chắc muốn xóa user "${username}"?`)) {
            return;
        }

        try {
            const response = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username
                })
            });

            if (response.ok) {
                this.showSuccess('Xóa user thành công');
                this.closeModal();
                this.loadUsers();
                this.loadStats();
            } else {
                this.showError('Không thể xóa user');
            }
        } catch (error) {
            this.showError('Lỗi kết nối đến server');
        }
    }

    async changeOwnPassword() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showError('Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('Mật khẩu mới không khớp');
            return;
        }

        try {
            const response = await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('Đổi mật khẩu thành công');
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
            } else {
                this.showError(data.message || 'Không thể đổi mật khẩu');
            }
        } catch (error) {
            this.showError('Lỗi kết nối đến server');
        }
    }

    async changeUserPassword() {
        const username = document.getElementById('target-username').value;
        const newPassword = document.getElementById('target-new-password').value;

        if (!username || !newPassword) {
            this.showError('Vui lòng điền đầy đủ thông tin');
            return;
        }

        try {
            const response = await fetch('/api/admin/change-user-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess(`Đổi mật khẩu cho ${username} thành công`);
                document.getElementById('target-username').value = '';
                document.getElementById('target-new-password').value = '';
            } else {
                this.showError(data.message || 'Không thể đổi mật khẩu');
            }
        } catch (error) {
            this.showError('Lỗi kết nối đến server');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/admin/stats');
            if (response.ok) {
                const data = await response.json();
                this.renderStats(data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    renderStats(stats) {
        document.getElementById('total-users').textContent = stats.total_users;
        document.getElementById('total-points').textContent = stats.total_points;
        document.getElementById('top-user').textContent = stats.top_user;

        // Render top users chart
        this.renderTopUsersChart(stats.top_users);
    }

    renderTopUsersChart(topUsers) {
        const chart = document.getElementById('top-users-chart');
        chart.innerHTML = '';

        const maxPoints = Math.max(...topUsers.map(user => user.totalpoint));
        
        topUsers.forEach(user => {
            const barHeight = (user.totalpoint / maxPoints) * 150;
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = `${barHeight}px`;
            bar.style.flex = '1';
            
            const label = document.createElement('div');
            label.className = 'bar-label';
            label.textContent = user.username;
            
            const points = document.createElement('div');
            points.textContent = user.totalpoint;
            points.style.marginTop = '5px';
            points.style.fontSize = '0.7rem';
            
            bar.appendChild(label);
            bar.appendChild(points);
            chart.appendChild(bar);
        });
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 5px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        if (type === 'success') {
            notification.style.background = '#27ae60';
        } else {
            notification.style.background = '#e74c3c';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);