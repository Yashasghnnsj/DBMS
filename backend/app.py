import os
import logging
from logging.handlers import RotatingFileHandler

# CRITICAL: Set this BEFORE any imports to fix Python 3.14 protobuf compatibility
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'

# Logging Setup
if not os.path.exists('logs'):
    os.mkdir('logs')

# Increased maxBytes to 1MB to reduce rollover frequency on Windows
file_handler = RotatingFileHandler('logs/companion.log', maxBytes=1024 * 1024, backupCount=5)
file_handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
file_handler.setLevel(logging.INFO)

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from models import db
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('--- Companion Backend Starting ---')

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///academic_companion.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')

# Initialize extensions
db.init_app(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# Broaden CORS for debugging to resolve "Origin: None" issue
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def after_request(response):
    # Log requests for auditing
    app.logger.info(f"API Access: {request.method} {request.path} -> Status: {response.status_code}")
    return response

@app.route('/api/health')
def health_check():
    return {"status": "ok", "message": "Backend is responsive and CORS is active"}, 200

# Import routes
from routes import auth_bp
from course_routes import courses_bp
from quiz_routes import quiz_bp
from task_routes import tasks_bp
from ai_routes import ai_bp
from chat_routes import chat_bp
from workload_routes import workload_bp
from dashboard_routes import dashboard_bp
from admin_routes import admin_bp

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(courses_bp, url_prefix='/api/courses')
app.register_blueprint(quiz_bp, url_prefix='/api/quiz')
app.register_blueprint(tasks_bp, url_prefix='/api/tasks')
app.register_blueprint(ai_bp, url_prefix='/api/ai')
app.register_blueprint(chat_bp, url_prefix='/api/chat')
app.register_blueprint(workload_bp, url_prefix='/api/workload')
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
app.register_blueprint(admin_bp, url_prefix='/api/admin')

# Create database tables
with app.app_context():
    db.create_all()
    print("Database tables created successfully!")

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    # Disable auto-reloader on Windows to prevent WinError 1450 (resource exhaustion)
    app.run(host='0.0.0.0', debug=True, port=port, use_reloader=False)
