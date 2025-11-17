async function submitMathQuestion() {
    const lop = document.getElementById('lop').value;
    const question = document.getElementById('question').value;
    const submitBtn = document.getElementById('submitBtn');
    const hiddenSection = document.getElementById('hiddenSection');
    const questionDiv = document.getElementById('question_div');
    const problemDiv = document.getElementById('problem');
    const solveDiv = document.getElementById('solve');

    if (!lop || !question) {
        alert('Vui lòng nhập đầy đủ lớp và câu hỏi!');
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
            body: JSON.stringify({
                lop: lop,
                question: question
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            console.error('Server error:', data.error);
            alert('Có lỗi xảy ra: ' + data.error);
        } else {
            processAndDisplayData(data);
            
            questionDiv.classList.add('hidden');
            hiddenSection.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi kết nối xảy ra. Vui lòng thử lại!');
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
    
    const mathField = document.getElementById('question');
    const questionContent = mathField ? mathField.getValue() : document.getElementById('question').value;
    
    if (questionContent) {
        problemDiv.innerHTML = `\\[${questionContent}\\]`;
    }
    
    const questionData = Array.isArray(data) ? data[0] : data;
    
    if (!questionData) {
        solveDiv.innerHTML = '<p>Không có dữ liệu giải bài tập.</p>';
        if (window.MathJax) {
            MathJax.typesetPromise([problemDiv, solveDiv]).catch(console.error);
        }
        return;
    }
    
    if (questionData.loigiai && Array.isArray(questionData.loigiai)) {
        const stepsHTML = questionData.loigiai.map((step, index) => {
            const stepNumber = step.buoc || index + 1;
            const stepDetail = step.chitiet || step.noi_dung || `Bước ${stepNumber}`;
            
            return `
                <div id="step-${index + 1}" class="step" style="margin-bottom: 15px;">
                    <a href="javascript:void(0);" 
                       class="step-link" 
                       data-step="${index}"
                       style="cursor: pointer; text-decoration: underline; margin-bottom: 10px; display: block;">
                        Bước ${stepNumber}
                    </a>
                    <div class="step-content" style="display: none; padding: 10px; background-color: #f0f0f0; border-radius: 5px; margin-top: 5px;">
                        ${stepDetail}
                    </div>
                </div>
            `;
        }).join('');
        
        solveDiv.innerHTML = stepsHTML;
        
        setTimeout(() => {
            document.querySelectorAll('.step-link').forEach(link => {
                link.addEventListener('click', function() {
                    const stepIndex = parseInt(this.dataset.step);
                    const stepContent = this.nextElementSibling;
                    
                    stepContent.style.display = 'block';
                    this.style.display = 'none';
                    
                    if (window.MathJax) {
                        MathJax.typesetPromise([stepContent]).catch(console.error);
                    }
                });
            });
        }, 0);
    } else {
        solveDiv.innerHTML += '<p>Không có lời giải chi tiết.</p>';
    }
    
    if (questionData.dapan) {
        const answerHTML = `
            <div class="answer-section" style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                <a href="javascript:void(0);" 
                   id="final-answer-link"
                   style="cursor: pointer; text-decoration: underline; display: block; margin-bottom: 10px;">
                    <h3 style="margin: 0;">Xem đáp án cuối cùng</h3>
                </a>
                <div id="final-answer-content" style="display: none;">
                    ${questionData.dapan}
                </div>
            </div>
        `;
        solveDiv.innerHTML += answerHTML;
        
        setTimeout(() => {
            const finalAnswerLink = document.getElementById('final-answer-link');
            const finalAnswerContent = document.getElementById('final-answer-content');
            
            if (finalAnswerLink && finalAnswerContent) {
                finalAnswerLink.addEventListener('click', function() {
                    finalAnswerContent.style.display = 'block';
                    this.style.display = 'none';
                    
                    if (window.MathJax) {
                        MathJax.typesetPromise([finalAnswerContent]).catch(console.error);
                    }
                });
            }
        }, 0);
    }
    
    if (window.MathJax) {
        MathJax.typesetPromise([problemDiv, solveDiv]).catch(console.error);
    }
}

async function submitAnswer() {
    const userAnswerField = document.getElementById('user-answer');
    const userAnswer = userAnswerField ? userAnswerField.getValue() : '';
    const submitBtn = document.querySelector('button[onclick="submitAnswer()"]');
    const lop = document.getElementById('lop').value;
    const questionField = document.getElementById('question');
    const question = questionField ? questionField.getValue() : document.getElementById('question').value;
    
    if (!userAnswer) {
        alert('Vui lòng nhập câu trả lời!');
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
                lop: lop,
                question: question,
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
        alert('Có lỗi kết nối xảy ra. Vui lòng thử lại!');
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
        resultDiv.style.marginTop = '20px';
        resultDiv.style.padding = '15px';
        resultDiv.style.borderRadius = '5px';
        
        const hiddenSection = document.getElementById('hiddenSection');
        hiddenSection.appendChild(resultDiv);
    }
    let resultData;
    if (Array.isArray(result) && result.length > 0) {
        resultData = result[0];
    } else {
        resultData = result;
    }
    const acstatus = resultData?.acstatus;
    const explain = resultData?.explain || 'Không có giải thích';
    
    const statusText = acstatus === 'true' ? 'AC' : 'WA';
    resultDiv.innerHTML = `
        <p>${statusText}</p>
        <p>${explain}</p>
    `;
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function navigateToHome() {
    window.location.href = '/';
}