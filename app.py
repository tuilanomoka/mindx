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
    
    app.logger.info(f"Sending to Gemini: {content}")
    
    try:
        questions_json = Gemini.generate_question(content)
        app.logger.info(f"Gemini response type: {type(questions_json)}")
        app.logger.info(f"Gemini response: {questions_json}")
        
        # Validate and process response
        if not questions_json:
            app.logger.error("Gemini returned None or empty")
            return jsonify({
                'loigiai': [{'buoc': '1', 'chitiet': 'Lỗi: Không có phản hồi từ AI'}],
                'dapan': 'Lỗi hệ thống'
            })
        
        # Ensure we have a list and get first item
        if isinstance(questions_json, list):
            if len(questions_json) == 0:
                app.logger.error("Gemini returned empty list")
                return jsonify({
                    'loigiai': [{'buoc': '1', 'chitiet': 'Không có dữ liệu trả về từ AI'}],
                    'dapan': 'Lỗi dữ liệu'
                })
            result = questions_json[0]
        else:
            result = questions_json
        
        # Validate result structure
        if not isinstance(result, dict):
            app.logger.error(f"Invalid result type: {type(result)}")
            return jsonify({
                'loigiai': [{'buoc': '1', 'chitiet': 'Định dạng dữ liệu không hợp lệ'}],
                'dapan': 'Lỗi định dạng'
            })
        
        # FIXED: Don't overwrite existing data, just ensure structure
        final_result = result.copy()  # Keep original data
        
        # Ensure loigiai exists and is a list
        if 'loigiai' not in final_result or not isinstance(final_result['loigiai'], list):
            final_result['loigiai'] = [{'buoc': '1', 'chitiet': 'Không có lời giải chi tiết'}]
        
        # Ensure dapan exists
        if 'dapan' not in final_result:
            final_result['dapan'] = 'Không có đáp án'
        
        # Validate and fix each step
        for i, step in enumerate(final_result['loigiai']):
            if not isinstance(step, dict):
                final_result['loigiai'][i] = {'buoc': str(i+1), 'chitiet': str(step)}
            else:
                if 'buoc' not in step:
                    step['buoc'] = str(i+1)
                if 'chitiet' not in step:
                    step['chitiet'] = step.get('tomtat', 'Không có mô tả chi tiết')
        
        app.logger.info(f"Final processed result: {final_result}")
        return jsonify(final_result)
        
    except Exception as e:
        app.logger.error(f"Error in process_question: {str(e)}")
        import traceback
        app.logger.error(f"Traceback: {traceback.format_exc()}")
        
        return jsonify({
            'loigiai': [{'buoc': '1', 'chitiet': f'Lỗi hệ thống: {str(e)}'}],
            'dapan': 'Lỗi xử lý'
        }), 500

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
            print("Sai câu trả lời.")

        session["score_"+str(question_id)] = 0
        return jsonify(compare_result)
    except Exception as e:
        app.logger.error(f"Error processing answer: {str(e)}")
        return jsonify({'error': 'Có lỗi xảy ra khi xử lý câu trả lời'}), 500
