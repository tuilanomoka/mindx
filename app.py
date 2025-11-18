from flask import Flask, session, request, jsonify, redirect, url_for, render_template, send_from_directory
from utilities.database import Database
from utilities.gemini import Gemini
import os
from functools import wraps
import time
import json

app = Flask(__name__)
app.secret_key = os.urandom(24)
db = Database()

# Constants
PROMPT_DIR = 'resources/prompts'
QUESTION_PROMPT_FILE = 'question.txt'
COMPARE_PROMPT_FILE = 'compare.txt'
SHOP_ITEMS_FILE = 'static/json/shop.json'

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

@app.route('/learn')
@login_required
def learn_page():
    return render_template('learn.html', username=get_username())

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
        
        # Extract first JSON object from list
        if isinstance(questions_json, list) and len(questions_json) > 0:
            return jsonify(questions_json[0])
        else:
            return jsonify({'error': 'Không thể parse dữ liệu từ Gemini'}), 500
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
    question_id = data.get('id','').strip()
    
    if not question or not user_answer:
        return jsonify({'error': 'Thiếu thông tin câu hỏi hoặc câu trả lời'}), 400
    
    prompt_template = read_prompt_file(COMPARE_PROMPT_FILE)
    if not prompt_template:
        return jsonify({'error': 'Không thể đọc file prompt'}), 500
    
    prompt = f"Lớp: {lop}\nCâu hỏi: {question}\nCâu trả lời của học sinh: {user_answer}\n\n{prompt_template}"
    
    try:
        compare_result = Gemini.generate_question(prompt)
        app.logger.info(f"Comparison result for question: {question}")
        try:
            print(compare_result)
            json_data = compare_result[0]
            if json_data.get('acstatus',"false") == "true":
                # add point
                if "score_"+str(question_id) in session:
                    EarnedPoint = session[ "score_"+str(question_id)]
                    u_data = db.get_user_data(session['username'])
                    if u_data is not None:
                        total_point = u_data.get('totalpoint',0)+EarnedPoint
                        current_point = u_data.get('currentpoint',0)+EarnedPoint
                        db.update_points(session['username'],total_point,current_point)
                        print("Đã cập nhập điểm:",total_point,'/',current_point)
        except Exception as e:
            print(e)
            print("Sai câu trả lời. Không cộng điểm cho em bé")

        session["score_"+str(question_id)] = 0
        return jsonify(compare_result)
    except Exception as e:
        app.logger.error(f"Error processing answer: {str(e)}")
        return jsonify({'error': 'Có lỗi xảy ra khi xử lý câu trả lời'}), 500
@app.route('/api/new_session_id', methods=['POST'])
def new_session_id():
    # new session id for practice problem
    if 'username' not in session:
        return jsonify({'success':False,'grade':0,'comment':'Not logged in', 'id':''}), 403
    epoch_time = int(time.time())
    if "score_"+str(epoch_time) in session:
        return jsonify({'success':False,'grade':0,'comment':'Already exists', 'id':''}), 409
    session["score_"+str(epoch_time)] = 100
    return jsonify({'success':True,'grade':100,'comment':'','id':str(epoch_time)}), 200

@app.route('/api/update_temporary_score', methods=['POST'])
def update_temporary_score():
    if 'username' not in session:
        return jsonify({'success':False,'grade':0,'comment':'Not logged in', 'id':''})
    data = request.get_json()
    change_in_score = data.get('change','0').strip()
    session_id = data.get('id','').strip()
    if "score_"+session_id not in session:
        return jsonify({'success':False,'grade':0,'comment':'Not existed', 'id':''}), 404
    
    newScore = int(session["score_"+session_id]) + int(change_in_score)
    if newScore < 0: newScore = 0
    session["score_"+session_id] = newScore
    return jsonify({'success':True,'grade':session["score_"+session_id],'comment':'', 'id':session_id}), 200

@app.route('/api/zero_out_temporary_score', methods=['POST'])
def zero_out_temporary_score():
    if 'username' not in session:
        return jsonify({'success':False,'grade':0,'comment':'Not logged in', 'id':''})
    data = request.get_json()
    session_id = data.get('id','').strip()
    if "score_"+session_id not in session:
        return jsonify({'success':False,'grade':0,'comment':'Not existed', 'id':''}), 404
    session["score_"+session_id] = 0
    return jsonify({'success':True,'grade':session["score_"+session_id],'comment':'', 'id':session_id}), 200


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
    
@app.route('/inventory')
@login_required
def inventory_page():
    return render_template('inventory.html', username=get_username())

