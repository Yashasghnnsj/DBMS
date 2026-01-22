import os
from datetime import datetime, timedelta
from sqlalchemy import func
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Course, Enrollment, Topic, QuizAttempt

admin_bp = Blueprint('admin', __name__)

def is_admin_user(student_id):
    user = User.query.get(student_id)
    return user and getattr(user, 'is_admin', False)

@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_admin_stats():
    """Get overall statistics for the dashboard"""
    current_user_id = get_jwt_identity()
    if not is_admin_user(current_user_id):
        return jsonify({'error': 'Unauthorized access'}), 403
    
    total_users = User.query.count()
    total_courses = Course.query.count()
    total_enrollments = Enrollment.query.count()
    
    # Active users: logged in within the last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    active_users = User.query.filter(User.last_login >= seven_days_ago).count()
    
    return jsonify({
        'total_users': total_users,
        'active_users': active_users,
        'total_courses': total_courses,
        'total_enrollments': total_enrollments
    }), 200

@admin_bp.route('/system-status', methods=['GET'])
@jwt_required()
def get_system_status():
    """Get mocked system health metrics with environment checks"""
    current_user_id = get_jwt_identity()
    if not is_admin_user(current_user_id):
        return jsonify({'error': 'Unauthorized access'}), 403
    
    # Check if AI keys are present
    gemini_status = 'Online' if os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY') else 'Config Error'
    
    # Calculate actual DB size
    db_path = 'academic_companion.db'
    db_size_mb = 0
    if os.path.exists(db_path):
        db_size_mb = os.path.getsize(db_path) / (1024 * 1024)

    # Mocking remaining system telemetry (CPU/RAM requires psutil which is missing)
    return jsonify({
        'ai_services': {
            'local_llm': 'Online',
            'gemini': gemini_status,
            'youtube_api': 'Online' if os.getenv('YOUTUBE_API_KEY') else 'Offline'
        },
        'resources': {
            'cpu_usage': 24, # Stabilized simulated telemetry
            'memory_usage': 58,
            'api_latency': '88ms'
        },
        'database': {
            'status': 'Healthy',
            'type': 'SQLite',
            'size': f"{db_size_mb:.2f} MB"
        }
    }), 200

@admin_bp.route('/engagement-metrics', methods=['GET'])
@jwt_required()
def get_engagement_metrics():
    """Get real metrics for charts from the database"""
    current_user_id = get_jwt_identity()
    if not is_admin_user(current_user_id):
        return jsonify({'error': 'Unauthorized access'}), 403
    
    # 1. Enrollment Trend (Last 7 Days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    trends = db.session.query(
        func.date(Enrollment.enrolled_at).label('date'),
        func.count(Enrollment.enrollment_id).label('count')
    ).filter(Enrollment.enrolled_at >= seven_days_ago)\
     .group_by(func.date(Enrollment.enrolled_at))\
     .order_by(func.date(Enrollment.enrolled_at))\
     .all()
    
    # Fill in zeros for days with no enrollments
    trend_dict = {str(t.date): t.count for t in trends}
    enrollment_trend = []
    for i in range(7):
        date_str = str((seven_days_ago + timedelta(days=i+1)).date())
        enrollment_trend.append(trend_dict.get(date_str, 0))

    # 2. Top Courses by Enrollment
    top_courses_query = db.session.query(
        Course.title,
        func.count(Enrollment.enrollment_id).label('student_count')
    ).join(Enrollment, Course.course_id == Enrollment.course_id)\
     .group_by(Course.course_id)\
     .order_by(func.count(Enrollment.enrollment_id).desc())\
     .limit(3).all()
    
    top_courses = [{'title': c.title, 'students': c.student_count} for c in top_courses_query]
    
    return jsonify({
        'enrollment_trend': enrollment_trend,
        'top_courses': top_courses
    }), 200

@admin_bp.route('/users/<student_id>/toggle-admin', methods=['POST'])
@jwt_required()
def toggle_admin(student_id):
    """Promote or demote a user to/from admin"""
    current_user_id = get_jwt_identity()
    if not is_admin_user(current_user_id):
        return jsonify({'error': 'Unauthorized access'}), 403
    
    user = User.query.get(student_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    user.is_admin = not user.is_admin
    db.session.commit()
    
    return jsonify({'message': f'Admin status for {user.full_name} updated', 'is_admin': user.is_admin}), 200

@admin_bp.route('/users/<student_id>', methods=['DELETE'])
@jwt_required()
def delete_user(student_id):
    """Delete a user account"""
    current_user_id = get_jwt_identity()
    if not is_admin_user(current_user_id):
        return jsonify({'error': 'Unauthorized access'}), 403
    
    user = User.query.get(student_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Delete related enrollments first to be safe (though cascade should handle it)
    Enrollment.query.filter_by(student_id=student_id).delete()
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'User account deleted successfully'}), 200

@admin_bp.route('/user-progress', methods=['GET'])
@jwt_required()
def get_user_progress():
    """Get progress details for all users"""
    current_user_id = get_jwt_identity()
    if not is_admin_user(current_user_id):
        return jsonify({'error': 'Unauthorized access'}), 403
    
    users = User.query.all()
    user_data = []
    
    for user in users:
        enrollments = Enrollment.query.filter_by(student_id=user.student_id).all()
        completed_courses = sum(1 for e in enrollments if e.status == 'completed')
        in_progress_courses = sum(1 for e in enrollments if e.status == 'active')
        
        avg_completion = 0
        if enrollments:
            avg_completion = sum(e.completion_percentage for e in enrollments) / len(enrollments)
            
        user_data.append({
            'student_id': user.student_id,
            'full_name': user.full_name,
            'email': user.email,
            'is_admin': user.is_admin,
            'courses_enrolled': len(enrollments),
            'courses_completed': completed_courses,
            'courses_in_progress': in_progress_courses,
            'average_completion': round(avg_completion, 1)
        })
    
    return jsonify(user_data), 200
