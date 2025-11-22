// Biến toàn cục
let loadingElement = null;
const practiceState = {
    sessionId: null,
    numberOfSteps: 0,
    currentScore: 100,
    viewedSteps: new Set()
};

const API_CONFIG = {
    baseURL: '',
    endpoints: {
        newSession: '/api/new_session_id',
        zeroOut: '/api/zero_out_temporary_score',
        updateScore: '/api/update_temporary_score',
        processQuestion: '/process-question',
        processAnswer: '/process-answer'
    },
    headers: {
        'Content-Type': 'application/json'
    }
};

// Utility functions
const DomUtils = {
    getElement: (id) => document.getElementById(id),
    getValue: (element) => element?.getValue?.() || element?.value || '',
    toggleVisibility: (element, show) => {
        if(!element) return;
        element.classList.toggle('hidden', !show);
    },
    disableElement: (element, disabled) => element && (element.disabled = disabled),
    setButtonLoading: (button, loading, text = 'Đang xử lý...') => {
        if (!button) return;
        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = `<span class="btn-spinner"></span> ${text}`;
            button.disabled = true;
        } else {
            button.innerHTML = button.dataset.originalText || 'Gửi';
            button.disabled = false;
        }
    }
};

// Loading management
function showLoading(message = 'Đang xử lý...') {
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

function hideLoading() {
    if (loadingElement) {
        loadingElement.style.opacity = '0';
        loadingElement.style.transform = 'translateY(10px)';
        loadingElement.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            loadingElement?.remove();
            loadingElement = null;
        }, 300);
    }
}

function showAlert(message, type = 'error') {
    alert(message);
}

