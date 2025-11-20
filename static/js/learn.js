function showAlert(message, type = 'error') {
    alert(message);
}

let loadingElement = null;

function showLoading() {
    if (loadingElement) return;
    loadingElement = document.createElement('div');
    loadingElement.className = 'loading-text';
    loadingElement.textContent = 'Đang tải...';
    loadingElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        font-weight: 500;
    `;
    document.body.appendChild(loadingElement);
}

function hideLoading() {
    if (loadingElement) {
        loadingElement.remove();
        loadingElement = null;
    }
}

async function submitMathQuestion() {
    const lop = document.getElementById('lop')?.value;
    const questionField = document.getElementById('question');
    const question = questionField?.getValue?.() || questionField?.value || '';
    const submitBtn = document.getElementById('submitBtn');
    const hiddenSection = document.getElementById('hiddenSection');
    const questionDiv = document.getElementById('question_div');

    if (!lop || !question.trim()) {
        showAlert('Vui lòng nhập đầy đủ lớp và câu hỏi!');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang xử lý...';
    showLoading();

    try {
        const response = await fetch('/process-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lop, question })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        if (data.error) {
            showAlert('Có lỗi xảy ra: ' + data.error);
        } else {
            processAndDisplayData(data);
            questionDiv.classList.add('hidden');
            hiddenSection.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Có lỗi kết nối xảy ra. Vui lòng thử lại!');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Gửi câu hỏi';
        hideLoading();
    }
}

function processAndDisplayData(data) {
    const problemDiv = document.getElementById('problem');
    const solveDiv = document.getElementById('solve');

    if (!problemDiv || !solveDiv) {
        console.error('Required elements not found');
        return;
    }

    problemDiv.innerHTML = '';
    solveDiv.innerHTML = '';

    const questionField = document.getElementById('question');
    const questionContent = questionField?.getValue?.() || questionField?.value || '';
    if (questionContent) problemDiv.innerHTML = `\\[${questionContent}\\]`;

    let questionData = null;
    if (Array.isArray(data) && data.length > 0) questionData = data[0];
    else if (data && typeof data === 'object') questionData = data;

    if (!questionData || !questionData.loigiai) {
        solveDiv.innerHTML = '<p>Không có dữ liệu giải bài tập.</p>';
        renderMathJax([problemDiv, solveDiv]);
        return;
    }

    let stepsHTML = '';
    questionData.loigiai.forEach((step, index) => {
        const stepNumber = step.buoc || index + 1;
        const stepDetail = step.chitiet || step.noi_dung || `Bước ${stepNumber}`;
        stepsHTML += `
            <div class="step">
                <h4>Bước ${stepNumber}:</h4>
                <div class="step-content">${stepDetail}</div>
            </div>
        `;
    });

    solveDiv.innerHTML = stepsHTML;

    if (questionData.dapan) {
        solveDiv.innerHTML += `
            <div class="answer-section">
                <h3>Đáp án:</h3>
                <div class="answer-content">${questionData.dapan}</div>
            </div>
        `;
    }

    renderMathJax([problemDiv, solveDiv]);
}

function renderMathJax(elements) {
    if (window.MathJax?.typesetPromise) {
        setTimeout(() => {
            window.MathJax.typesetPromise(elements).catch(err => console.error('MathJax error:', err));
        }, 100);
    }
}

function navigateToHome() {
    window.location.href = '/';
}