async function submitMathQuestion() {
    const lop = document.getElementById('lop').value;
    const question = document.getElementById('question').value;
    const submitBtn = document.getElementById('submitBtn');
    const hiddenSection = document.getElementById('hiddenSection');
    const question_div = document.getElementById('question_div');
    submitBtn.disabled = true;
    
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
        
        const data = await response.json();
        
        if (data.error) {
            console.error(data.error);
        } else {
            question_div.classList.add('hidden');
            hiddenSection.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        
        submitBtn.disabled = false;
    }
}

function submitAnswer() {
    const userAnswer = document.getElementById('user-answer').value;
}