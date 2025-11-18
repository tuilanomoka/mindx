// Error handling function
function showAlert(message, type = 'error') {
    const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
    alert(message);
}

// State management
const practiceState = {
    sessionId: null,
    numberOfSteps: 0,
    currentScore: 100,
    viewedSteps: new Set()
};

async function newSession() {
    try {
        const response = await fetch('/api/new_session_id', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            showAlert('Có lỗi xảy ra: ' + data.comment);
            return false;
        }
        
        practiceState.sessionId = data.id;
        practiceState.currentScore = data.grade;
        updateGradeDisplay(data.grade);
        return true;
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Có lỗi kết nối xảy ra. Vui lòng thử lại!');
        return false;
    }
}

async function ZeroOutPoint() {
    if (!practiceState.sessionId) {
        showAlert('Phiên làm bài không hợp lệ!');
        return false;
    }
    
    try {
        const response = await fetch('/api/zero_out_temporary_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 'id': practiceState.sessionId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            showAlert('Có lỗi xảy ra: ' + data.comment);
            return false;
        }
        
        practiceState.currentScore = data.grade;
        updateGradeDisplay(data.grade);
        return true;
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Có lỗi kết nối xảy ra. Vui lòng thử lại!');
        return false;
    }
}

async function processPoint(changes) {
    if (!practiceState.sessionId) {
        showAlert('Phiên làm bài không hợp lệ!');
        return false;
    }
    
    try {
        const response = await fetch('/api/update_temporary_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                'id': practiceState.sessionId, 
                'change': Math.floor(changes).toString() 
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            showAlert('Có lỗi xảy ra: ' + data.comment);
            return false;
        }
        
        practiceState.currentScore = data.grade;
        updateGradeDisplay(data.grade);
        return true;
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Có lỗi kết nối xảy ra. Vui lòng thử lại!');
        return false;
    }
}

function updateGradeDisplay(grade) {
    const gradeElement = document.getElementById("grade");
    if (gradeElement) {
        gradeElement.innerHTML = "Số điểm hiện tại của bạn: " + grade;
    }
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
            // Reset state
            practiceState.viewedSteps.clear();
            practiceState.numberOfSteps = 0;
            
            processAndDisplayData(data);
            questionDiv.classList.add('hidden');
            hiddenSection.classList.remove('hidden');
            
            // Create new session
            await newSession();
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
        practiceState.numberOfSteps = questionData.loigiai.length;
        
        const stepsHTML = questionData.loigiai.map((step, index) => {
            const stepNumber = step.buoc || index + 1;
            const stepDetail = step.chitiet || step.noi_dung || `Bước ${stepNumber}`;

            return `
                <div id="step-${index + 1}" class="step">
                    <a href="javascript:void(0);" 
                       class="step-link" 
                       data-step="${index}">
                        Bước ${stepNumber}
                    </a>
                    <div class="step-content hidden" data-step="${index}">
                        ${stepDetail}
                    </div>
                </div>
            `;
        }).join('');

        solveDiv.innerHTML = stepsHTML;

        // Add single event listener with delegation (prevent duplicates)
        solveDiv.removeEventListener('click', handleStepClick);
        solveDiv.addEventListener('click', handleStepClick);

    } else {
        solveDiv.innerHTML = '<p>Không có lời giải chi tiết.</p>';
    }

    // Display final answer
    if (questionData.dapan) {
        const answerHTML = `
            <div class="answer-section">
                <a href="javascript:void(0);" 
                   id="final-answer-link">
                    <h3>Xem đáp án cuối cùng</h3>
                </a>
                <div id="final-answer-content" class="hidden">
                    ${questionData.dapan}
                </div>
            </div>
        `;
        solveDiv.innerHTML += answerHTML;

        const finalAnswerLink = document.getElementById('final-answer-link');
        if (finalAnswerLink) {
            finalAnswerLink.addEventListener('click', handleFinalAnswerClick, { once: true });
        }
    }

    renderMathJax([problemDiv, solveDiv]);
}

function handleStepClick(e) {
    const link = e.target.closest('.step-link');
    if (!link) return;

    const stepIndex = link.getAttribute('data-step');
    
    // Prevent viewing the same step multiple times
    if (practiceState.viewedSteps.has(stepIndex)) {
        return;
    }

    const stepContent = link.nextElementSibling;
    if (!stepContent) return;

    stepContent.classList.remove('hidden');
    link.classList.add('hidden');
    
    // Mark as viewed
    practiceState.viewedSteps.add(stepIndex);
    
    renderMathJax([stepContent]);
    
    // Deduct points
    if (practiceState.numberOfSteps > 0) {
        const pointDeduction = -100 / practiceState.numberOfSteps;
        processPoint(pointDeduction);
    }
}

function handleFinalAnswerClick() {
    const finalAnswerContent = document.getElementById('final-answer-content');
    const finalAnswerLink = document.getElementById('final-answer-link');
    
    if (finalAnswerContent) {
        finalAnswerContent.classList.remove('hidden');
        renderMathJax([finalAnswerContent]);
    }
    
    if (finalAnswerLink) {
        finalAnswerLink.classList.add('hidden');
    }
    
    ZeroOutPoint();
}

async function submitAnswer() {
    const userAnswerField = document.getElementById('user-answer');
    const userAnswer = userAnswerField?.getValue?.() || userAnswerField?.value || '';
    const submitBtn = document.querySelector('button[onclick="submitAnswer()"]');
    const lop = document.getElementById('lop')?.value;
    const questionField = document.getElementById('question');
    const question = questionField?.getValue?.() || questionField?.value || '';

    if (!userAnswer) {
        showAlert('Vui lòng nhập câu trả lời!');
        return;
    }

    if (!practiceState.sessionId) {
        showAlert('Phiên làm bài không hợp lệ!');
        return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang kiểm tra...';

    try {
        const response = await fetch('/process-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lop,
                question,
                user_answer: userAnswer,
                id: practiceState.sessionId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        showAnswerResult(result);

    } catch (error) {
        console.error('Error:', error);
        showAlert('Có lỗi kết nối xảy ra. Vui lòng thử lại!');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function showAnswerResult(result) {
    let resultDiv = document.getElementById('answer-result');

    if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.id = 'answer-result';
        resultDiv.className = 'result';
        const hiddenSection = document.getElementById('hiddenSection');
        if (hiddenSection) {
            hiddenSection.appendChild(resultDiv);
        }
    }

    const resultData = Array.isArray(result) ? result[0] : result;
    const acstatus = resultData?.acstatus;
    const explain = resultData?.explain || 'Không có giải thích';

    const statusText = acstatus === 'true' ? 'AC' : 'WA';
    const statusClass = acstatus === 'true' ? 'correct' : 'incorrect';
    
    resultDiv.innerHTML = `
        <p class="${statusClass}"><strong>${statusText}</strong></p>
        <p>${explain}</p>
    `;

    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    const solveDiv = document.getElementById('solve');
    if (solveDiv) {
        solveDiv.removeEventListener('click', handleStepClick);
    }
});