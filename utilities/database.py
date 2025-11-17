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
        conn.row_factory = sqlite3.Row  # Thêm dòng này để trả về dict-like object
        try:
            yield conn
        finally:
            conn.close()
    
    def init_db(self):
        """Khởi tạo database và bảng users"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Kiểm tra xem bảng users đã tồn tại chưa
            cursor.execute('''
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='users'
            ''')
            table_exists = cursor.fetchone()
            
            if table_exists:
                # Nếu bảng đã tồn tại, kiểm tra và thêm cột nếu thiếu
                self._migrate_database(cursor)
            else:
                # Nếu bảng chưa tồn tại, tạo mới
                cursor.execute('''
                    CREATE TABLE users (
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
    
    def _migrate_database(self, cursor):
        """Migrate database schema nếu cần"""
        # Kiểm tra các cột cần thiết
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Thêm cột totalpoint nếu chưa có
        if 'totalpoint' not in columns:
            cursor.execute('ALTER TABLE users ADD COLUMN totalpoint INTEGER DEFAULT 0')
        
        # Thêm cột currentpoint nếu chưa có
        if 'currentpoint' not in columns:
            cursor.execute('ALTER TABLE users ADD COLUMN currentpoint INTEGER DEFAULT 0')
    
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
    
    def get_user_data(self, username: str) -> Optional[dict]:
        """Lấy toàn bộ dữ liệu của user dưới dạng dict"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
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
        user_data = self.get_user_data(username)
        if user_data:
            return {
                'item1': user_data.get('item1', False),
                'item2': user_data.get('item2', False),
                'item3': user_data.get('item3', False),
                'item4': user_data.get('item4', False),
                'item5': user_data.get('item5', False),
                'selecteditem': user_data.get('selecteditem')
            }
        return {}
    
    def get_rankings(self, limit: int = 50) -> list:
        """Lấy danh sách xếp hạng"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT username, totalpoint 
                FROM users 
                ORDER BY totalpoint DESC, username ASC
                LIMIT ?
            ''', (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]