from flask import Flask, session, request, jsonify, redirect, url_for, render_template, send_from_directory
from utilities.database import Database
from utilities.gemini import Gemini
import os
from functools import wraps

app = Flask(__name__)
app.secret_key = os.urandom(24)
db = Database()

# Constants
PROMPT_DIR = 'resources/prompts'
QUESTION_PROMPT_FILE = 'question.txt'
COMPARE_PROMPT_FILE = 'compare.txt'

# Decorators
def login_required(f):
    """Decorator to require login for protected routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

def redirect_if_logged_in(f):
    """Decorator to redirect if user is already logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' in session:
            return redirect(url_for('home_page'))
        return f(*args, **kwargs)
    return decorated_function

# Helper functions
def get_username():
    """Get username from session"""
    return session.get('username')

def read_prompt_file(filename):
    """Read prompt file with error handling"""
    try:
        filepath = os.path.join(PROMPT_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as file:
            return file.read()
    except FileNotFoundError:
        app.logger.error(f"Prompt file not found: {filename}")
        return None

def create_prompt_content(lop, question_data, prompt_template):
    """Create prompt content by combining parameters with template"""
    return f"Lớp: {lop}\nBài toán: {question_data}\n\n{prompt_template}"

# Routes
@app.route('/')
def index():
    return render_template('index.html', username=get_username())

@app.route('/login')
@redirect_if_logged_in
def login_page():
    return render_template('login.html', username=get_username())

@app.route('/register')
@redirect_if_logged_in
def register_page():
    return render_template('register.html', username=get_username())

@app.route('/home')
@login_required
def home_page():
    return render_template('home.html', username=get_username())

@app.route('/practice')
@login_required
def practice_page():
    return render_template('practice.html', username=get_username())

@app.route('/rank')
@login_required
def rank_page():
    return render_template('rank.html', username=get_username())

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('resources/icons', 'favicon.ico')

# API Routes
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'Không có dữ liệu'}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Vui lòng nhập đầy đủ thông tin'}), 400
    
    if db.login_user(username, password):
        session['username'] = username
        return jsonify({'success': True, 'message': 'Đăng nhập thành công!'})
    else:
        return jsonify({'success': False, 'message': 'Sai tên đăng nhập hoặc mật khẩu!'})

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'Không có dữ liệu'}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Vui lòng nhập đầy đủ thông tin'}), 400
    
    if db.user_exists(username):
        return jsonify({'success': False, 'message': 'Tên đăng nhập đã tồn tại!'})
    
    if db.register_user(username, password):
        return jsonify({'success': True, 'message': 'Đăng ký thành công!'})
    else:
        return jsonify({'success': False, 'message': 'Đăng ký thất bại!'})

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('index'))

@app.route('/process-question', methods=['POST'])
@login_required
def process_question():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Không có dữ liệu'}), 400
    
    lop = data.get('lop', '').strip()
    question_data = data.get('question', '').strip()
    
    if not question_data:
        return jsonify({'error': 'Vui lòng nhập câu hỏi'}), 400
    
    prompt_template = read_prompt_file(QUESTION_PROMPT_FILE)
    if not prompt_template:
        return jsonify({'error': 'Không thể đọc file prompt'}), 500
    
    content = create_prompt_content(lop, question_data, prompt_template)
    
    try:
        questions_json = Gemini.generate_question(content)
        return jsonify(questions_json)
    except Exception as e:
        app.logger.error(f"Error generating question: {str(e)}")
        return jsonify({'error': 'Có lỗi xảy ra khi xử lý câu hỏi'}), 500

@app.route('/process-answer', methods=['POST'])
@login_required
def process_answer():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Không có dữ liệu'}), 400
    
    lop = data.get('lop', '').strip()
    question = data.get('question', '').strip()
    user_answer = data.get('user_answer', '').strip()
    
    if not question or not user_answer:
        return jsonify({'error': 'Thiếu thông tin câu hỏi hoặc câu trả lời'}), 400
    
    prompt_template = read_prompt_file(COMPARE_PROMPT_FILE)
    if not prompt_template:
        return jsonify({'error': 'Không thể đọc file prompt'}), 500
    
    prompt = f"Lớp: {lop}\nCâu hỏi: {question}\nCâu trả lời của học sinh: {user_answer}\n\n{prompt_template}"
    
    try:
        compare_result = Gemini.generate_question(prompt)
        app.logger.info(f"Comparison result for question: {question}")
        return jsonify(compare_result)
    except Exception as e:
        app.logger.error(f"Error processing answer: {str(e)}")
        return jsonify({'error': 'Có lỗi xảy ra khi xử lý câu trả lời'}), 500

@app.route('/api/rankings')
@login_required
def get_rankings():
    """API lấy dữ liệu xếp hạng"""
    try:
        rankings = db.get_rankings(limit=50)
        
        # Format dữ liệu ranking
        rank_data = []
        for rank, user_data in enumerate(rankings, 1):
            rank_data.append({
                'rank': rank,
                'username': user_data['username'],
                'totalpoint': user_data['totalpoint']
            })
        
        return jsonify({'success': True, 'rankings': rank_data})
    
    except Exception as e:
        app.logger.error(f"Error getting rankings: {str(e)}")
        return jsonify({'success': False, 'error': 'Có lỗi xảy ra khi lấy dữ liệu ranking'}), 500
    
if __name__ == '__main__':
    app.run(debug=True)