function navigateToWelcome() {
    showPage('welcome-page');
    history.pushState({page: 'welcome'}, '', '#welcome');
}

function navigateToLogin() {
    showPage('login-page');
    history.pushState({page: 'login'}, '', '#login');
}

function navigateToRegister() {
    showPage('register-page');
    history.pushState({page: 'register'}, '', '#register');
}

function navigateToChat() {
    showPage('chat-page');
    history.pushState({page: 'chat'}, '', '#chat');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

window.addEventListener('popstate', function(event) {
    if (event.state && event.state.page) {
        showPage(event.state.page + '-page');
    } else {
        showPage('welcome-page');
    }
});

history.replaceState({page: 'welcome'}, '', '#welcome');
