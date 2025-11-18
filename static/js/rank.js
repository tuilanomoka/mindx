class RankManager {
    constructor() {
        this.rankList = document.getElementById('rankList');
        this.init();
    }

    init() {
        this.loadRankings();
        // Có thể thêm auto-refresh mỗi 30 giây
        // setInterval(() => this.loadRankings(), 30000);
    }

    async loadRankings() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/rankings');
            const data = await response.json();
            
            if (data.success) {
                this.renderRankings(data.rankings);
            } else {
                this.showError(data.error || 'Có lỗi xảy ra khi tải dữ liệu');
            }
        } catch (error) {
            console.error('Error loading rankings:', error);
            this.showError('Có lỗi kết nối đến server');
        }
    }

    renderRankings(rankings) {
        if (!rankings || rankings.length === 0) {
            this.showNoData();
            return;
        }

        const html = rankings.map(item => `
            <div class="rank-item ${this.getRankClass(item.rank)}">
                <span class="rank-number">${item.rank}</span>
                <span class="rank-username">${this.escapeHtml(item.username)}</span>
                <span class="rank-points">${item.totalpoint} điểm</span>
            </div>
        `).join('');

        this.rankList.innerHTML = html;
    }

    getRankClass(rank) {
        if (rank === 1) return 'rank-first';
        if (rank === 2) return 'rank-second';
        if (rank === 3) return 'rank-third';
        return '';
    }

    showLoading() {
        this.rankList.innerHTML = '<div class="loading">Đang tải dữ liệu...</div>';
    }

    showNoData() {
        this.rankList.innerHTML = '<div class="no-data">Chưa có dữ liệu xếp hạng</div>';
    }

    showError(message) {
        this.rankList.innerHTML = `<div class="error">${message}</div>`;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Khởi tạo khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new RankManager();
});