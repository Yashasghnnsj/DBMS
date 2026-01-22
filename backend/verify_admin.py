import sys
import os

# Add the current directory to the path so we can import the app
sys.path.append(os.getcwd())

from app import app, db, User, Course, Enrollment

def verify_admin_features():
    print("--- Starting Admin Feature Verification ---")
    
    with app.app_context():
        # 1. Provide a way to make a user an admin
        user = User.query.first()
        if not user:
            print("No users found. Creating a test user...")
            # Create a dummy user if none exists (simplified)
            # In a real scenario, we'd go through the full register flow, 
            # but here we just want to test the model/routes
            try:
                from datetime import date
                new_user = User(
                    student_id='STU2025000001',
                    email='admin_test@example.com',
                    password_hash='test_hash',
                    full_name='Admin Test User',
                    date_of_birth=date(2000, 1, 1),
                    is_admin=True
                )
                db.session.add(new_user)
                db.session.commit()
                user = new_user
                print(f"Created admin user: {user.email}")
            except Exception as e:
                print(f"Failed to create user: {e}")
                return

        # Ensure the user is an admin
        if not user.is_admin:
            print(f"User {user.email} is not an admin. Promoting...")
            user.is_admin = True
            db.session.commit()
            print("User promoted to admin.")
        else:
            print(f"User {user.email} is already an admin.")

        # 2. Test model attribute
        print(f"User.is_admin attribute check: {user.is_admin}")
        assert user.is_admin is True

        # 3. We cannot easily test the route with requests without running the server, 
        # but we can test the view function logic if we could import it, 
        # or just rely on the model check for now.
        # Ideally, we would use app.test_client().
        
        print("Testing API endpoints using test_client()...")
        client = app.test_client()
        
        # We need a token to access protected routes. 
        # Since we just hash-mocked the password, we might skip the login flow 
        # and just mock 'get_jwt_identity' or use the create_access_token directly.
        from flask_jwt_extended import create_access_token
        
        with app.test_request_context():
            token = create_access_token(identity=user.student_id)
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test /api/admin/stats
            resp = client.get('/api/admin/stats', headers=headers)
            print(f"GET /stats status: {resp.status_code}")
            if resp.status_code == 200:
                print(f"Stats Response: {resp.json}")
            else:
                print(f"Stats Error: {resp.data}")

            # Test /api/admin/user-progress
            resp_prog = client.get('/api/admin/user-progress', headers=headers)
            print(f"GET /user-progress status: {resp_prog.status_code}")
            if resp_prog.status_code == 200:
                data = resp_prog.json
                print(f"User Progress Response (first 2 items): {data[:2]}")
            else:
                 print(f"User Progress Error: {resp_prog.data}")


    print("--- Verification Complete ---")

if __name__ == '__main__':
    verify_admin_features()
