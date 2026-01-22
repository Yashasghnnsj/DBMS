import os
from flask import Flask
from models import db, User

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///academic_companion.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    try:
        users = User.query.all()
        print(f"\n{'Student ID':<15} | {'Full Name':<20} | {'Email'}")
        print("-" * 55)
        if not users:
            print("No users found in database.")
        else:
            for u in users:
                print(f"{u.student_id:<15} | {u.full_name:<20} | {u.email}")
    except Exception as e:
        print(f"Error accessing database: {e}")
