// auth.js - Tối ưu hóa
class AuthHandler {
    constructor() {
        this.init();
    }

    init() {
        console.log('AuthHandler initialized');
    }

    async handleLogin(event) {
        event.preventDefault();

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.navigateToHome();
            } else {
                this.showMessage(data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Có lỗi xảy ra khi đăng nhập!', 'error');
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        // Validation
        if (password !== confirmPassword) {
            this.showMessage('Mật khẩu xác nhận không khớp!', 'error');
            return;
        }
        
        if (password.length < 8) {
            this.showMessage('Mật khẩu phải có ít nhất 8 ký tự!', 'error');
            return;
        }
        
        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.navigateToLogin();
            } else {
                this.showMessage(data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Có lỗi xảy ra khi đăng ký!', 'error');
        }
    }

    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const button = input.nextElementSibling;
        
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
        }
    }

    showMessage(message, type = 'info') {
        // Có thể thay thế alert bằng modal đẹp hơn
        alert(message);
    }

    navigateToHome() {
        window.location.href = '/';
    }

    navigateToLogin() {
        window.location.href = '/login';
    }
}

// Khởi tạo instance
const auth = new AuthHandler();

// Gán hàm toàn cục để có thể gọi từ HTML
window.handleLogin = (event) => auth.handleLogin(event);
window.handleRegister = (event) => auth.handleRegister(event);
window.togglePassword = (inputId) => auth.togglePassword(inputId);