@app.route('/api/new_session_id', methods=['POST'])
def new_session_id():
    """Create new session ID for practice problem"""
    app.logger.info(f"new_session_id endpoint called by user: {session.get('username')}")
    
    if 'username' not in session:
        app.logger.warning("new_session_id: User not logged in")
        return jsonify({'success': False, 'grade': 0, 'comment': 'Not logged in', 'id': ''}), 403
    
    epoch_time = int(time.time())
    session_key = f"score_{epoch_time}"
    
    if session_key in session:
        app.logger.warning(f"new_session_id: Session already exists: {session_key}")
        return jsonify({'success': False, 'grade': 0, 'comment': 'Already exists', 'id': ''}), 409
    
    session[session_key] = 100
    app.logger.info(f"new_session_id: Created new session: {session_key} for user: {session['username']}")
    
    return jsonify({
        'success': True,
        'grade': 100,
        'comment': '',
        'id': str(epoch_time)
    }), 200

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
    app.logger.info(f"Buy item request data: {data}")
    
    if not data:
        return jsonify({'success': False, 'message': 'Không có dữ liệu'}), 400
    
    item_id = data.get('item_id', '').strip()
    app.logger.info(f"Item ID: {item_id}")
    
    if not item_id:
        return jsonify({'success': False, 'message': 'Thiếu thông tin item'}), 400
    
    try:
        # Lấy thông tin user
        username = session['username']
        user_data = db.get_user_data(username)
        app.logger.info(f"User data: {user_data}")  # Debug toàn bộ user data
        
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
        
        app.logger.info(f"Item info: {item_info}")  # Debug item info
        
        # Kiểm tra user đã sở hữu item chưa
        owns_item = user_data.get(item_id, False)
        app.logger.info(f"User owns {item_id}: {owns_item}")  # Debug trạng thái sở hữu
        
        if owns_item:
            return jsonify({'success': False, 'message': 'Bạn đã sở hữu item này'}), 400
        
        # Kiểm tra đủ điểm không
        current_points = user_data.get('currentpoint', 0)
        item_price = item_info['price']
        
        app.logger.info(f"User points: {current_points}, Item price: {item_price}")  # Debug điểm
        
        if current_points < item_price:
            return jsonify({'success': False, 'message': f'Không đủ điểm để mua. Bạn có {current_points} điểm, cần {item_price} điểm'}), 400
        
        # Thực hiện mua item
        new_current_points = current_points - item_price
        
        app.logger.info(f"Updating field {item_id} to True")
        db.update_field(username, item_id, True)
        
        app.logger.info(f"Updating current points to {new_current_points}")
        db.update_current_point(username, new_current_points)
        
        app.logger.info(f"Purchase successful for {username}: {item_info['name']}")
        
        return jsonify({
            'success': True, 
            'message': f'Mua {item_info["name"]} thành công!',
            'new_balance': new_current_points
        })
        
    except Exception as e:
        app.logger.error(f"Error buying item: {str(e)}")
        import traceback
        app.logger.error(f"Traceback: {traceback.format_exc()}")
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

# Thêm vào app.py

# Admin routes
@app.route('/admin')
@login_required
def admin_page():
    """Trang admin panel"""
    if not db.is_admin(session['username']):
        return redirect(url_for('home_page'))
    return render_template('admin.html', username=get_username())

@app.route('/api/admin/users')
@login_required
def admin_get_users():
    """API lấy danh sách users (chỉ admin)"""
    if not db.is_admin(session['username']):
        return jsonify({'success': False, 'error': 'Không có quyền truy cập'}), 403
    
    try:
        users = db.get_all_users()
        return jsonify({'success': True, 'users': users})
    except Exception as e:
        app.logger.error(f"Error getting users: {str(e)}")
        return jsonify({'success': False, 'error': 'Có lỗi xảy ra'}), 500

@app.route('/api/admin/stats')
@login_required
def admin_get_stats():
    """API lấy thống kê hệ thống (chỉ admin)"""
    if not db.is_admin(session['username']):
        return jsonify({'success': False, 'error': 'Không có quyền truy cập'}), 403
    
    try:
        users = db.get_all_users()
        total_users = len(users)
        total_points = sum(user.get('totalpoint', 0) for user in users)
        
        # Tìm user có điểm cao nhất
        top_user = max(users, key=lambda x: x.get('totalpoint', 0), default=None)
        top_user_name = top_user['username'] if top_user else 'Không có'
        
        # Top 10 users
        top_users = sorted(users, key=lambda x: x.get('totalpoint', 0), reverse=True)[:10]
        
        return jsonify({
            'success': True,
            'total_users': total_users,
            'total_points': total_points,
            'top_user': top_user_name,
            'top_users': top_users
        })
    except Exception as e:
        app.logger.error(f"Error getting stats: {str(e)}")
        return jsonify({'success': False, 'error': 'Có lỗi xảy ra'}), 500

