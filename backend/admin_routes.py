from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Course, Enrollment, Topic, QuizAttempt

admin_bp = Blueprint('admin', __name__)

def is_admin_user(student_id):
    user = User.query.get(student_id)
    return user and user.is_admin

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
    
    # Calculate active users (e.g., logged in within last 30 days) - simplified for now
    active_users = total_users # Placeholder, can be refined
    
    return jsonify({
        'total_users': total_users,
        'active_users': active_users,
        'total_courses': total_courses,
        'total_enrollments': total_enrollments
    }), 200

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
        # Skip admins from the list if desired, or keep them
        if user.is_admin:
            continue
            
        enrollments = Enrollment.query.filter_by(student_id=user.student_id).all()
        completed_courses = sum(1 for e in enrollments if e.status == 'completed')
        in_progress_courses = sum(1 for e in enrollments if e.status == 'active')
        
        # Calculate average completion
        avg_completion = 0
        if enrollments:
            avg_completion = sum(e.completion_percentage for e in enrollments) / len(enrollments)
            
        user_data.append({
            'student_id': user.student_id,
            'full_name': user.full_name,
            'email': user.email,
            'courses_enrolled': len(enrollments),
            'courses_completed': completed_courses,
            'courses_in_progress': in_progress_courses,
            'average_completion': round(avg_completion, 1)
        })
    
    return jsonify(user_data), 200
