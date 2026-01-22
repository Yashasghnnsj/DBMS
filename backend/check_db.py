from app import app, db
from models import Course, Topic, Enrollment, User, Task
from sqlalchemy import inspect

with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"Tables found: {tables}")
    
    for table in tables:
        print(f"\nTable: {table}")
        columns = inspector.get_columns(table)
        for column in columns:
            print(f" - {column['name']}: {column['type']}")
    
    # Check for actual data
    print(f"\nCourse count: {Course.query.count()}")
    print(f"Topic count: {Topic.query.count()}")
    print(f"User count: {User.query.count()}")