@app.route('/api/admin/update-user', methods=['POST'])
@login_required
def admin_update_user():
    """API cập nhật thông tin user (chỉ admin)"""
    if not db.is_admin(session['username']):
        return jsonify({'success': False, 'error': 'Không có quyền truy cập'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Không có dữ liệu'}), 400
    
    username = data.get('username')
    total_point = data.get('total_point', 0)
    current_point = data.get('current_point', 0)
    
    if not username:
        return jsonify({'success': False, 'error': 'Thiếu username'}), 400
    
    try:
        if db.update_user_points(username, total_point, current_point):
            return jsonify({'success': True, 'message': 'Cập nhật thành công'})
        else:
            return jsonify({'success': False, 'error': 'Không thể cập nhật'}), 500
    except Exception as e:
        app.logger.error(f"Error updating user: {str(e)}")
        return jsonify({'success': False, 'error': 'Có lỗi xảy ra'}), 500

@app.route('/api/admin/delete-user', methods=['POST'])
@login_required
def admin_delete_user():
    """API xóa user (chỉ admin)"""
    if not db.is_admin(session['username']):
        return jsonify({'success': False, 'error': 'Không có quyền truy cập'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Không có dữ liệu'}), 400
    
    username = data.get('username')
    
    if not username:
        return jsonify({'success': False, 'error': 'Thiếu username'}), 400
    
    if username == 'admin':
        return jsonify({'success': False, 'error': 'Không thể xóa tài khoản admin'}), 400
    
    try:
        if db.delete_user(username):
            return jsonify({'success': True, 'message': 'Xóa user thành công'})
        else:
            return jsonify({'success': False, 'error': 'Không thể xóa user'}), 500
    except Exception as e:
        app.logger.error(f"Error deleting user: {str(e)}")
        return jsonify({'success': False, 'error': 'Có lỗi xảy ra'}), 500

@app.route('/api/admin/change-password', methods=['POST'])
@login_required
def admin_change_own_password():
    """API đổi mật khẩu của chính admin"""
    if not db.is_admin(session['username']):
        return jsonify({'success': False, 'error': 'Không có quyền truy cập'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Không có dữ liệu'}), 400
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'success': False, 'error': 'Vui lòng điền đầy đủ thông tin'}), 400
    
    # Verify current password
    if not db.login_user(session['username'], current_password):
        return jsonify({'success': False, 'error': 'Mật khẩu hiện tại không đúng'}), 400
    
    # Update password
    if db.update_user_password(session['username'], new_password):
        return jsonify({'success': True, 'message': 'Đổi mật khẩu thành công'})
    else:
        return jsonify({'success': False, 'error': 'Không thể đổi mật khẩu'}), 500

@app.route('/api/admin/change-user-password', methods=['POST'])
@login_required
def admin_change_user_password():
    """API đổi mật khẩu của user khác (chỉ admin)"""
    if not db.is_admin(session['username']):
        return jsonify({'success': False, 'error': 'Không có quyền truy cập'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Không có dữ liệu'}), 400
    
    username = data.get('username')
    new_password = data.get('new_password')
    
    if not username or not new_password:
        return jsonify({'success': False, 'error': 'Vui lòng điền đầy đủ thông tin'}), 400
    
    # Update password
    if db.update_user_password(username, new_password):
        return jsonify({'success': True, 'message': f'Đổi mật khẩu cho {username} thành công'})
    else:
        return jsonify({'success': False, 'error': 'Không thể đổi mật khẩu'}), 500

@app.route('/api/user/points')
@login_required
def get_user_points():
    """API lấy điểm của user"""
    try:
        user_data = db.get_user_data(session['username'])
        if user_data:
            return jsonify({
                'success': True,
                'current_points': user_data.get('currentpoint', 0),
                'total_points': user_data.get('totalpoint', 0)
            })
        else:
            return jsonify({'success': False, 'error': 'User not found'}), 404
    except Exception as e:
        app.logger.error(f"Error getting user points: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True)