from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Course, Enrollment, QuizAttempt, Task, Topic
from datetime import datetime, timedelta
import collections
import statistics

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get aggregated stats for dashboard using Weighted Scoring and Burn Algorithms"""
    current_student_id = get_jwt_identity()
    from models import QuizAttempt
    
    # 1. Active Courses
    enrollments = Enrollment.query.filter_by(student_id=current_student_id, status='active').all()
    active_courses_count = len(enrollments)
    
    # 2. Tasks & Consistency
    total_tasks = Task.query.filter_by(student_id=current_student_id).count()
    completed_tasks = Task.query.filter_by(student_id=current_student_id, status='done').count()
    consistency = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # 3. Quiz Performance & Reasoning Accuracy
    recent_attempts = QuizAttempt.query.filter_by(student_id=current_student_id).all()
    avg_score = 0
    avg_reasoning = 0
    if recent_attempts:
        avg_score = sum([a.score for a in recent_attempts]) / len(recent_attempts)
        reasoning_vals = []
        for a in recent_attempts:
            if a.reasoning_analysis:
                try:
                    import json
                    analysis = json.loads(a.reasoning_analysis)
                    reasoning_vals.append(100 if analysis.get('understood') else 0)
                except: pass
        if reasoning_vals:
            avg_reasoning = sum(reasoning_vals) / len(reasoning_vals)
        else:
            avg_reasoning = avg_score

    # 4. Mastery Quotient (Weighted Scoring Algorithm)
    # Mastery = 0.4*Quiz + 0.3*Reasoning + 0.3*Consistency
    mastery_quotient = int(0.4 * avg_score + 0.3 * avg_reasoning + 0.3 * consistency)
    
    # 5. Study Hours & Academic Burn (Threshold Detection)
    all_tasks = Task.query.filter_by(student_id=current_student_id).all()
    study_hours = sum([t.estimated_hours for t in all_tasks if t.status == 'done'])
    
    burn_level = "Low"
    if study_hours > 15 and consistency < 50: burn_level = "High"
    elif study_hours > 10: burn_level = "Medium"

    return jsonify({
        'focus_score': { # Mapped from Mastery Quotient
            'value': f"{mastery_quotient}%",
            'change': "+3%",
            'label': "Weighted Mastery"
        },
        'tasks_completed': { # New field for milestones
            'value': str(completed_tasks),
            'change': f"+{completed_tasks}",
            'label': "Tasks Done"
        },
        'study_hours': {
            'value': f"{study_hours}h",
            'change': "Stable",
            'label': burn_level # Using burn level as label for context
        },
        'active_courses': {
            'value': str(active_courses_count),
            'change': "0",
            'label': "Enrolled"
        }
    })

@dashboard_bp.route('/activity', methods=['GET'])
@jwt_required()
def get_recent_activity():
    """Get recent activity log"""
    current_student_id = get_jwt_identity()
    activities = []
    
    recent_enrollments = Enrollment.query.filter_by(student_id=current_student_id)\
        .order_by(Enrollment.enrolled_at.desc()).limit(3).all()
        
    for enroll in recent_enrollments:
        course = Course.query.get(enroll.course_id)
        if course:
            activities.append({
                'task': f"Enrolled in {course.title}",
                'time': enroll.enrolled_at.strftime('%Y-%m-%d'),
                'status': 'primary'
            })
        
    recent_tasks = Task.query.filter_by(student_id=current_student_id)\
        .order_by(Task.created_at.desc()).limit(3).all()
        
    for task in recent_tasks:
        activities.append({
            'task': f"Added task: {task.title}",
            'time': task.created_at.strftime('%Y-%m-%d'),
            'status': 'warning'
        })
        
    return jsonify(activities[:5])

@dashboard_bp.route('/detailed', methods=['GET'])
@jwt_required()
def get_detailed_analytics():
    """Get comprehensive analytics with SMA/EMA and Proficiency Matrix"""
    current_student_id = get_jwt_identity()
    from models import QuizAttempt, Quiz, Topic
    
    # 1. Performance Trend with Moving Average (SMA)
    recent_attempts = QuizAttempt.query.filter_by(student_id=current_student_id)\
        .order_by(QuizAttempt.attempted_at.desc()).limit(15).all()
    recent_attempts.reverse()
    
    performance_trend = []
    scores = []
    for att in recent_attempts:
        scores.append(att.score)
        # Simple Moving Average (window=3)
        sma = sum(scores[-3:]) / len(scores[-3:]) if scores else 0
        
        quiz = Quiz.query.get(att.quiz_id)
        topic_title = "Unknown"
        if quiz:
            topic = Topic.query.get(quiz.topic_id)
            if topic: topic_title = topic.title
            
        performance_trend.append({
            'quiz': topic_title,
            'score': att.score,
            'sma': round(sma, 1),
            'date': att.attempted_at.strftime('%m-%d')
        })
        
    # 2. Heatmap
    heatmap_data = {}
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=30)
    range_attempts = QuizAttempt.query.filter(
        QuizAttempt.student_id == current_student_id,
        QuizAttempt.attempted_at >= start_date
    ).all()
    
    for att in range_attempts:
        d_str = att.attempted_at.strftime('%Y-%m-%d')
        heatmap_data[d_str] = heatmap_data.get(d_str, 0) + 1
        
    # 3. Proficiency Matrix / Strengths
    categories = db.session.query(Course.category, db.func.avg(QuizAttempt.score))\
        .join(Enrollment, Enrollment.course_id == Course.course_id)\
        .join(QuizAttempt, QuizAttempt.student_id == Enrollment.student_id)\
        .filter(QuizAttempt.student_id == current_student_id)\
        .group_by(Course.category).all()
    
    strengths = []
    for cat, score in categories:
        strengths.append({'category': cat, 'score': round(score, 1)})
        
    if not strengths:
        strengths = [
            {'category': 'Logic', 'score': 0},
            {'category': 'Theory', 'score': 0},
            {'category': 'Application', 'score': 0}
        ]
        
    # 4. Course History (Completed & Dropped)
    history_enrollments = Enrollment.query.filter(
        Enrollment.student_id == current_student_id,
        Enrollment.status.in_(['completed', 'dropped'])
    ).order_by(Enrollment.enrolled_at.desc()).all()
    
    course_history = []
    for enr in history_enrollments:
        c = Course.query.get(enr.course_id)
        if c:
            # Parse drop date from reason if available, else use target_date or today
            date_label = enr.target_completion_date.strftime('%Y-%m-%d') if enr.target_completion_date else "Unknown"
            if enr.status == 'dropped' and enr.adjustment_reason and "Dropped on" in enr.adjustment_reason:
                try:
                    date_label = enr.adjustment_reason.split("Dropped on ")[1].strip()
                except: pass
                
            course_history.append({
                'title': c.title,
                'status': enr.status,
                'progress': int(enr.completion_percentage or 0),
                'date': date_label
            })

    return jsonify({
        'performance_trend': performance_trend,
        'heatmap': [{'date': k, 'count': v} for k, v in heatmap_data.items()],
        'strengths': strengths,
        'learning_velocity': round(len(recent_attempts) / 4.0, 1),
        'course_history': course_history
    })
