from flask import *
from utilities.database import Database
from utilities.gemini import Gemini
import os
import sys
import json

app = Flask(__name__)
app.secret_key = os.urandom(24)
db = Database()

@app.route('/')
def index():
    username = session.get('username')
    return render_template('index.html', username=username)

@app.route('/login')
def login_page():
    username = session.get('username')
    if 'username' in session:
        return redirect(url_for('home'))
    return render_template('login.html', username=username)

@app.route('/register')
def register_page():
    username = session.get('username')
    if 'username' in session:
        return redirect(url_for('home'))
    return render_template('register.html', username=username)

@app.route('/home')
def home_page():
    username = session.get('username')
    if 'username' not in session:
        return redirect(url_for('index'))
    return render_template('home.html', username=username)

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if db.login_user(username, password):
        session['username'] = username
        return jsonify({'success': True, 'message': 'Đăng nhập thành công!'})
    else:
        return jsonify({'success': False, 'message': 'Sai tên đăng nhập hoặc mật khẩu!'})

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if db.user_exists(username):
        return jsonify({'success': False, 'message': 'Tên đăng nhập đã tồn tại!'})
    
    if db.register_user(username, password):
        return jsonify({'success': True, 'message': 'Đăng ký thành công!'})
    else:
        return jsonify({'success': False, 'message': 'Đăng ký thất bại!'})

@app.route('/home')
def home():
    if 'username' not in session:
        return redirect(url_for('index'))
    return "Trang home - Chào mừng " + session['username']

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('index'))

@app.route('/practice')
def practice_page():
    username = session.get('username')
    if 'username' not in session:
        return redirect(url_for('index'))
    return render_template('practice.html', username=username)


@app.route('/process-question', methods=['POST'])
def process_question():
    if 'username' in session:
        data = request.get_json()
        lop = data.get('lop', '')
        question_data = data.get('question', '')

        with open('resources/prompts/question.txt', 'r', encoding='utf-8') as file:
            content = file.read()
        
        content = "Lớp = " + lop + "\n" + "Bài toán: " + question_data + "\n" + content
        questions_json = Gemini.generate_question(content)
        
        return jsonify(questions_json)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('resources/icons', 'favicon.ico')

if __name__ == '__main__':
    app.run(debug=True)