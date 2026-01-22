import sqlite3
import os

def update_instance_db():
    # Target the instance database
    db_path = os.path.join('instance', 'academic_companion.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        # Fallback to check absolute path just in case
        db_path = os.path.abspath(db_path)
        print(f"Checking {db_path}...")
        if not os.path.exists(db_path):
            print("Still not found.")
            return

    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'is_admin' not in columns:
            print("Adding is_admin column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0")
            conn.commit()
            print("Column added successfully.")
        else:
            print("is_admin column already exists.")
            
        # Verify
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        print(f"Columns in users table: {columns}")
        
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    update_instance_db()