@app.route('/shop')
@login_required
def shop_page():
    return render_template('shop.html', username=get_username())
@app.route('/api/shop/items')
@login_required
def get_shop_items():
    """API lấy danh sách items trong shop"""
    try:
        with open(SHOP_ITEMS_FILE, 'r', encoding='utf-8') as file:
            shop_data = json.load(file)
            return jsonify({'success': True, 'items': shop_data['items']})
    except Exception as e:
        app.logger.error(f"Error loading shop items: {str(e)}")
        return jsonify({'success': False, 'error': 'Không thể tải danh sách items'}), 500

@app.route('/api/shop/buy', methods=['POST'])
@login_required
def buy_item():
    """API mua item từ shop"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'Không có dữ liệu'}), 400
    
    item_id = data.get('item_id', '').strip()
    
    if not item_id:
        return jsonify({'success': False, 'message': 'Thiếu thông tin item'}), 400
    
    try:
        # Lấy thông tin user
        user_data = db.get_user_data(session['username'])
        if not user_data:
            return jsonify({'success': False, 'message': 'Không tìm thấy thông tin user'}), 404
        
        # Lấy thông tin item từ shop
        with open(SHOP_ITEMS_FILE, 'r', encoding='utf-8') as file:
            shop_data = json.load(file)
        
        item_info = None
        for item in shop_data['items']:
            if item['id'] == item_id:
                item_info = item
                break
        
        if not item_info:
            return jsonify({'success': False, 'message': 'Item không tồn tại'}), 404
        
        # Kiểm tra user đã sở hữu item chưa
        if user_data.get(item_id, False):
            return jsonify({'success': False, 'message': 'Bạn đã sở hữu item này'}), 400
        
        # Kiểm tra đủ điểm không
        current_points = user_data.get('currentpoint', 0)
        item_price = item_info['price']
        
        if current_points < item_price:
            return jsonify({'success': False, 'message': 'Không đủ điểm để mua'}), 400
        
        # Thực hiện mua item
        new_current_points = current_points - item_price
        
        # Cập nhật database
        db.update_field(session['username'], item_id, True)
        db.update_current_point(session['username'], new_current_points)
        
        return jsonify({
            'success': True, 
            'message': f'Mua {item_info["name"]} thành công!',
            'new_balance': new_current_points
        })
        
    except Exception as e:
        app.logger.error(f"Error buying item: {str(e)}")
        return jsonify({'success': False, 'message': 'Có lỗi xảy ra khi mua item'}), 500

@app.route('/api/inventory')
@login_required
def get_inventory():
    """API lấy inventory của user"""
    try:
        user_data = db.get_user_data(session['username'])
        if not user_data:
            return jsonify({'success': False, 'error': 'Không tìm thấy user'}), 404
        
        # Lấy danh sách items từ shop để có thông tin đầy đủ
        with open(SHOP_ITEMS_FILE, 'r', encoding='utf-8') as file:
            shop_data = json.load(file)
        
        inventory = []
        for item in shop_data['items']:
            item_id = item['id']
            if user_data.get(item_id, False):
                inventory.append({
                    'id': item_id,
                    'name': item['name'],
                    'price': item['price'],
                    'selected': user_data.get('selecteditem') == item_id
                })
        
        return jsonify({
            'success': True, 
            'inventory': inventory,
            'current_points': user_data.get('currentpoint', 0),
            'total_points': user_data.get('totalpoint', 0)
        })
        
    except Exception as e:
        app.logger.error(f"Error getting inventory: {str(e)}")
        return jsonify({'success': False, 'error': 'Có lỗi xảy ra khi lấy inventory'}), 500

@app.route('/api/inventory/select', methods=['POST'])
@login_required
def select_item():
    """API chọn item để sử dụng"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'Không có dữ liệu'}), 400
    
    item_id = data.get('item_id', '').strip()
    
    if not item_id:
        return jsonify({'success': False, 'message': 'Thiếu thông tin item'}), 400
    
    try:
        # Kiểm tra user có sở hữu item không
        user_data = db.get_user_data(session['username'])
        if not user_data.get(item_id, False):
            return jsonify({'success': False, 'message': 'Bạn không sở hữu item này'}), 400
        
        # Cập nhật selected item
        db.update_selected_item(session['username'], item_id)
        
        return jsonify({'success': True, 'message': 'Đã chọn item thành công!'})
        
    except Exception as e:
        app.logger.error(f"Error selecting item: {str(e)}")
        return jsonify({'success': False, 'message': 'Có lỗi xảy ra khi chọn item'}), 500


if __name__ == '__main__':
    app.run(debug=True)