// API Service
class ApiService {
    static async request(endpoint, data = null, method = 'POST') {
        const config = {
            method,
            headers: API_CONFIG.headers,
            credentials: 'include'
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(endpoint, config);
            if (!response.ok) {
                if (response.status === 404) throw new Error(`Endpoint không tồn tại: ${endpoint}`);
                if (response.status === 403) throw new Error('Bạn cần đăng nhập để thực hiện hành động này');
                if (response.status === 500) throw new Error('Lỗi server nội bộ. Vui lòng thử lại sau.');
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }
}

// Session Management
class SessionManager {
    static async newSession() {
        try {
            const data = await ApiService.request(API_CONFIG.endpoints.newSession);
            if (!data.success) throw new Error(data.comment || 'Không thể tạo phiên mới');
            practiceState.sessionId = data.id;
            practiceState.currentScore = data.grade;
            this.updateGradeDisplay(data.grade);
            return true;
        } catch (error) {
            this.handleError(error, 'Tạo phiên làm bài');
            return false;
        }
    }

    static async zeroOutPoints() {
        if (!this.validateSession()) return false;
        try {
            const data = await ApiService.request(API_CONFIG.endpoints.zeroOut, { id: practiceState.sessionId });
            if (!data.success) throw new Error(data.comment || 'Không thể thiết lập điểm về 0');
            practiceState.currentScore = data.grade;
            this.updateGradeDisplay(data.grade);
            return true;
        } catch (error) {
            this.handleError(error, 'Thiết lập điểm');
            return false;
        }
    }

    static async processPoints(changes) {
        if (!this.validateSession()) return false;
        try {
            const data = await ApiService.request(API_CONFIG.endpoints.updateScore, {
                id: practiceState.sessionId,
                change: Math.floor(changes).toString()
            });
            if (!data.success) throw new Error(data.comment || 'Không thể cập nhật điểm');
            practiceState.currentScore = data.grade;
            this.updateGradeDisplay(data.grade);
            return true;
        } catch (error) {
            this.handleError(error, 'Cập nhật điểm');
            return false;
        }
    }

    static updateGradeDisplay(grade) {
        const gradeElement = DomUtils.getElement('grade');
        if (gradeElement) gradeElement.textContent = `Điểm hiện tại: ${grade}`;
    }

    static validateSession() {
        if (!practiceState.sessionId) {
            showAlert('Phiên làm bài không hợp lệ! Vui lòng bắt đầu bài tập mới.');
            return false;
        }
        return true;
    }

    static handleError(error, context) {
        console.error(`${context} Error:`, error);
        let userMessage = error.message;
        if (error.message.includes('cần đăng nhập')) setTimeout(() => window.location.href = '/login', 2000);
        showAlert(userMessage);
    }
}

// Question Management - ĐÃ ĐƯỢC FIX HOÀN CHỈNH
class QuestionManager {
    static normalizeContent(text) {
        if (!text) return '';
       
        return text
            // Gom tất cả thành 1 dòng, chỉ giữ lại 1 space
            .replace(/\s+/g, ' ')
            // Loại bỏ space thừa quanh $
            .replace(/\s*\$\s*/g, '$')
            // Đảm bảo không có HTML break lines
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/\\n/g, ' ')
            .trim();
    }

    static fixLaTeX(text) {
        if (!text || typeof text !== 'string') return '';
       
        return text
            .replace(/\\x0crac/g, '\\frac')
            .replace(/\x0c/g, '\\')
            .replace(/\\\\/g, '\\')
            .replace(/\$\s+/g, '$')
            .replace(/\s+\$/g, '$')
            .trim();
    }

    static async submitMathQuestion() {
        const lop = DomUtils.getValue(DomUtils.getElement('lop'));
        const question = DomUtils.getValue(DomUtils.getElement('question'));
        const submitBtn = DomUtils.getElement('submitBtn');
        const hiddenSection = DomUtils.getElement('hiddenSection');
        const questionDiv = DomUtils.getElement('question_div');

        if (!lop || !question) return showAlert('Vui lòng nhập đầy đủ lớp và câu hỏi!');
        if (question.length < 2) return showAlert('Câu hỏi quá ngắn.');

        DomUtils.setButtonLoading(submitBtn, true);
        showLoading('Đang suy nghĩ...');

        try {
            const data = await ApiService.request(API_CONFIG.endpoints.processQuestion, { lop, question });
            hideLoading();

            if (data.error) throw new Error(data.error);

            practiceState.viewedSteps.clear();
            practiceState.numberOfSteps = 0;

            this.processAndDisplayData(data);
            
            DomUtils.toggleVisibility(questionDiv, false);
            DomUtils.toggleVisibility(hiddenSection, true);

            await SessionManager.newSession();
        } catch (error) {
            hideLoading(); 
            this.handleError(error, 'Xử lý câu hỏi');
        } finally {
            DomUtils.setButtonLoading(submitBtn, false);
        }
    }

    static processAndDisplayData(data) {
        const problemDiv = DomUtils.getElement('problem');
        const solveDiv = DomUtils.getElement('solve');
        const resultContainer = DomUtils.getElement('answer-result-container');
        if(resultContainer) resultContainer.innerHTML = '';

        if (!problemDiv || !solveDiv) return;

        problemDiv.innerHTML = '';
        solveDiv.innerHTML = '';

        const questionContent = DomUtils.getValue(DomUtils.getElement('question'));
        if (questionContent) problemDiv.innerHTML = `\\[${questionContent}\\]`;

        const questionData = this.extractQuestionData(data);
        if (!questionData) {
            solveDiv.innerHTML = '<p class="text-white text-center">Không có dữ liệu giải bài tập.</p>';
            this.renderMathJax([problemDiv, solveDiv]);
            return;
        }

        this.displaySolutionSteps(solveDiv, questionData);
        this.displayFinalAnswer(solveDiv, questionData);
        this.renderMathJax([problemDiv, solveDiv]);
    }

    static extractQuestionData(data) {
        return Array.isArray(data) && data.length > 0 ? data[0] : data && typeof data === 'object' ? data : null;
    }

    static displaySolutionSteps(container, questionData) {
        if (!questionData.loigiai || !Array.isArray(questionData.loigiai)) {
            container.innerHTML = '<p class="text-white text-center">Không có lời giải chi tiết.</p>';
            return;
        }
        practiceState.numberOfSteps = questionData.loigiai.length;

        const stepsHTML = questionData.loigiai.map((step, index) => {
            const stepNumber = step.buoc || index + 1;
            let stepDetail = step.chitiet || step.noi_dung || `Bước ${stepNumber}`;
           
            // Áp dụng fix LaTeX + normalize
            stepDetail = this.fixLaTeX(stepDetail);
            stepDetail = this.normalizeContent(stepDetail);
           
            return `
                <div id="step-${index + 1}" class="step">
                    <a href="javascript:void(0);" class="step-link" data-step="${index}">
                        Mở gợi ý Bước ${stepNumber}
                    </a>
                    <div class="step-content hidden" data-step="${index}">
                        ${stepDetail}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = stepsHTML;
       
        container.querySelectorAll('.step-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleStepClick(e));
        });
    }

    static displayFinalAnswer(container, questionData) {
        if (!questionData.dapan) return;
       
        let finalAnswer = questionData.dapan;
        finalAnswer = this.fixLaTeX(finalAnswer);
        finalAnswer = this.normalizeContent(finalAnswer);
       
        const answerHTML = `
            <div class="answer-section">
                <a href="javascript:void(0);" id="final-answer-link">
                   Tôi bỏ cuộc - Xem đáp án cuối cùng (0 điểm)
                </a>
                <div id="final-answer-content" class="hidden">
                    Đáp án: ${finalAnswer}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', answerHTML);
       
        const link = DomUtils.getElement('final-answer-link');
        if(link) link.addEventListener('click', this.handleFinalAnswerClick, { once: true });
    }

    static handleStepClick = (e) => {
        const link = e.target.closest('.step-link');
        if (!link || practiceState.viewedSteps.has(link.dataset.step)) return;

        const stepContent = link.nextElementSibling;
        if (!stepContent) return;

        stepContent.classList.remove('hidden');
        link.style.display = 'none';
        
        practiceState.viewedSteps.add(link.dataset.step);
        this.renderMathAggressive([stepContent]);

        if (practiceState.sessionId && practiceState.numberOfSteps > 0) {
            const deduction = -100 / practiceState.numberOfSteps;
            SessionManager.processPoints(deduction);
        }
    }

    static appendContinueButton(container) {
        if (container.querySelector('.btn-continue')) return;

        const btn = document.createElement('button');
        btn.className = 'btn-continue';
        btn.innerHTML = 'Tiếp tục bài toán khác';
        btn.onclick = () => window.location.reload();
        container.appendChild(btn);
    }

    static handleFinalAnswerClick = () => {
        const content = DomUtils.getElement('final-answer-content');
        const link = DomUtils.getElement('final-answer-link');
        
        DomUtils.toggleVisibility(content, true);
        DomUtils.toggleVisibility(link, false);
        
        this.renderMathAggressive([content]);
        if(practiceState.sessionId) SessionManager.zeroOutPoints();

        const container = document.querySelector('.answer-section');
        this.appendContinueButton(container);
    }

    static async submitAnswer() {
        const userAnswer = DomUtils.getValue(DomUtils.getElement('user-answer'));
        const submitBtn = document.querySelector('.submit-answer-btn') || document.querySelector('button[onclick="submitAnswer()"]');
        
        const lop = DomUtils.getValue(DomUtils.getElement('lop'));
        const question = DomUtils.getValue(DomUtils.getElement('question'));

        if (!userAnswer) return showAlert('Vui lòng nhập câu trả lời!');
        if (!SessionManager.validateSession()) return;

        if(submitBtn) submitBtn.disabled = true;
        showLoading('Đang kiểm tra câu trả lời...');

        try {
            const result = await ApiService.request(API_CONFIG.endpoints.processAnswer, {
                lop, question, user_answer: userAnswer, id: practiceState.sessionId
            });
            
            hideLoading(); 
            this.showAnswerResult(result);
        } catch (error) {
            hideLoading(); 
            this.handleError(error, 'Kiểm tra đáp án');
            if(submitBtn) submitBtn.disabled = false;
        }
    }

    static showAnswerResult(result) {
        const container = DomUtils.getElement('answer-result-container') || DomUtils.getElement('hiddenSection');
        const oldResult = document.getElementById('answer-result');
        if(oldResult) oldResult.remove();

        const resultDiv = document.createElement('div');
        resultDiv.id = 'answer-result';
       
        const data = Array.isArray(result) ? result[0] : result;
        const isCorrect = data?.acstatus === 'true';
       
        resultDiv.className = `result ${isCorrect ? 'correct' : 'incorrect'}`;
       
        let explain = data?.explain || '';
        if (!explain || explain === 'null') {
            explain = 'Không có giải thích chi tiết.';
        } else {
            explain = this.fixLaTeX(explain);
            explain = this.normalizeContent(explain);
        }

        resultDiv.innerHTML = `
            <h3>${isCorrect ? 'CHÍNH XÁC!' : 'CHƯA ĐÚNG'}</h3>
            <p><strong>Giải thích:</strong> ${explain}</p>
        `;
       
        if(DomUtils.getElement('answer-result-container')) {
            DomUtils.getElement('answer-result-container').appendChild(resultDiv);
        } else {
            container.appendChild(resultDiv);
        }

        setTimeout(() => {
            this.renderMathAggressive([resultDiv]);
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);

        this.appendContinueButton(resultDiv);
    }

    // PHƯƠNG THỨC RENDER MỚI - CỰC MẠNH
    static renderMathAggressive(elements) {
        const validElements = elements.filter(el => el && el instanceof HTMLElement);
        if (validElements.length === 0) return;

        if (window.MathJax && window.MathJax.typesetPromise) {
            if (window.MathJax.config && window.MathJax.config.tex) {
                window.MathJax.config.tex.inlineMath = [['$', '$'], ['\\(', '\\)']];
            }
           
            window.MathJax.typesetPromise(validElements)
                .then(() => {
                    console.log('MathJax aggressive rendering completed');
                    this.forceAggressiveInline();
                })
                .catch(err => {
                    console.warn('MathJax failed, forcing inline:', err);
                    this.forceAggressiveInline();
                });
        } else {
            this.forceAggressiveInline();
        }
    }

    static forceAggressiveInline() {
        setTimeout(() => {
            const allMathElements = document.querySelectorAll(
                'mjx-container, .MathJax, .MathJax_Display, .MathJax_Preview, [class*="math"]'
            );
           
            allMathElements.forEach(mathEl => {
                mathEl.style.cssText = `
                    display: inline !important;
                    margin: 0 !important;
                    padding: 0 1px !important;
                    line-height: 1 !important;
                    vertical-align: middle !important;
                    width: auto !important;
                    height: auto !important;
                    float: none !important;
                    clear: none !important;
                    white-space: nowrap !important;
                `;
               
                const children = mathEl.querySelectorAll('*');
                children.forEach(child => {
                    child.style.display = 'inline !important';
                    child.style.margin = '0 !important';
                    child.style.padding = '0 !important';
                });
            });

            const stepContents = document.querySelectorAll('.step-content, .result, #final-answer-content');
            stepContents.forEach(content => {
                content.style.whiteSpace = 'normal';
                content.style.wordWrap = 'break-word';
               
                const children = Array.from(content.childNodes);
                children.forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE) {
                        child.textContent = child.textContent.replace(/\s+/g, ' ');
                    }
                });
            });
        }, 150);
    }

    // Giữ lại tên cũ để tương thích
    static renderMathJax(elements) {
        this.renderMathAggressive(elements);
    }

    static handleError(error, context) {
        console.error(`${context} Error:`, error);
        showAlert(`${context} thất bại: ${error.message}`);
    }
}

// Global functions
function navigateToHome() {
    window.location.href = '/';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Practice page initialized (Fixed LaTeX + Inline Rendering)');
});

// Export to global scope
window.submitMathQuestion = QuestionManager.submitMathQuestion.bind(QuestionManager);
window.submitAnswer = QuestionManager.submitAnswer.bind(QuestionManager);
window.navigateToHome = navigateToHome;