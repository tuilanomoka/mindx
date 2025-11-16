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
    const questionData = data[0];
    if (questionData.baitoan) {
        const problemParagraph = document.createElement('p');
        problemParagraph.textContent = questionData.baitoan;
        problemDiv.appendChild(problemParagraph);
    }
    if (questionData.loigiai && Array.isArray(questionData.loigiai)) {
        questionData.loigiai.forEach((step, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.id = `step-${index + 1}`;
            stepDiv.className = 'step';
            const stepLink = document.createElement('a');
            stepLink.textContent = `Bước ${step.buoc}`;
            stepLink.href = 'javascript:void(0);';
            stepLink.style.cursor = 'pointer';
            stepLink.style.textDecoration = 'underline';
            let displayState = 0;
            const updateDisplay = () => {
                switch(displayState) {
                    case 0:
                        stepLink.textContent = `Bước ${step.buoc}`;
                        break;
                    case 1:
                        stepLink.textContent = step.tomtat || `Bước ${step.buoc} - Tóm tắt`;
                        break;
                    case 2:
                        stepLink.textContent = step.chitiet || `Bước ${step.buoc} - Chi tiết`;
                        break;
                }
            };
            stepLink.addEventListener('click', () => {
                displayState = (displayState + 1) % 3;
                updateDisplay();
            });
            stepDiv.appendChild(stepLink);
            solveDiv.appendChild(stepDiv);
        });
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