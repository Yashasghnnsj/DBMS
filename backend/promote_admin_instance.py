import sqlite3
import os

def promote_admin():
    db_path = os.path.join('instance', 'academic_companion.db')
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    email = 'yashas24680@gmail.com'
    
    try:
        # Check if user exists
        cursor.execute("SELECT student_id, full_name, is_admin FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        
        if user:
            student_id, full_name, is_admin = user
            print(f"Found user: {full_name} ({email})")
            
            if not is_admin:
                print("Promoting to admin...")
                cursor.execute("UPDATE users SET is_admin = 1 WHERE email = ?", (email,))
                conn.commit()
                print("User promoted to admin successfully.")
            else:
                print("User is already an admin.")
        else:
            print(f"User with email {email} not found.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    promote_admin()
