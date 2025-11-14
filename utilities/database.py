import sqlite3

class Database:
    def __init__(self, db_name='users.db'):
        self.db_name = db_name
        self.init_db()
    
    def init_db(self):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                apikey TEXT,
                item1 BOOLEAN DEFAULT FALSE,
                item2 BOOLEAN DEFAULT FALSE,
                item3 BOOLEAN DEFAULT FALSE,
                item4 BOOLEAN DEFAULT FALSE,
                item5 BOOLEAN DEFAULT FALSE,
                selecteditem TEXT DEFAULT NULL
            )
        ''')
        conn.commit()
        conn.close()
    
    def register_user(self, username, password):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', 
                         (username, password))
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()
    
    def login_user(self, username, password):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE username = ? AND password = ?', 
                      (username, password))
        user = cursor.fetchone()
        conn.close()
        return user is not None
    
    def user_exists(self, username):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        conn.close()
        return user is not None
    
    def update_apikey(self, username, apikey):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET apikey = ? WHERE username = ?', 
                      (apikey, username))
        conn.commit()
        conn.close()
    
    def update_item(self, username, item_name, value):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute(f'UPDATE users SET {item_name} = ? WHERE username = ?', 
                      (value, username))
        conn.commit()
        conn.close()
    
    def update_selected_item(self, username, selected_item):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET selecteditem = ? WHERE username = ?', 
                      (selected_item, username))
        conn.commit()
        conn.close()
    
    def get_user_data(self, username):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        conn.close()
        return user