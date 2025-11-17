// Error handling function
function showAlert(message, type = 'error') {
    const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
    // Frontend will handle UI implementation
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(message);
}
async function newSession()
{
    try {
        const response = await fetch('/api/new_session_id', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if(!response.ok)
        {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if(!data.success)
        {
            showAlert('Có lỗi xảy ra: ' + data.comment);
        }else {
            window.score_session_id = data.id;
            document.getElementById("grade").innerHTML = "Số điểm hiện tại của bạn: " + data.grade;
        }
    } catch (error) {
        
    }
}
function processPoint(changes)
{
}
async function submitMathQuestion() {
    const lop = document.getElementById('lop').value;
    const question = document.getElementById('question').value;
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
            // process point
            newSession();
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
    
    problemDiv.innerHTML = '';
    solveDiv.innerHTML = '';
    
    // Display problem
    const mathField = document.getElementById('question');
    const questionContent = mathField ? mathField.getValue() : document.getElementById('question').value;
    
    if (questionContent) {
        problemDiv.innerHTML = `\\[${questionContent}\\]`;
    }
    
    const questionData = Array.isArray(data) ? data[0] : data;
    
    if (!questionData) {
        solveDiv.innerHTML = '<p>Không có dữ liệu giải bài tập.</p>';
        renderMathJax([problemDiv, solveDiv]);
        return;
    }
    
    // Display solution steps
    if (questionData.loigiai && Array.isArray(questionData.loigiai)) {
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
                    <div class="step-content hidden">
                        ${stepDetail}
                    </div>
                </div>
            `;
        }).join('');
        
        solveDiv.innerHTML = stepsHTML;
        
        // Add event listeners for step links
        document.querySelectorAll('.step-link').forEach(link => {
            link.addEventListener('click', function() {
                const stepContent = this.nextElementSibling;
                stepContent.classList.remove('hidden');
                this.classList.add('hidden');
                renderMathJax([stepContent]);
            });
        });
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
        
        document.getElementById('final-answer-link').addEventListener('click', function() {
            const finalAnswerContent = document.getElementById('final-answer-content');
            finalAnswerContent.classList.remove('hidden');
            this.classList.add('hidden');
            renderMathJax([finalAnswerContent]);
        });
    }
    
    renderMathJax([problemDiv, solveDiv]);
}

async function submitAnswer() {
    const userAnswerField = document.getElementById('user-answer');
    const userAnswer = userAnswerField ? userAnswerField.getValue() : '';
    const submitBtn = document.querySelector('button[onclick="submitAnswer()"]');
    const lop = document.getElementById('lop').value;
    const questionField = document.getElementById('question');
    const question = questionField ? questionField.getValue() : document.getElementById('question').value;
    
    if (!userAnswer) {
        showAlert('Vui lòng nhập câu trả lời!');
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
                user_answer: userAnswer
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
        document.getElementById('hiddenSection').appendChild(resultDiv);
    }
    
    const resultData = Array.isArray(result) ? result[0] : result;
    const acstatus = resultData?.acstatus;
    const explain = resultData?.explain || 'Không có giải thích';
    
    const statusText = acstatus === 'true' ? 'AC' : 'WA';
    resultDiv.innerHTML = `
        <p>${statusText}</p>
        <p>${explain}</p>
    `;
    
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderMathJax(elements) {
    if (window.MathJax) {
        MathJax.typesetPromise(elements).catch(console.error);
    }
}

function navigateToHome() {
    window.location.href = '/';
}