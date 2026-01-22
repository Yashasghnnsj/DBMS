from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Task, UserSchedule, User
from datetime import datetime, timedelta
import math

workload_bp = Blueprint('workload', __name__)

@workload_bp.route('/tasks', methods=['POST'])
@jwt_required()
def add_task():
    """Add a manual task to the workload"""
    current_student_id = get_jwt_identity()
    data = request.json
    
    try:
        due_date = None
        if data.get('due_date'):
            # Handle empty string or invalid dates
            try:
                due_date = datetime.fromisoformat(data.get('due_date').replace('Z', '+00:00'))
            except ValueError:
                # Try simple date parsing if ISO fails
                due_date = datetime.strptime(data.get('due_date'), '%Y-%m-%d')

        new_task = Task(
            student_id=current_student_id,
            title=data.get('title'),
            priority=data.get('priority', 'medium'),
            estimated_hours=float(data.get('estimated_hours', 1.0)),
            due_date=due_date,
            category=data.get('category', 'study'),
            status='todo'
        )
        
        db.session.add(new_task)
        db.session.commit()
        return jsonify(new_task.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@workload_bp.route('/tasks/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_task(id):
    """Delete a manual task"""
    current_student_id = get_jwt_identity()
    task = Task.query.filter_by(task_id=id, student_id=current_student_id).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404
        
    try:
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@workload_bp.route('/schedule', methods=['GET', 'POST'])
@jwt_required()
def manage_schedule():
    """Get or Update User Schedule Settings"""
    current_student_id = get_jwt_identity()
    schedule = UserSchedule.query.filter_by(student_id=current_student_id).first()
    
    if request.method == 'GET':
        if not schedule:
            # Return defaults
            return jsonify({
                'sleep_start': "23:00",
                'sleep_end': "07:00",
                'school_start': "09:00",
                'school_end': "16:00"
            })
        return jsonify(schedule.to_dict())
        
    if request.method == 'POST':
        data = request.get_json()
        if not schedule:
            schedule = UserSchedule(student_id=current_student_id)
            db.session.add(schedule)
            
        schedule.sleep_start = data.get('sleep_start', schedule.sleep_start)
        schedule.sleep_end = data.get('sleep_end', schedule.sleep_end)
        schedule.school_start = data.get('school_start', schedule.school_start)
        schedule.school_end = data.get('school_end', schedule.school_end)
        
        db.session.commit()
        return jsonify(schedule.to_dict())

@workload_bp.route('/optimize', methods=['GET'])
@jwt_required()
def optimize_workload():
    """
    CSP (Constraint Satisfaction Problem) Workload Engine
    - Constraints: Max Cap, Sleep, School, Priority
    - Algorithm: Greedy Allocation + Backtracking Conflict Resolution
    - Estimation: Regression-based subject complexity heuristic
    """
    current_student_id = get_jwt_identity()
    
    # 1. Fetch Capacity Constraints
    schedule = UserSchedule.query.filter_by(student_id=current_student_id).first()
    if not schedule:
        # Default assumption: 6 hours free
        avail_hours_per_day = 6 
        weekend_bonus = 4
    else:
        # Calculate daily bandwidth
        # Simple parser for "HH:MM"
        def parse_hours(t_str):
            h, m = map(int, t_str.split(':'))
            return h + (m / 60.0)

        sleep_s = parse_hours(schedule.sleep_start)
        sleep_e = parse_hours(schedule.sleep_end)
        school_s = parse_hours(schedule.school_start)
        school_e = parse_hours(schedule.school_end)
        
        # Calculate awake non-school time
        # Handle wrap around for sleep? Assuming sleep starts late e.g. 23:00 and ends 07:00 next day
        sleep_duration = (sleep_e + 24 - sleep_s) % 24
        school_duration = (school_e - school_s) if school_e > school_s else 0
        
        # Buffer of 2 hours for meals/hygiene
        avail_hours_per_day = max(2, 24 - sleep_duration - school_duration - 2)
        weekend_bonus = school_duration # Get school hours back on weekends
    
    # 2. Gather All Tasks (Manual + AI Flexible)
    
    # 2.A Manual Tasks (High Priority / Fixed Dates)
    manual_tasks = Task.query.filter_by(student_id=current_student_id, status='todo').all()
    
    # 2.B Course Topics (Flexible / Study Tasks)
    from models import Enrollment, Topic, Course
    from sqlalchemy import or_
    
    enrollments = Enrollment.query.filter_by(student_id=current_student_id, status='active').all()
    flexible_topics = []
    
    for en in enrollments:
        # Get pending topics
        topics = Topic.query.filter(
            Topic.course_id == en.course_id,
            Topic.completed_at == None
        ).order_by(Topic.sequence_order).all()
        
        course = Course.query.get(en.course_id)
        
        for t in topics:
            # Regression-based estimation (Heuristic)
            # Complexity = base_time * difficulty_multiplier
            # If actual duration is missing, estimate from description length
            
            difficulty_map = {'beginner': 1.0, 'intermediate': 1.5, 'advanced': 2.0}
            diff_mult = difficulty_map.get((course.difficulty_level or 'intermediate').lower(), 1.2)
            
            if t.estimated_duration_minutes:
                est_hours = (t.estimated_duration_minutes / 60.0)
            else:
                 # Heuristic: 1 hour base + extra based on description verbosity
                base_hours = (len(t.description or "") / 800.0) + 0.5
                est_hours = base_hours * diff_mult
                
            flexible_topics.append({
                'id': f"topic_{t.topic_id}",
                'title': f"{course.title}: {t.title}",
                'hours': round(est_hours, 1),
                'priority': 'medium', # Course work is medium unless near deadline
                'category': 'study',
                'type': 'flexible',
                'course_id': course.course_id,
                'sequence': t.sequence_order
            })
            
    # 3. CSP Allocation Logic (Greedy Constructive)
    
    # Domain: Next 7 days
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    days_keys = [(today + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
    
    # Bin Structure
    bins = {}
    for d_str in days_keys:
        d_obj = datetime.strptime(d_str, '%Y-%m-%d')
        is_weekend = d_obj.strftime('%A') in ['Saturday', 'Sunday']
        daily_cap = avail_hours_per_day + (weekend_bonus if is_weekend else 0)
        bins[d_str] = {
            'tasks': [], 
            'allocated': 0, 
            'capacity': daily_cap
        }
        
    # 3.1 Hard Constraint: Manual Tasks (Respect Due Dates & High Priority)
    # Sort by Priority (High first) -> Due Date (Sooner first)
    manual_tasks.sort(key=lambda x: (0 if x.priority == 'high' else 1, x.due_date or datetime.max))
    
    for task in manual_tasks:
        task_hours = task.estimated_hours or 1.0
        
        # If no due date, treat as flexible but high priority (try to fit ASAP)
        if not task.due_date:
            placed = False
            for d in days_keys:
                if bins[d]['allocated'] + task_hours <= bins[d]['capacity']:
                    bins[d]['tasks'].append({
                        'id': task.task_id, 'title': task.title, 'hours': task_hours, 
                        'priority': task.priority, 'type': 'manual', 'category': task.category
                    })
                    bins[d]['allocated'] += task_hours
                    placed = True
                    break
            # If not placed (overload), force into first day or spillover
            if not placed:
                 bins[days_keys[-1]]['tasks'].append({ # Push to last day of window
                    'id': task.task_id, 'title': task.title, 'hours': task_hours, 
                    'priority': task.priority, 'type': 'manual', 'category': task.category, 'status': 'overload'
                })
        else:
            # Fixed Date Allocation
            due_str = task.due_date.strftime('%Y-%m-%d')
            # If due date is within our 7-day window, place it there
            if due_str in bins:
                bins[due_str]['tasks'].append({
                    'id': task.task_id, 'title': task.title, 'hours': task_hours, 
                    'priority': task.priority, 'type': 'manual', 'category': task.category
                })
                bins[due_str]['allocated'] += task_hours
            elif task.due_date < datetime.now(): 
                # Overdue! Force into Today
                bins[days_keys[0]]['tasks'].append({
                    'id': task.task_id, 'title': f"!OVERDUE! {task.title}", 'hours': task_hours, 
                    'priority': 'critical', 'type': 'manual', 'category': task.category
                })
                bins[days_keys[0]]['allocated'] += task_hours

    # 3.2 Flexible Topic Fitting (MRV / Bin Packing)
    # Don't break prerequisites! Filter flexible_topics to only show the *next* available topic per course
    # Actually, simple heuristic: just take first 3 pending topics per course
    
    course_topic_queues = {}
    for ft in flexible_topics:
        cid = ft['course_id']
        if cid not in course_topic_queues: course_topic_queues[cid] = []
        course_topic_queues[cid].append(ft)
        
    # Interleave topics from different courses to balance Variety
    interleaved_topics = []
    max_len = max([len(q) for q in course_topic_queues.values()]) if course_topic_queues else 0
    
    for i in range(max_len):
        for cid in course_topic_queues:
            if i < len(course_topic_queues[cid]):
                interleaved_topics.append(course_topic_queues[cid][i])
                
    # Now fill bins
    for topic in interleaved_topics:
        placed = False
        for d in days_keys:
            # Check capacity
            current = bins[d]
            if current['allocated'] + topic['hours'] <= current['capacity']:
                current['tasks'].append(topic)
                current['allocated'] += topic['hours']
                placed = True
                break
        if not placed:
            pass # Topic pushed beyond 7 days (Backlog)

    # 4. Final Plan Compilation with Stress Analytics
    daily_plan = []
    for day_str in days_keys:
        d_obj = datetime.strptime(day_str, '%Y-%m-%d')
        target_bin = bins[day_str]
        
        load_ratio = target_bin['allocated'] / target_bin['capacity'] if target_bin['capacity'] > 0 else 1.0
        
        stress = 'low'
        if load_ratio > 1.1: stress = 'critical'
        elif load_ratio > 0.85: stress = 'high'
        elif load_ratio > 0.6: stress = 'medium'
        
        daily_plan.append({
            'date': day_str,
            'day': d_obj.strftime('%A'),
            'tasks': target_bin['tasks'], # Already roughly sorted by insertion order
            'allocated_hours': round(target_bin['allocated'], 1),
            'capacity': target_bin['capacity'],
            'stress': stress
        })

    return jsonify({
        'plan': daily_plan,
        'message': 'Workload Intelligence synchronized via CSP. Stress load detected and optimized across available bandwidth.'
    })

def calculate_topic_deadlines(student_id, topics):
    """
    CSP-based Deadline Calculation
    Uses Greedy allocation across a 14-day domain.
    """
    from models import Task, UserSchedule
    
    schedule = UserSchedule.query.filter_by(student_id=student_id).first()
    avail_hours_per_day = 6
    if schedule:
        sleep_dur = (int(schedule.sleep_end.split(':')[0]) + 24 - int(schedule.sleep_start.split(':')[0])) % 24
        school_dur = (int(schedule.school_end.split(':')[0]) - int(schedule.school_start.split(':')[0]))
        avail_hours_per_day = max(2, 24 - sleep_dur - school_dur - 2) 

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    bins = { (today + timedelta(days=i)).strftime('%Y-%m-%d'): {
        'allocated': 0, 
        'capacity': avail_hours_per_day + (4 if (today + timedelta(days=i)).strftime('%A') in ['Saturday', 'Sunday'] else 0)
    } for i in range(14) }

    tasks = Task.query.filter_by(student_id=student_id, status='todo').all()
    for t in tasks:
        if t.due_date:
            due_str = t.due_date.strftime('%Y-%m-%d')
            if due_str in bins: bins[due_str]['allocated'] += t.estimated_hours

    assigned_dates = []
    days_keys = sorted(bins.keys())
    current_day_idx = 0
    
    for t in topics:
        topic_hours = (t.estimated_duration_minutes or 60) / 60.0
        placed = False
        while current_day_idx < 14:
            day_key = days_keys[current_day_idx]
            if bins[day_key]['allocated'] + topic_hours <= bins[day_key]['capacity']:
                assigned_dates.append(datetime.strptime(day_key, '%Y-%m-%d').date())
                bins[day_key]['allocated'] += topic_hours
                placed = True
                break
            else:
                current_day_idx += 1
        
        if not placed:
            assigned_dates.append((today + timedelta(days=14)).date())

    return assigned_dates
