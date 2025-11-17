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
    const questionContent = mathField ? mathField.getValue() : '';
    
    if (questionContent) {
        problemDiv.innerHTML = `\\[${questionContent}\\]`;
    }
    
    const questionData = data[0];
    if (questionData.loigiai && Array.isArray(questionData.loigiai)) {
        const stepsHTML = questionData.loigiai.map((step, index) => `
            <div id="step-${index + 1}" class="step">
                <a href="javascript:void(0);" 
                   class="step-link" 
                   data-step="${index}"
                   data-state="0"
                   style="cursor: pointer; text-decoration: underline; margin-bottom: 10px; display: block;">
                    Bước ${step.buoc}
                </a>
            </div>
        `).join('');
        
        solveDiv.innerHTML = stepsHTML;
        setTimeout(() => {
            document.querySelectorAll('.step-link').forEach(link => {
                const stepIndex = parseInt(link.dataset.step);
                const step = questionData.loigiai[stepIndex];
                
                link.addEventListener('click', function() {
                    let state = parseInt(this.dataset.state);
                    state = (state + 1) % 3;
                    this.dataset.state = state;
                    
                    switch(state) {
                        case 0:
                            this.innerHTML = `Bước ${step.buoc}`;
                            break;
                        case 1:
                            this.innerHTML = step.tomtat || `Bước ${step.buoc} - Tóm tắt`;
                            break;
                        case 2:
                            this.innerHTML = step.chitiet || `Bước ${step.buoc} - Chi tiết`;
                            break;
                    }
                    if (window.MathJax) {
                        MathJax.typesetPromise([this]).catch(console.error);    
                    }
                });
            });
        }, 0);
    }
    if (window.MathJax) {
        MathJax.typesetPromise([problemDiv, solveDiv]).catch(console.error);
    }
}

function submitAnswer() {
    const userAnswer = document.getElementById('user-answer').value;
    if (!userAnswer) {
        alert('Vui lòng nhập câu trả lời!');
        return;
    }
    console.log('Câu trả lời của người dùng:', userAnswer);
    alert('Câu trả lời đã được gửi!');
}

function navigateToHome() {
    window.location.href = '/';
}