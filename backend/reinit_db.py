from app import app, db
from models import User, Course, Enrollment, Topic, Quiz, Question, Task, UserSchedule, ChatMessage, TopicResource

def reset_db():
    print("WARNING: This will drop ALL data and recreate tables.")
    confirm = input("Are you sure? (y/n): ")
    if confirm.lower() == 'y':
        with app.app_context():
            db.drop_all()
            db.create_all()
            print("Database has been reset. All mock data erased.")
            print("Schema updated with Estimated Hours, Priorities, and User Schedules.")
    else:
        print("Operation cancelled.")

if __name__ == "__main__":
    reset_db()
