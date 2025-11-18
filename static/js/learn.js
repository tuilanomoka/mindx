// Error handling function
function showAlert(message, type = 'error') {
    const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
    alert(message);
}

async function submitMathQuestion() {
    const lop = document.getElementById('lop')?.value;
    const questionField = document.getElementById('question');
    const question = questionField?.value || questionField?.getValue?.() || '';
    const submitBtn = document.getElementById('submitBtn');
    const hiddenSection = document.getElementById('hiddenSection');
    const questionDiv = document.getElementById('question_div');

    if (!lop || !question) {
        showAlert('Vui lòng nhập đầy đủ lớp và câu hỏi!');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang xử lý...';

    try {
        const response = await fetch('/process-question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lop, question })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

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

    // Display problem
    const mathField = document.getElementById('question');
    const questionContent = mathField?.getValue?.() || mathField?.value || '';

    if (questionContent) {
        problemDiv.innerHTML = `\\[${questionContent}\\]`;
    }

    // Extract the actual question data
    let questionData = null;
    
    if (Array.isArray(data) && data.length > 0) {
        questionData = data[0];
    } else if (data && typeof data === 'object') {
        questionData = data;
    }

    if (!questionData || !questionData.loigiai) {
        solveDiv.innerHTML = '<p>Không có dữ liệu giải bài tập.</p>';
        console.error('Invalid question data structure:', questionData);
        renderMathJax([problemDiv, solveDiv]);
        return;
    }

    // Display solution steps
    if (questionData.loigiai && Array.isArray(questionData.loigiai)) {
        let stepsHTML = '<div class="solution-steps">';
        
        questionData.loigiai.forEach((step, index) => {
            const stepNumber = step.buoc || index + 1;
            const stepDetail = step.chitiet || step.noi_dung || `Bước ${stepNumber}`;

            stepsHTML += `
                <div class="step">
                    <h4>Bước ${stepNumber}:</h4>
                    <div class="step-content">
                        ${stepDetail}
                    </div>
                </div>
            `;
        });
        
        stepsHTML += '</div>';
        solveDiv.innerHTML = stepsHTML;
    } else {
        solveDiv.innerHTML = '<p>Không có lời giải chi tiết.</p>';
    }

    // Display final answer
    if (questionData.dapan) {
        const answerHTML = `
            <div class="answer-section">
                <h3>Đáp án:</h3>
                <div class="answer-content">
                    ${questionData.dapan}
                </div>
            </div>
        `;
        solveDiv.innerHTML += answerHTML;
    }

    renderMathJax([problemDiv, solveDiv]);
}

function renderMathJax(elements) {
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise(elements).catch((err) => {
            console.error('MathJax rendering error:', err);
        });
    }
}

function navigateToHome() {
    window.location.href = '/';
}