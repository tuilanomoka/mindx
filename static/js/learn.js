// Biến toàn cục
let loadingElement = null;

// Hiển thị thông báo
function showAlert(message, type = 'error') {
    alert(message);
}

// Hiển thị loading
function showLoading(message = 'Đang phân tích bài toán...') {
    if (loadingElement) {
        const textEl = loadingElement.querySelector('.loading-text');
        if(textEl) textEl.textContent = message;
        return;
    }
    
    loadingElement = document.createElement('div');
    loadingElement.className = 'loading-toast';
    loadingElement.innerHTML = `
        <div class="spinner-icon"></div>
        <span class="loading-text">${message}</span>
    `;
    document.body.appendChild(loadingElement);
}

// Ẩn loading
function hideLoading() {
    if (loadingElement) {
        loadingElement.style.opacity = '0';
        setTimeout(() => {
            if (loadingElement) {
                loadingElement.remove();
                loadingElement = null;
            }
        }, 300);
    }
}

// Xử lý gửi bài toán
async function submitMathQuestion() {
    const lop = document.getElementById('lop')?.value;
    const questionField = document.getElementById('question');
    const question = questionField?.getValue?.() || questionField?.value || '';
    
    const submitBtn = document.getElementById('submitBtn');
    const hiddenSection = document.getElementById('hiddenSection');
    const questionDiv = document.getElementById('question_div');

    // Validate input
    if (!lop || !question.trim()) {
        showAlert('Vui lòng nhập đầy đủ lớp và câu hỏi!');
        return;
    }

    // UI state
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ Đang xử lý...';
    showLoading('AI đang giải bài toán...');

    try {
        const response = await fetch('/process-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lop, question })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        hideLoading();

        if (data.error) {
            showAlert('Có lỗi xảy ra: ' + data.error);
        } else {
            questionDiv.classList.add('hidden');
            hiddenSection.classList.remove('hidden');
            processAndDisplayData(data);
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showAlert('Có lỗi kết nối xảy ra. Vui lòng thử lại!');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Xử lý và hiển thị dữ liệu
// Xử lý và hiển thị dữ liệu
function processAndDisplayData(data) {
    const problemDiv = document.getElementById('problem');
    const solveDiv = document.getElementById('solve');
    const footerDiv = document.getElementById('action-footer');

    if (!problemDiv || !solveDiv) return;

    // Reset content
    problemDiv.innerHTML = '';
    solveDiv.innerHTML = '';
    if(footerDiv) footerDiv.innerHTML = ''; 

    // Hiển thị đề bài
    const questionField = document.getElementById('question');
    const questionContent = questionField?.getValue?.() || questionField?.value || '';
    if (questionContent) {
        problemDiv.innerHTML = `\\[${questionContent}\\]`;
    }

    // Xử lý dữ liệu
    let questionData = null;
    if (Array.isArray(data) && data.length > 0) questionData = data[0];
    else if (data && typeof data === 'object') questionData = data;

    if (!questionData || !questionData.loigiai) {
        solveDiv.innerHTML = '<p class="text-center text-white">Không có dữ liệu giải bài tập.</p>';
    } else {
        // Hiển thị các bước giải
        let stepsHTML = '';
        questionData.loigiai.forEach((step, index) => {
            const stepNumber = step.buoc || index + 1;
            let stepDetail = step.chitiet || step.noi_dung || `Bước ${stepNumber}`;
            
            // Xử lý latex trong các bước - FIX LỖI XUỐNG DÒNG
            stepDetail = stepDetail.replace(/\\n/g, '<br>');
            
            // Xử lý inline latex với $ (giữ nguyên $ mà không bị xuống dòng)
            stepDetail = stepDetail.replace(/\$(.*?)\$/g, '\\($1\\)');

            stepsHTML += `
                <div class="step">
                    <h4>Bước ${stepNumber}</h4>
                    <div class="step-content">${stepDetail}</div>
                </div>
            `;
        });
        solveDiv.innerHTML = stepsHTML;

        // Hiển thị đáp án
        if (questionData.dapan) {
            let finalAns = questionData.dapan.replace(/\\n/g, '<br>');
            // Xử lý latex trong đáp án
            finalAns = finalAns.replace(/\$(.*?)\$/g, '\\($1\\)');
            
            solveDiv.innerHTML += `
                <div class="answer-section">
                    <h3>Đáp án:</h3>
                    <div class="answer-content">${finalAns}</div>
                </div>
            `;
        }
    }

    // Thêm nút tiếp tục
    if (footerDiv) {
        const continueBtn = document.createElement('button');
        continueBtn.className = 'btn-continue';
        continueBtn.innerHTML = '🔄 Tiếp tục bài toán khác';
        continueBtn.onclick = () => window.location.reload();
        footerDiv.appendChild(continueBtn);
    }

    // Render MathJax và scroll
    setTimeout(() => {
        renderMathJax([problemDiv, solveDiv]);
        problemDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
}

// Render MathJax
function renderMathJax(elements) {
    const validElements = elements.filter(el => el && el instanceof HTMLElement);
    if (validElements.length === 0) return;

    if (window.MathJax && window.MathJax.typesetPromise) {
        if (window.MathJax.texReset) window.MathJax.texReset();
        window.MathJax.typesetPromise(validElements).catch(err => {
            console.warn('MathJax rendering warning:', err);
            if (window.MathLive) validElements.forEach(el => window.MathLive.renderMathInElement(el));
        });
    } else if (window.MathLive && window.MathLive.renderMathInElement) {
        validElements.forEach(el => window.MathLive.renderMathInElement(el));
    }
}

// Điều hướng về trang chủ
function navigateToHome() {
    window.location.href = '/';
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    console.log('Learn mode initialized');
});