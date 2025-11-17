import sqlite3
from contextlib import contextmanager
from typing import Optional, Tuple, Any

class Database:
    def __init__(self, db_name: str = 'users.db'):
        self.db_name = db_name
        self.init_db()
    
    @contextmanager
    def _get_connection(self):
        """Context manager để tự động quản lý kết nối database"""
        conn = sqlite3.connect(self.db_name)
        try:
            yield conn
        finally:
            conn.close()
    
    def init_db(self):
        """Khởi tạo database và bảng users"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    item1 BOOLEAN DEFAULT FALSE,
                    item2 BOOLEAN DEFAULT FALSE,
                    item3 BOOLEAN DEFAULT FALSE,
                    item4 BOOLEAN DEFAULT FALSE,
                    item5 BOOLEAN DEFAULT FALSE,
                    selecteditem TEXT DEFAULT NULL,
                    totalpoint INTEGER DEFAULT 0,
                    currentpoint INTEGER DEFAULT 0
                )
            ''')
            conn.commit()
    
    def register_user(self, username: str, password: str) -> bool:
        """Đăng ký user mới"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO users (username, password) VALUES (?, ?)', 
                    (username, password)
                )
                conn.commit()
                return True
        except sqlite3.IntegrityError:
            return False
    
    def login_user(self, username: str, password: str) -> bool:
        """Xác thực đăng nhập"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT 1 FROM users WHERE username = ? AND password = ?', 
                (username, password)
            )
            return cursor.fetchone() is not None
    
    def user_exists(self, username: str) -> bool:
        """Kiểm tra user có tồn tại không"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT 1 FROM users WHERE username = ?', (username,))
            return cursor.fetchone() is not None
    
    def _update_field(self, username: str, field: str, value: Any):
        """Phương thức chung để cập nhật các field"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f'UPDATE users SET {field} = ? WHERE username = ?', 
                (value, username)
            )
            conn.commit()
    
    def update_item(self, username: str, item_name: str, value: bool):
        """Cập nhật trạng thái item"""
        if item_name in ['item1', 'item2', 'item3', 'item4', 'item5']:
            self._update_field(username, item_name, value)
        else:
            raise ValueError(f"Invalid item name: {item_name}")
    
    def update_selected_item(self, username: str, selected_item: str):
        """Cập nhật item được chọn"""
        self._update_field(username, 'selecteditem', selected_item)
    
    def update_total_point(self, username: str, total_point: int):
        """Cập nhật tổng điểm"""
        self._update_field(username, 'totalpoint', total_point)
    
    def update_current_point(self, username: str, current_point: int):
        """Cập nhật điểm hiện tại"""
        self._update_field(username, 'currentpoint', current_point)
    
    def get_user_data(self, username: str) -> Optional[Tuple]:
        """Lấy toàn bộ dữ liệu của user"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
            return cursor.fetchone()
    
    def get_user_field(self, username: str, field: str) -> Any:
        """Lấy giá trị của một field cụ thể"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f'SELECT {field} FROM users WHERE username = ?', (username,))
            result = cursor.fetchone()
            return result[0] if result else None
    
    def update_points(self, username: str, total_point: int = None, current_point: int = None):
        """Cập nhật cả hai loại điểm trong một transaction"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            if total_point is not None:
                cursor.execute(
                    'UPDATE users SET totalpoint = ? WHERE username = ?', 
                    (total_point, username)
                )
            
            if current_point is not None:
                cursor.execute(
                    'UPDATE users SET currentpoint = ? WHERE username = ?', 
                    (current_point, username)
                )
            
            conn.commit()
    
    def get_user_items(self, username: str) -> dict:
        """Lấy thông tin items của user"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT item1, item2, item3, item4, item5, selecteditem 
                FROM users WHERE username = ?
            ''', (username,))
            result = cursor.fetchone()
            
            if result:
                return {
                    'item1': result[0],
                    'item2': result[1],
                    'item3': result[2],
                    'item4': result[3],
                    'item5': result[4],
                    'selecteditem': result[5]
                }
            return {}