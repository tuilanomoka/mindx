function showAlert(message, type = 'error') {
    const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
    alert(message);
}

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

const DomUtils = {
    getElement: (id) => document.getElementById(id),
    getValue: (element) => element?.getValue?.() || element?.value || '',
    toggleVisibility: (element, show) => element && element.classList.toggle('hidden', !show),
    disableElement: (element, disabled) => element && (element.disabled = disabled),
    setButtonLoading: (button, loading, text = 'Đang xử lý...') => {
        if (!button) return;
        if (loading) {
            button.dataset.originalText = button.textContent;
            button.textContent = text;
            button.disabled = true;
        } else {
            button.textContent = button.dataset.originalText || 'Gửi';
            button.disabled = false;
        }
    }
};

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

class ApiService {
    static async request(endpoint, data = null, method = 'POST') {
        showLoading();
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
        } finally {
            hideLoading();
        }
    }
}

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
        if (gradeElement) gradeElement.textContent = `Số điểm hiện tại của bạn: ${grade}`;
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
        let userMessage = error.message.includes('Endpoint không tồn tại') ? 'Tính năng này đang được bảo trì. Vui lòng thử lại sau.' :
                         error.message.includes('cần đăng nhập') ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' :
                         error.message.includes('Lỗi server') ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.' :
                         `${context} thất bại: ${error.message}`;
        if (error.message.includes('cần đăng nhập')) setTimeout(() => window.location.href = '/login', 2000);
        showAlert(userMessage);
    }
}

class QuestionManager {
    static async submitMathQuestion() {
        const lop = DomUtils.getValue(DomUtils.getElement('lop'));
        const question = DomUtils.getValue(DomUtils.getElement('question'));
        const submitBtn = DomUtils.getElement('submitBtn');
        const hiddenSection = DomUtils.getElement('hiddenSection');
        const questionDiv = DomUtils.getElement('question_div');

        if (!lop || !question) return showAlert('Vui lòng nhập đầy đủ lớp và câu hỏi!');
        if (question.length < 5) return showAlert('Câu hỏi quá ngắn. Vui lòng nhập câu hỏi chi tiết hơn.');

        DomUtils.setButtonLoading(submitBtn, true);
        try {
            const data = await ApiService.request(API_CONFIG.endpoints.processQuestion, { lop, question });
            if (data.error) throw new Error(data.error);

            practiceState.viewedSteps.clear();
            practiceState.numberOfSteps = 0;

            this.processAndDisplayData(data);
            DomUtils.toggleVisibility(questionDiv, false);
            DomUtils.toggleVisibility(hiddenSection, true);

            await SessionManager.newSession();
        } catch (error) {
            this.handleError(error, 'Xử lý câu hỏi');
        } finally {
            DomUtils.setButtonLoading(submitBtn, false);
        }
    }

