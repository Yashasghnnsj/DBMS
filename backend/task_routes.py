from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Task
from datetime import datetime

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/', methods=['GET'])
@jwt_required()
def get_tasks():
    """Get all tasks for the current user"""
    current_student_id = get_jwt_identity()
    tasks = Task.query.filter_by(student_id=current_student_id).all()
    
    return jsonify([task.to_dict() for task in tasks])

@tasks_bp.route('/', methods=['POST'])
@jwt_required()
def create_task():
    """Create a new task with automated Eisenhower Prioritization and Tagging"""
    current_student_id = get_jwt_identity()
    data = request.get_json()
    title = data.get('title', 'New Task')
    desc = data.get('description', '')
    
    # 1. Automated Tagging (Similarity-based)
    from chat_routes import get_embeddings
    import torch.nn.functional as F
    
    tags = ["Study", "Research", "Project", "Revision", "Administrative"]
    query_emb = get_embeddings([f"{title} {desc}"])
    tag_embs = get_embeddings(tags)
    
    auto_tag = "General"
    if query_emb is not None and tag_embs is not None:
        sims = F.cosine_similarity(query_emb, tag_embs)
        auto_tag = tags[torch.argmax(sims).item()]

    # 2. Eisenhower Matrix Prioritization (Rule-based heuristic)
    # Important Keywords
    important_kw = ["exam", "deadline", "final", "submission", "quiz", "priority"]
    urgent_kw = ["today", "tomorrow", "tonight", "urgent", "asap"]
    
    is_important = any(kw in (title + desc).lower() for kw in important_kw)
    is_urgent = any(kw in (title + desc).lower() for kw in urgent_kw)
    
    # Mapping
    # Important + Urgent -> high
    # Important + !Urgent -> medium/high
    # !Important + Urgent -> medium
    # !Important + !Urgent -> low
    
    if is_important and is_urgent: priority = 'high'
    elif is_important: priority = 'medium'
    elif is_urgent: priority = 'medium'
    else: priority = 'low'
    
    new_task = Task(
        student_id=current_student_id,
        title=title,
        description=desc,
        status='todo',
        priority=data.get('priority', priority), # Allow override
        tag=auto_tag,
        category=auto_tag.lower(),
        due_date=datetime.utcnow(),
        estimated_hours=float(data.get('estimated_hours', 1.0))
    )
    
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify(new_task.to_dict()), 201

@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    """Update task status or details"""
    current_student_id = get_jwt_identity()
    task = Task.query.get(task_id)
    
    if not task or task.student_id != current_student_id:
        return jsonify({'error': 'Task not found'}), 404
        
    data = request.get_json()
    if 'status' in data:
        task.status = data['status']
    if 'priority' in data:
        task.priority = data['priority']
        
    db.session.commit()
    return jsonify(task.to_dict())
