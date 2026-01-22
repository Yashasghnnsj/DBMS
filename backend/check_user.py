from app import app
from models import db, User

with app.app_context():
    users = User.query.all()
    print(f"\n{'Student ID':<15} | {'Full Name':<20} | {'Email'}")
    print("-" * 55)
    for u in users:
        print(f"{u.student_id:<15} | {u.full_name:<20} | {u.email}")