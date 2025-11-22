import sqlite3
from contextlib import contextmanager
from typing import Optional, Tuple, Any
import logging  # Thêm import logging

class Database:
    def __init__(self, db_name: str = '/tmp/mindx-efubhfgvebyvghefrb/database.db'):
        self.db_name = db_name
        self.init_db()
    
    @contextmanager
    def _get_connection(self):
        """Context manager để tự động quản lý kết nối database"""
        conn = sqlite3.connect(self.db_name)
        conn.row_factory = sqlite3.Row
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
            
            # Kiểm tra và tạo tài khoản admin
            cursor.execute('SELECT 1 FROM users WHERE username = ?', ('admin',))
            admin_exists = cursor.fetchone()
            
            if not admin_exists:
                cursor.execute(
                    'INSERT INTO users (username, password) VALUES (?, ?)', 
                    ('admin', '12345')
                )
                print("Tài khoản admin mặc định đã được tạo: admin/12345")
            
            conn.commit()
    
    def _migrate_database(self, cursor):
        """Migrate database schema nếu cần"""
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Thêm các cột item nếu chưa có
        for i in range(1, 6):
            item_col = f'item{i}'
            if item_col not in columns:
                cursor.execute(f'ALTER TABLE users ADD COLUMN {item_col} BOOLEAN DEFAULT FALSE')
        
        # Thêm cột totalpoint nếu chưa có
        if 'totalpoint' not in columns:
            cursor.execute('ALTER TABLE users ADD COLUMN totalpoint INTEGER DEFAULT 0')
        
        # Thêm cột currentpoint nếu chưa có
        if 'currentpoint' not in columns:
            cursor.execute('ALTER TABLE users ADD COLUMN currentpoint INTEGER DEFAULT 0')
        
        # Thêm cột selecteditem nếu chưa có
        if 'selecteditem' not in columns:
            cursor.execute('ALTER TABLE users ADD COLUMN selecteditem TEXT DEFAULT NULL')
    
    def update_field(self, username: str, field: str, value: Any):
        """Phương thức chung để cập nhật các field"""
        # Sửa: Thay app.logger bằng logging hoặc print
        logging.info(f"Updating field {field} to {value} for user {username}")
        # Hoặc dùng print:
        # print(f"Updating field {field} to {value} for user {username}")
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f'UPDATE users SET {field} = ? WHERE username = ?', 
                (value, username)
            )
            conn.commit()
            logging.info(f"Field {field} updated successfully")
            # Hoặc dùng print:
            # print(f"Field {field} updated successfully")
    
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
    
    def update_field(self, username: str, field: str, value: Any):
        """Phương thức chung để cập nhật các field"""
        #app.logger.info(f"Updating field {field} to {value} for user {username}")  # Thêm log
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f'UPDATE users SET {field} = ? WHERE username = ?', 
                (value, username)
            )
            conn.commit()
            #app.logger.info(f"Field {field} updated successfully")  # Thêm log

    def update_item(self, username: str, item_name: str, value: bool):
        """Cập nhật trạng thái item"""
        if item_name in ['item1', 'item2', 'item3', 'item4', 'item5']:
            self.update_field(username, item_name, value)
        else:
            raise ValueError(f"Invalid item name: {item_name}")
    
    def update_selected_item(self, username: str, selected_item: str):
        """Cập nhật item được chọn"""
        self.update_field(username, 'selecteditem', selected_item)
    
    def update_total_point(self, username: str, total_point: int):
        """Cập nhật tổng điểm"""
        self.update_field(username, 'totalpoint', total_point)
    
    def update_current_point(self, username: str, current_point: int):
        """Cập nhật điểm hiện tại"""
        self.update_field(username, 'currentpoint', current_point)
    
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
                SELECT username, totalpoint, selecteditem 
                FROM users 
                ORDER BY totalpoint DESC, username ASC
                LIMIT ?
            ''', (limit,))
            rows = cursor.fetchall()
            
            # Debug: log kết quả query
            for row in rows:
                print(f"DB - {row['username']}: selecteditem = {row['selecteditem']}")
            
            return [dict(row) for row in rows]

    def is_admin(self, username: str) -> bool:
        """Kiểm tra user có phải là admin không"""
        return username == 'admin'

    def get_all_users(self) -> list:
        """Lấy danh sách tất cả users (chỉ admin)"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT username, totalpoint, currentpoint, 
                    item1, item2, item3, item4, item5, selecteditem
                FROM users 
                ORDER BY username
            ''')
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def update_user_password(self, username: str, new_password: str) -> bool:
        """Cập nhật mật khẩu user"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'UPDATE users SET password = ? WHERE username = ?', 
                    (new_password, username)
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error updating password: {e}")
            return False

    def delete_user(self, username: str) -> bool:
        """Xóa user (chỉ admin)"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM users WHERE username = ?', (username,))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False

    def update_user_points(self, username: str, total_point: int, current_point: int) -> bool:
        """Cập nhật điểm cho user (chỉ admin)"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'UPDATE users SET totalpoint = ?, currentpoint = ? WHERE username = ?', 
                    (total_point, current_point, username)
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error updating points: {e}")
            return False