    static processAndDisplayData(data) {
        const problemDiv = DomUtils

.getElement('problem');
        const solveDiv = DomUtils.getElement('solve');
        if (!problemDiv || !solveDiv) return console.error('Required elements not found');

        problemDiv.innerHTML = '';
        solveDiv.innerHTML = '';

        const questionContent = DomUtils.getValue(DomUtils.getElement('question'));
        if (questionContent) problemDiv.innerHTML = `\\[${questionContent}\\]`;

        const questionData = this.extractQuestionData(data);
        if (!questionData) {
            solveDiv.innerHTML = '<p>Không có dữ liệu giải bài tập.</p>';
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
            container.innerHTML = '<p>Không có lời giải chi tiết.</p>';
            return;
        }
        practiceState.numberOfSteps = questionData.loigiai.length;

        const stepsHTML = questionData.loigiai.map((step, index) => {
            const stepNumber = step.buoc || index + 1;
            const stepDetail = step.chitiet || step.noi_dung || `Bước ${stepNumber}`;
            return `
                <div id="step-${index + 1}" class="step">
                    <a href="javascript:void(0);" class="step-link" data-step="${index}">
                        Bước ${stepNumber}
                    </a>
                    <div class="step-content hidden" data-step="${index}">
                        ${stepDetail}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = stepsHTML;
        container.removeEventListener('click', this.handleStepClick);
        container.addEventListener('click', this.handleStepClick);
    }

    static displayFinalAnswer(container, questionData) {
        if (!questionData.dapan) return;
        const answerHTML = `
            <div class="answer-section">
                <a href="javascript:void(0);" id="final-answer-link">
                    <h3>Xem đáp án cuối cùng</h3>
                </a>
                <div id="final-answer-content" class="hidden">
                    ${questionData.dapan}
                </div>
            </div>
        `;
        container.innerHTML += answerHTML;
        DomUtils.getElement('final-answer-link')?.addEventListener('click', this.handleFinalAnswerClick, { once: true });
    }

    static handleStepClick = (e) => {
        const link = e.target.closest('.step-link');
        if (!link || practiceState.viewedSteps.has(link.dataset.step)) return;

        const stepContent = link.nextElementSibling;
        if (!stepContent) return;

        stepContent.classList.remove('hidden');
        link.classList.add('hidden');
        practiceState.viewedSteps.add(link.dataset.step);
        this.renderMathJax([stepContent]);

        if (practiceState.sessionId && practiceState.numberOfSteps > 0) {
            const deduction = -100 / practiceState.numberOfSteps;
            SessionManager.processPoints(deduction);
        }
    }

    static handleFinalAnswerClick = () => {
        const content = DomUtils.getElement('final-answer-content');
        const link = DomUtils.getElement('final-answer-link');
        content?.classList.remove('hidden');
        link?.classList.add('hidden');
        this.renderMathJax([content]);
        practiceState.sessionId && SessionManager.zeroOutPoints();
    }

    static async submitAnswer() {
        const userAnswer = DomUtils.getValue(DomUtils.getElement('user-answer'));
        const submitBtn = document.querySelector('button[onclick="submitAnswer()"]');
        const lop = DomUtils.getValue(DomUtils.getElement('lop'));
        const question = DomUtils.getValue(DomUtils.getElement('question'));

        if (!userAnswer) return showAlert('Vui lòng nhập câu trả lời!');
        if (!SessionManager.validateSession()) return;

        submitBtn?.remove();
        window.submitAnswer = () => console.warn('Hàm submitAnswer đã bị vô hiệu hoá');

        try {
            const result = await ApiService.request(API_CONFIG.endpoints.processAnswer, {
                lop, question, user_answer: userAnswer, id: practiceState.sessionId
            });
            this.showAnswerResult(result);
        } catch (error) {
            this.handleError(error, 'Kiểm tra đáp án');
        }
    }

    static showAnswerResult(result) {
        let resultDiv = DomUtils.getElement('answer-result');
        if (!resultDiv) {
            resultDiv = document.createElement('div');
            resultDiv.id = 'answer-result';
            resultDiv.className = 'result';
            DomUtils.getElement('hiddenSection')?.appendChild(resultDiv);
        }

        const data = Array.isArray(result) ? result[0] : result;
        const status = data?.acstatus === 'true' ? 'ĐÚNG' : 'SAI';
        const statusClass = data?.acstatus === 'true' ? 'correct' : 'incorrect';
        const explain = (data?.explain || 'Không có giải thích').replace(/\\n/g, '\n');

        resultDiv.innerHTML = `
            <p class="${statusClass}"><strong>Kết quả: ${status}</strong></p>
            <p><strong>Giải thích:</strong> ${explain}</p>
        `;
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.renderMathJax([resultDiv]);
    }

    static renderMathJax(elements) {
        if (window.MathJax?.typesetPromise) {
            setTimeout(() => window.MathJax.typesetPromise(elements).catch(err => console.error('MathJax error:', err)), 100);
        }
    }

    static handleError(error, context) {
        console.error(`${context} Error:`, error);
        const msg = error.message.includes('HTTP error') ? 'Có lỗi kết nối xảy ra. Vui lòng thử lại!' : error.message;
        showAlert(`${context} thất bại: ${msg}`);
    }
}

function navigateToHome() {
    window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', () => console.log('Practice page initialized'));

window.addEventListener('beforeunload', () => {
    const solveDiv = DomUtils.getElement('solve');
    solveDiv && solveDiv.removeEventListener('click', QuestionManager.handleStepClick);
});

window.newSession = SessionManager.newSession.bind(SessionManager);
window.ZeroOutPoint = SessionManager.zeroOutPoints.bind(SessionManager);
window.processPoint = SessionManager.processPoints.bind(SessionManager);
window.submitMathQuestion = QuestionManager.submitMathQuestion.bind(QuestionManager);
window.submitAnswer = QuestionManager.submitAnswer.bind(QuestionManager);
window.handleStepClick = QuestionManager.handleStepClick.bind(QuestionManager);
window.handleFinalAnswerClick = QuestionManager.handleFinalAnswerClick.bind(QuestionManager);
window.navigateToHome = navigateToHome;