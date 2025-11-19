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

// API configuration - FIXED: Sử dụng endpoint chính xác
const API_CONFIG = {
    baseURL: '', // Sử dụng relative path
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
    getValue: (element) => {
        if (!element) return '';
        return element.getValue?.() || element.value || '';
    },
    toggleVisibility: (element, show) => {
        if (element) {
            element.classList.toggle('hidden', !show);
        }
    },
    disableElement: (element, disabled) => {
        if (element) {
            element.disabled = disabled;
        }
    },
    setButtonLoading: (button, loading, loadingText = 'Đang xử lý...') => {
        if (button) {
            if (loading) {
                button.setAttribute('data-original-text', button.textContent);
                button.textContent = loadingText;
                button.disabled = true;
            } else {
                button.textContent = button.getAttribute('data-original-text') || 'Gửi';
                button.disabled = false;
            }
        }
    }
};

// API service
class ApiService {
    static async request(endpoint, data = null, method = 'POST') {
        const config = {
            method,
            headers: API_CONFIG.headers,
            credentials: 'include' // QUAN TRỌNG: Gửi session cookie
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(endpoint, config);
            
            if (!response.ok) {
                // Xử lý các HTTP status code khác nhau
                if (response.status === 404) {
                    throw new Error(`Endpoint không tồn tại: ${endpoint}`);
                } else if (response.status === 403) {
                    throw new Error('Bạn cần đăng nhập để thực hiện hành động này');
                } else if (response.status === 500) {
                    throw new Error('Lỗi server nội bộ. Vui lòng thử lại sau.');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }
}

// Session management
class SessionManager {
    static async newSession() {
        try {
            const data = await ApiService.request(API_CONFIG.endpoints.newSession);
            
            if (!data.success) {
                throw new Error(data.comment || 'Không thể tạo phiên mới');
            }
            
            practiceState.sessionId = data.id;
            practiceState.currentScore = data.grade;
            this.updateGradeDisplay(data.grade);
            
            console.log('New session created:', data.id);
            return true;
        } catch (error) {
            this.handleError(error, 'Tạo phiên làm bài');
            return false;
        }
    }

    static async zeroOutPoints() {
        if (!this.validateSession()) return false;

        try {
            const data = await ApiService.request(API_CONFIG.endpoints.zeroOut, {
                id: practiceState.sessionId
            });
            
            if (!data.success) {
                throw new Error(data.comment || 'Không thể thiết lập điểm về 0');
            }
            
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
            
            if (!data.success) {
                throw new Error(data.comment || 'Không thể cập nhật điểm');
            }
            
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
        if (gradeElement) {
            gradeElement.textContent = `Số điểm hiện tại của bạn: ${grade}`;
        }
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
        
        let userMessage = '';
        if (error.message.includes('Endpoint không tồn tại')) {
            userMessage = 'Tính năng này đang được bảo trì. Vui lòng thử lại sau.';
        } else if (error.message.includes('cần đăng nhập')) {
            userMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else if (error.message.includes('Lỗi server')) {
            userMessage = 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
        } else {
            userMessage = `${context} thất bại: ${error.message}`;
        }
        
        showAlert(userMessage);
    }
}

// Question management
class QuestionManager {
    static async submitMathQuestion() {
        const lop = DomUtils.getValue(DomUtils.getElement('lop'));
        const question = DomUtils.getValue(DomUtils.getElement('question'));
        const submitBtn = DomUtils.getElement('submitBtn');
        const hiddenSection = DomUtils.getElement('hiddenSection');
        const questionDiv = DomUtils.getElement('question_div');

        // Validation
        if (!lop || !question) {
            showAlert('Vui lòng nhập đầy đủ lớp và câu hỏi!');
            return;
        }

        if (question.length < 5) {
            showAlert('Câu hỏi quá ngắn. Vui lòng nhập câu hỏi chi tiết hơn.');
            return;
        }

        DomUtils.setButtonLoading(submitBtn, true, 'Đang xử lý...');

        try {
            const data = await ApiService.request(API_CONFIG.endpoints.processQuestion, {
                lop,
                question
            });

            if (data.error) {
                throw new Error(data.error);
            }

            // Reset và cập nhật state
            practiceState.viewedSteps.clear();
            practiceState.numberOfSteps = 0;
            
            this.processAndDisplayData(data);
            DomUtils.toggleVisibility(questionDiv, false);
            DomUtils.toggleVisibility(hiddenSection, true);
            
            // Tạo phiên mới - bắt lỗi nhưng không dừng flow
            const sessionCreated = await SessionManager.newSession();
            if (!sessionCreated) {
                console.warn('Không thể tạo phiên mới, nhưng vẫn hiển thị kết quả');
            }
            
        } catch (error) {
            this.handleError(error, 'Xử lý câu hỏi');
        } finally {
            DomUtils.setButtonLoading(submitBtn, false);
        }
    }

    static processAndDisplayData(data) {
        const problemDiv = DomUtils.getElement('problem');
        const solveDiv = DomUtils.getElement('solve');

        if (!problemDiv || !solveDiv) {
            console.error('Required elements not found');
            return;
        }

        // Clear previous content
        problemDiv.innerHTML = '';
        solveDiv.innerHTML = '';

        // Display problem
        const questionContent = DomUtils.getValue(DomUtils.getElement('question'));
        if (questionContent) {
            problemDiv.innerHTML = `\\[${questionContent}\\]`;
        }

        // Extract question data
        const questionData = this.extractQuestionData(data);
        if (!questionData) {
            solveDiv.innerHTML = '<p>Không có dữ liệu giải bài tập.</p>';
            this.renderMathJax([problemDiv, solveDiv]);
            return;
        }

        // Display solution steps
        this.displaySolutionSteps(solveDiv, questionData);
        
        // Display final answer
        this.displayFinalAnswer(solveDiv, questionData);

        this.renderMathJax([problemDiv, solveDiv]);
    }

    static extractQuestionData(data) {
        if (Array.isArray(data) && data.length > 0) {
            return data[0];
        } else if (data && typeof data === 'object') {
            return data;
        }
        return null;
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

        container.innerHTML = stepsHTML;

        // Add event listener for step clicks
        container.removeEventListener('click', this.handleStepClick);
        container.addEventListener('click', this.handleStepClick);
    }

    static displayFinalAnswer(container, questionData) {
        if (!questionData.dapan) return;

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
        container.innerHTML += answerHTML;

        const finalAnswerLink = DomUtils.getElement('final-answer-link');
        if (finalAnswerLink) {
            finalAnswerLink.addEventListener('click', this.handleFinalAnswerClick, { once: true });
        }
    }

    static handleStepClick = (e) => {
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
        
        // Mark as viewed and deduct points
        practiceState.viewedSteps.add(stepIndex);
        
        this.renderMathJax([stepContent]);
        
        // Deduct points nếu session tồn tại
        if (practiceState.sessionId && practiceState.numberOfSteps > 0) {
            const pointDeduction = -100 / practiceState.numberOfSteps;
            SessionManager.processPoints(pointDeduction);
        }
    }

    static handleFinalAnswerClick = () => {
        const finalAnswerContent = DomUtils.getElement('final-answer-content');
        const finalAnswerLink = DomUtils.getElement('final-answer-link');
        
        if (finalAnswerContent) {
            finalAnswerContent.classList.remove('hidden');
            this.renderMathJax([finalAnswerContent]);
        }
        
        if (finalAnswerLink) {
            finalAnswerLink.classList.add('hidden');
        }
        
        // Zero out points nếu session tồn tại
        if (practiceState.sessionId) {
            SessionManager.zeroOutPoints();
        }
    }

    static async submitAnswer() {
        const userAnswer = DomUtils.getValue(DomUtils.getElement('user-answer'));
        const submitBtn = document.querySelector('button[onclick="submitAnswer()"]');
        const lop = DomUtils.getValue(DomUtils.getElement('lop'));
        const question = DomUtils.getValue(DomUtils.getElement('question'));

        if (!userAnswer) {
            showAlert('Vui lòng nhập câu trả lời!');
            return;
        }

        if (!SessionManager.validateSession()) {
            return;
        }

        DomUtils.setButtonLoading(submitBtn, true, 'Đang kiểm tra...');

        try {
            const result = await ApiService.request(API_CONFIG.endpoints.processAnswer, {
                lop,
                question,
                user_answer: userAnswer,
                id: practiceState.sessionId
            });

            this.showAnswerResult(result);

        } catch (error) {
            this.handleError(error, 'Kiểm tra đáp án');
        } finally {
            DomUtils.setButtonLoading(submitBtn, false);
        }
    }

    static showAnswerResult(result) {
        let resultDiv = DomUtils.getElement('answer-result');

        if (!resultDiv) {
            resultDiv = document.createElement('div');
            resultDiv.id = 'answer-result';
            resultDiv.className = 'result';
            const hiddenSection = DomUtils.getElement('hiddenSection');
            if (hiddenSection) {
                hiddenSection.appendChild(resultDiv);
            }
        }

        const resultData = Array.isArray(result) ? result[0] : result;
        const acstatus = resultData?.acstatus;
        const explain = resultData?.explain || 'Không có giải thích';
        const fixed_explain = explain.replace(/\\n/g, "\n");
        const statusText = acstatus === 'true' ? 'ĐÚNG' : 'SAI';
        const statusClass = acstatus === 'true' ? 'correct' : 'incorrect';
        
        resultDiv.innerHTML = `
            <p class="${statusClass}"><strong>Kết quả: ${statusText}</strong></p>
            <p><strong>Giải thích:</strong> ${fixed_explain}</p>
        `;

        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.renderMathJax([resultDiv]);
    }

    static renderMathJax(elements) {
        if (window.MathJax && window.MathJax.typesetPromise) {
            setTimeout(() => {
                window.MathJax.typesetPromise(elements).catch((err) => {
                    console.error('MathJax rendering error:', err);
                });
            }, 100);
        }
    }

    static handleError(error, context) {
        console.error(`${context} Error:`, error);
        
        let userMessage = error.message;
        if (error.message.includes('HTTP error')) {
            userMessage = `Có lỗi kết nối xảy ra. Vui lòng thử lại!`;
        }
        
        showAlert(`${context} thất bại: ${userMessage}`);
    }
}

// Navigation
function navigateToHome() {
    window.location.href = '/';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add any initialization code here
    console.log('Practice page initialized');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    const solveDiv = DomUtils.getElement('solve');
    if (solveDiv) {
        solveDiv.removeEventListener('click', QuestionManager.handleStepClick);
    }
});

// Global exports for HTML onclick handlers
window.newSession = SessionManager.newSession.bind(SessionManager);
window.ZeroOutPoint = SessionManager.zeroOutPoints.bind(SessionManager);
window.processPoint = SessionManager.processPoints.bind(SessionManager);
window.submitMathQuestion = QuestionManager.submitMathQuestion.bind(QuestionManager);
window.submitAnswer = QuestionManager.submitAnswer.bind(QuestionManager);
window.handleStepClick = QuestionManager.handleStepClick.bind(QuestionManager);
window.handleFinalAnswerClick = QuestionManager.handleFinalAnswerClick.bind(QuestionManager);
window.navigateToHome = navigateToHome;