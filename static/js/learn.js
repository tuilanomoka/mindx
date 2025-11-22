// Math Learning Module
class MathLearning {
    constructor() {
        this.loadingElement = null;
        this.init();
    }

    init() {
        console.log('Math Learning initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Enter key support for math field
        const mathField = document.getElementById('question');
        if (mathField) {
            mathField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.submitMathQuestion();
                }
            });
        }
    }

    showAlert(message, type = 'error') {
        // Simple alert replacement
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : '#4CAF50'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => alertDiv.remove(), 300);
        }, 4000);
    }

    showLoading(message = 'Đang phân tích bài toán...') {
        if (this.loadingElement) {
            this.hideLoading();
        }

        this.loadingElement = document.createElement('div');
        this.loadingElement.className = 'loading-toast';
        this.loadingElement.innerHTML = `
            <div class="spinner-icon"></div>
            <span class="loading-text">${message}</span>
        `;
        document.body.appendChild(this.loadingElement);
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.animation = 'slideInToast 0.3s ease reverse';
            setTimeout(() => {
                if (this.loadingElement && this.loadingElement.parentNode) {
                    this.loadingElement.remove();
                }
                this.loadingElement = null;
            }, 300);
        }
    }

    async submitMathQuestion() {
        const lop = document.getElementById('lop')?.value;
        const questionField = document.getElementById('question');
        const question = questionField?.getValue?.() || questionField?.value || '';
        
        const submitBtn = document.getElementById('submitBtn');
        const hiddenSection = document.getElementById('hiddenSection');
        const questionDiv = document.getElementById('question_div');

        // Validate input
        if (!lop || !question.trim()) {
            this.showAlert('Vui lòng nhập đầy đủ lớp và câu hỏi!');
            return;
        }

        // UI state
        submitBtn.disabled = true;
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '⏳ Đang xử lý...';
        this.showLoading('AI đang giải bài toán...');

        try {
            const response = await fetch('/process-question', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ 
                    lop: lop.trim(),
                    question: question.trim()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.hideLoading();

            if (data.error) {
                this.showAlert('Có lỗi xảy ra: ' + data.error);
            } else {
                // Show solution section
                questionDiv.classList.add('hidden');
                hiddenSection.classList.remove('hidden');
                this.processAndDisplayData(data);
            }
        } catch (error) {
            console.error('Error:', error);
            this.hideLoading();
            this.showAlert('Có lỗi kết nối xảy ra. Vui lòng thử lại!');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    }

    fixLaTeX(text) {
        if (!text || typeof text !== 'string') return '';
        
        // Replace common LaTeX issues
        return text
            .replace(/\\x0crac/g, '\\frac')
            .replace(/\x0c/g, '\\')
            .replace(/\\\\/g, '\\')
            .replace(/\$\s+/g, '$')
            .replace(/\s+\$/g, '$')
            .trim();
    }

    processAndDisplayData(data) {
    const problemDiv = document.getElementById('problem');
    const solveDiv = document.getElementById('solve');
    const footerDiv = document.getElementById('action-footer');

    if (!problemDiv || !solveDiv) {
        console.error('Required DOM elements not found');
        return;
    }

    // Clear previous content
    problemDiv.innerHTML = '';
    solveDiv.innerHTML = '';
    if (footerDiv) footerDiv.innerHTML = '';

    // Display problem
    const questionField = document.getElementById('question');
    const questionContent = questionField?.getValue?.() || questionField?.value || '';
    if (questionContent) {
        problemDiv.innerHTML = `\\[${questionContent}\\]`;
    }

    // Process data
    let questionData = null;
    if (Array.isArray(data) && data.length > 0) {
        questionData = data[0];
    } else if (data && typeof data === 'object') {
        questionData = data;
    }

    if (!questionData || !questionData.loigiai || !Array.isArray(questionData.loigiai)) {
        solveDiv.innerHTML = '<div class="step"><div class="step-content"><p class="text-center">Không có dữ liệu giải bài tập.</p></div></div>';
        return;
    }

    // Display solution steps - XỬ LÝ ĐẶC BIỆT
    let stepsHTML = '';
    
    questionData.loigiai.forEach((step, index) => {
        const stepNumber = step.buoc || (index + 1).toString();
        let stepDetail = step.chitiet || step.noi_dung || `Bước ${stepNumber}`;

        // Fix LaTeX issues
        stepDetail = this.fixLaTeX(stepDetail);

        // QUAN TRỌNG: Xử lý xuống dòng - gom tất cả thành 1 dòng
        stepDetail = this.normalizeContent(stepDetail);

        stepsHTML += `
            <div class="step">
                <h4>Bước ${stepNumber}</h4>
                <div class="step-content" style="display: block; line-height: 1.6;">
                    ${stepDetail}
                </div>
            </div>
        `;
    });
    
    solveDiv.innerHTML = stepsHTML;

    // Display answer
    if (questionData.dapan) {
        let finalAnswer = this.fixLaTeX(questionData.dapan);
        finalAnswer = this.normalizeContent(finalAnswer);
        solveDiv.innerHTML += `
            <div class="answer-section">
                <h3>📝 Đáp án:</h3>
                <div class="answer-content" style="display: block;">
                    ${finalAnswer}
                </div>
            </div>
        `;
    }

    // Add continue button
    if (footerDiv) {
        const continueBtn = document.createElement('button');
        continueBtn.className = 'btn-continue';
        continueBtn.innerHTML = '🔄 Tiếp tục bài toán khác';
        continueBtn.onclick = () => {
            window.location.reload();
        };
        footerDiv.appendChild(continueBtn);
    }

    // Render math với phương pháp mới
    this.renderMathAggressive([problemDiv, solveDiv]);
}

// Hàm mới: Chuẩn hóa nội dung để tránh xuống dòng
normalizeContent(text) {
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

// Phương pháp render cực đoan
renderMathAggressive(elements) {
    const validElements = elements.filter(el => el && el instanceof HTMLElement);
    if (validElements.length === 0) return;

    if (window.MathJax && window.MathJax.typesetPromise) {
        // Cấu hình MathJax để luôn dùng inline
        window.MathJax.config.tex.inlineMath = [['$', '$'], ['\\(', '\\)']];
        window.MathJax.config.tex.displayMath = []; // Không dùng display math
        
        window.MathJax.typesetPromise(validElements)
            .then(() => {
                console.log('MathJax aggressive rendering completed');
                this.forceAggressiveInline();
            })
            .catch(err => {
                console.warn('MathJax aggressive rendering failed:', err);
                this.forceAggressiveInline();
            });
    } else {
        this.forceAggressiveInline();
    }
}

// Force inline cực đoan
forceAggressiveInline() {
    setTimeout(() => {
        // Tìm tất cả math elements
        const allMathElements = document.querySelectorAll(
            'mjx-container, .MathJax, .MathJax_Display, .MathJax_Preview, [class*="math"]'
        );
        
        allMathElements.forEach(mathEl => {
            // Reset hoàn toàn
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
            
            // Force inline cho tất cả children
            const children = mathEl.querySelectorAll('*');
            children.forEach(child => {
                child.style.display = 'inline !important';
                child.style.margin = '0 !important';
                child.style.padding = '0 !important';
            });
        });

        // Đảm bảo step content không bị ảnh hưởng
        const stepContents = document.querySelectorAll('.step-content');
        stepContents.forEach(content => {
            content.style.whiteSpace = 'normal';
            content.style.wordWrap = 'break-word';
            
            // Đảm bảo text và math cùng dòng
            const children = Array.from(content.childNodes);
            children.forEach(child => {
                if (child.nodeType === Node.TEXT_NODE) {
                    child.textContent = child.textContent.replace(/\s+/g, ' ');
                }
            });
        });

    }, 150);
}

    renderMathWithRetry(elements, retryCount = 0) {
        const validElements = elements.filter(el => el && el instanceof HTMLElement);
        if (validElements.length === 0) return;

        const maxRetries = 3;
        
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise(validElements)
                .then(() => {
                    console.log('MathJax rendering completed successfully');
                    this.forceInlineMath();
                })
                .catch(err => {
                    console.warn('MathJax rendering failed:', err);
                    if (retryCount < maxRetries) {
                        setTimeout(() => {
                            this.renderMathWithRetry(validElements, retryCount + 1);
                        }, 500 * (retryCount + 1));
                    } else {
                        this.forceInlineMath();
                    }
                });
        } else {
            console.warn('MathJax not available');
            this.forceInlineMath();
        }
    }

    forceInlineMath() {
        // Force inline display for all math elements
        setTimeout(() => {
            const mathContainers = document.querySelectorAll('mjx-container');
            mathContainers.forEach(container => {
                container.style.display = 'inline';
                container.style.margin = '0';
                container.style.padding = '0 2px';
                container.style.verticalAlign = 'middle';
            });

            // Additional fix for step content math
            const stepContents = document.querySelectorAll('.step-content');
            stepContents.forEach(content => {
                const mathElements = content.querySelectorAll('.MathJax, mjx-container');
                mathElements.forEach(math => {
                    math.style.display = 'inline';
                    math.style.margin = '0';
                    math.style.padding = '0';
                });
            });
        }, 100);
    }
}

// Global functions for HTML onclick
function submitMathQuestion() {
    if (!window.mathLearning) {
        window.mathLearning = new MathLearning();
    }
    window.mathLearning.submitMathQuestion();
}

function navigateToHome() {
    window.location.href = '/';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.mathLearning = new MathLearning();
    
    // Add CSS for alert animations
    if (!document.querySelector('#dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && window.mathLearning) {
        // Re-initialize if needed
        window.mathLearning.forceInlineMath();
    }
});