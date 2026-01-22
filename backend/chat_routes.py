from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
from models import Task, Enrollment, Course, User, db, ChatMessage

chat_bp = Blueprint('chat', __name__)

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

# --- Model Loading & Router Logic ---
from ml_service import get_zero_shot_intent

# Intent Templates
INTENT_LABELS = ["scheduling", "course content", "analytics", "navigation", "general chat"]

def query_rag_context(student_id, query_text):
    """
    Lightweight RAG: Search Course Topics for relevant context.
    """
    from models import Topic, Course, Enrollment
    from sqlalchemy import or_
    
    # 1. Get Active Courses
    enrollments = Enrollment.query.filter_by(student_id=student_id, status='active').all()
    course_ids = [e.course_id for e in enrollments]
    
    if not course_ids: return ""
    
    # 2. Keyword Search in Database (Simple & Fast)
    # Split query into keywords (ignore stop words simplified)
    keywords = [w for w in query_text.split() if len(w) > 3]
    if not keywords: return ""
    
    filters = []
    for k in keywords:
        filters.append(Topic.title.ilike(f"%{k}%"))
        filters.append(Topic.description.ilike(f"%{k}%"))
        
    relevant_topics = Topic.query.filter(
        Topic.course_id.in_(course_ids),
        or_(*filters)
    ).limit(3).all()
    
    context_str = ""
    if relevant_topics:
        context_str += "\n[RELEVANT COURSE CONTENT]:\n"
        for t in relevant_topics:
            c_title = t.course.title if t.course else "Course"
            context_str += f"- {c_title} > {t.title}: {t.description[:200]}...\n"
            
    return context_str

# Helper for existing context logic
def get_context_data(student_id):
    """Fetch relevant student data for context"""
    tasks = Task.query.filter_by(student_id=student_id, status='todo').all()
    enrollments = Enrollment.query.filter_by(student_id=student_id, status='active').all()
    
    context = "User Context:\n"
    context += f"- Pending Tasks: {len(tasks)} (" + ", ".join([f"{t.title} ({t.priority})" for t in tasks[:5]]) + ")\n"
    
    courses = []
    for enr in enrollments:
        c = Course.query.get(enr.course_id)
        courses.append(f"{c.title} (Progress: {enr.completion_percentage}%)")
    context += f"- Active Courses: {', '.join(courses)}\n"
    
    return context

@chat_bp.route('/message', methods=['POST'])
@jwt_required()
def chat_message():
    current_student_id = get_jwt_identity()
    data = request.get_json()
    user_message = data.get('message', '')
    context_type = data.get('context_type', 'general')
    context_id = data.get('context_id')
    
    # 1. Intent Detection (Zero-Shot DeBERTa)
    # We classify the user message into one of our core buckets.
    intent_label, confidence = get_zero_shot_intent(user_message, INTENT_LABELS)
    
    # Threshold check
    if confidence < 0.3: intent_label = "general chat"
    
    ai_response_text = ""
    
    # 2. Routing Logic
    if intent_label == "scheduling":
        # Fetch Schedule Context
        from workload_routes import optimize_workload # Or just query tasks
        tasks = Task.query.filter_by(student_id=current_student_id, status='todo').limit(5).all()
        task_list = ", ".join([t.title for t in tasks])
        ai_response_text = f"Beep Boop. I see you're asking about your schedule. You have these pending tasks: {task_list}. Check the Workload tab for the full optimized plan."
        
    elif intent_label == "analytics":
        ai_response_text = "I can help with that. Please verify your Mastery Quotient in the Dashboard tab. It updates in real-time based on your quiz reasoning."
        
    elif intent_label == "navigation":
        ai_response_text = "Sure, I can take you there. Try clicking the sidebar icons for Dashboard, Classroom, or Workload."
        
    else:
        # COURSE CONTENT or GENERAL CHAT -> Go to Gemini with RAG
        
        # Base Context
        context_str = get_context_data(current_student_id)
        
        # Add RAG Context (Search knowledge base)
        rag_context = query_rag_context(current_student_id, user_message)
        context_str += rag_context
        
        # Add Specific Page Context
        if context_type == 'course' and context_id:
            course = Course.query.get(context_id)
            if course:
                context_str += f"\n[Active Page]: User is viewing Course '{course.title}'.\n"
        elif context_type == 'topic' and context_id:
            topic = Topic.query.get(context_id)
            if topic:
                 context_str += f"\n[Active Page]: User is viewing Topic '{topic.title}'.\n"

        # Fetch History
        history = ChatMessage.query.filter_by(
            student_id=current_student_id, 
            context_type=context_type, 
            context_id=context_id
        ).order_by(ChatMessage.timestamp.desc()).limit(5).all()
        history.reverse() 
        history_str = "\n".join([f"{msg.role.capitalize()}: {msg.content}" for msg in history])

        # CALL GEMINI
        system_prompt = f"""You are Professor AI, an intelligent academic assistant.
        INTENT DETECTED: {intent_label.upper()}
        CONTEXT: {context_str}
        HISTORY: {history_str}
        INSTRUCTIONS: Answer the student's question helpfuly. If they asked about a course concept, use the [RELEVANT COURSE CONTENT] to inform your answer. Be concise."""

        if GOOGLE_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=GOOGLE_API_KEY)
                model = genai.GenerativeModel('gemini-2.5-flash-lite')
                response = model.generate_content(f"{system_prompt}\n\nStudent: {user_message}\nAI:")
                ai_response_text = response.text
            except Exception as e:
                print(f"Gemini Error: {e}")
                ai_response_text = "My reasoning engine is offline. Please try again later."
        else:
            ai_response_text = "I'm in offline mode. I can identify your intent (" + intent_label + "), but I cannot generate a full response without Gemini."

    # Save Messages
    db.session.add(ChatMessage(student_id=current_student_id, role='user', content=user_message, context_type=context_type, context_id=context_id))
    db.session.add(ChatMessage(student_id=current_student_id, role='assistant', content=ai_response_text, context_type=context_type, context_id=context_id))
    db.session.commit()

    return jsonify({'response': ai_response_text, 'intent': intent_label})

@chat_bp.route('/history', methods=['GET'])
@jwt_required()
def get_chat_history():
    current_student_id = get_jwt_identity()
    context_type = request.args.get('context_type', 'general')
    context_id = request.args.get('context_id')
    
    query = ChatMessage.query.filter_by(student_id=current_student_id, context_type=context_type)
    if context_id:
        query = query.filter_by(context_id=context_id)
        
    messages = query.order_by(ChatMessage.timestamp.asc()).limit(50).all()
    
    return jsonify([msg.to_dict() for msg in messages])
