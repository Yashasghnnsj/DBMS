from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import string
import random

db = SQLAlchemy()

def generate_student_id():
    """Generate unique student ID in format: STU{YEAR}{6-digit-number}"""
    year = datetime.now().year
    # Get the latest student ID for this year
    latest = User.query.filter(User.student_id.like(f'STU{year}%')).order_by(User.student_id.desc()).first()
    
    if latest:
        # Extract sequence number and increment
        sequence = int(latest.student_id[7:]) + 1
    else:
        sequence = 1
    
    return f'STU{year}{sequence:06d}'

class User(db.Model):
    """User/Student model"""
    __tablename__ = 'users'
    
    student_id = db.Column(db.String(20), primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    learning_style = db.Column(db.String(50))  # visual, auditory, kinesthetic, reading/writing
    performance_level = db.Column(db.String(20))  # beginner, intermediate, advanced
    is_admin = db.Column(db.Boolean, default=False)
    
    # Relationships
    enrollments = db.relationship('Enrollment', backref='student', lazy=True, cascade='all, delete-orphan')
    
    @property
    def age(self):
        """Calculate age from date of birth"""
        today = datetime.today()
        return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'student_id': self.student_id,
            'email': self.email,
            'full_name': self.full_name,
            'date_of_birth': self.date_of_birth.isoformat(),
            'age': self.age,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'learning_style': self.learning_style,
            'performance_level': self.performance_level,
            'is_admin': getattr(self, 'is_admin', False)
        }

class Course(db.Model):
    """Course model"""
    __tablename__ = 'courses'
    
    course_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))
    difficulty_level = db.Column(db.String(20))  # beginner, intermediate, advanced
    estimated_duration_hours = db.Column(db.Integer)
    instructor_name = db.Column(db.String(100))
    rating = db.Column(db.Float, default=0.0)
    total_students = db.Column(db.Integer, default=0)
    best_book_referenced = db.Column(db.String(300))
    best_book_link = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    topics = db.relationship('Topic', backref='course', lazy=True, cascade='all, delete-orphan')
    enrollments = db.relationship('Enrollment', backref='course', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'course_id': self.course_id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'difficulty_level': self.difficulty_level,
            'estimated_duration_hours': self.estimated_duration_hours,
            'instructor_name': self.instructor_name,
            'rating': self.rating,
            'total_students': self.total_students,
            'best_book_referenced': self.best_book_referenced,
            'best_book_link': self.best_book_link,
            'created_at': self.created_at.isoformat()
        }

class Enrollment(db.Model):
    """Student course enrollment"""
    __tablename__ = 'enrollments'
    
    enrollment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey('users.student_id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.course_id'), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    completion_percentage = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='active')  # active, completed, dropped
    target_completion_date = db.Column(db.Date)
    
    # Schedule tracking
    original_target_date = db.Column(db.Date)
    adjusted_target_date = db.Column(db.Date)
    adjustment_reason = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'enrollment_id': self.enrollment_id,
            'student_id': self.student_id,
            'course_id': self.course_id,
            'enrolled_at': self.enrolled_at.isoformat(),
            'completion_percentage': self.completion_percentage,
            'status': self.status,
            'target_completion_date': self.target_completion_date.isoformat() if self.target_completion_date else None,
            'original_target_date': self.original_target_date.isoformat() if self.original_target_date else None,
            'adjusted_target_date': self.adjusted_target_date.isoformat() if self.adjusted_target_date else None,
            'adjustment_reason': self.adjustment_reason
        }

class Topic(db.Model):
    """Course topics"""
    __tablename__ = 'topics'
    
    topic_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.course_id'), nullable=False)
    student_id = db.Column(db.String(20), db.ForeignKey('users.student_id'), nullable=True) # For personalized/remedial topics
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    sequence_order = db.Column(db.Integer, nullable=False)
    youtube_video_id = db.Column(db.String(50))
    estimated_duration_minutes = db.Column(db.Integer)
    is_unlocked = db.Column(db.Boolean, default=False)
    clarification_notes = db.Column(db.Text) # AI suggestions stored here
    
    # Progress tracking
    completed_at = db.Column(db.DateTime)
    actual_duration_minutes = db.Column(db.Integer)
    suggested_deadline = db.Column(db.Date)
    
    # Relationships
    resources = db.relationship('TopicResource', backref='topic', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'topic_id': self.topic_id,
            'course_id': self.course_id,
            'title': self.title,
            'description': self.description,
            'sequence_order': self.sequence_order,
            'youtube_video_id': self.youtube_video_id,
            'estimated_duration_minutes': self.estimated_duration_minutes,
            'is_unlocked': self.is_unlocked,
            'clarification_notes': self.clarification_notes,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'actual_duration_minutes': self.actual_duration_minutes,
            'suggested_deadline': self.suggested_deadline.isoformat() if self.suggested_deadline else None
        }

class Quiz(db.Model):
    """Quiz model associated with a topic"""
    __tablename__ = 'quizzes'
    
    quiz_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('topics.topic_id'), nullable=False)
    title = db.Column(db.String(200))
    passing_score = db.Column(db.Integer, default=70)
    
    questions = db.relationship('Question', backref='quiz', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'quiz_id': self.quiz_id,
            'topic_id': self.topic_id,
            'title': self.title,
            'passing_score': self.passing_score
        }

class Question(db.Model):
    """Quiz questions"""
    __tablename__ = 'questions'
    
    question_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.quiz_id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(50))  # mcq, true_false, reasoning
    correct_answer = db.Column(db.Text)
    options = db.Column(db.Text)  # JSON string of options
    points = db.Column(db.Integer, default=1)
    explanation = db.Column(db.Text) # Reasoning for the answer
    
    # AI enhancements
    reasoning_required = db.Column(db.Boolean, default=False)
    difficulty_level = db.Column(db.String(20), default='medium')
    
    def to_dict(self):
        return {
            'question_id': self.question_id,
            'question_text': self.question_text,
            'question_type': self.question_type,
            'options': self.options,
            'points': self.points,
            'explanation': self.explanation,
            'reasoning_required': self.reasoning_required,
            'difficulty_level': self.difficulty_level
        }

class QuizAttempt(db.Model):
    """Student quiz attempts"""
    __tablename__ = 'quiz_attempts'
    
    attempt_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey('users.student_id'), nullable=False)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.quiz_id'), nullable=False)
    attempted_at = db.Column(db.DateTime, default=datetime.utcnow)
    score = db.Column(db.Float)
    passed = db.Column(db.Boolean)
    
    # AI Analysis
    reasoning_analysis = db.Column(db.Text) # JSON string
    misconceptions = db.Column(db.Text) # JSON string

    def to_dict(self):
        return {
            'attempt_id': self.attempt_id,
            'student_id': self.student_id,
            'quiz_id': self.quiz_id,
            'attempted_at': self.attempted_at.isoformat(),
            'score': self.score,
            'passed': self.passed,
            'reasoning_analysis': self.reasoning_analysis,
            'misconceptions': self.misconceptions
        }

class Task(db.Model):
    """Student tasks"""
    __tablename__ = 'tasks'
    
    task_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey('users.student_id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='todo') # todo, in_progress, done
    priority = db.Column(db.String(20), default='medium') # low, medium, high
    due_date = db.Column(db.DateTime)
    # Added fields for detailed task tracking
    estimated_hours = db.Column(db.Float, default=1.0)
    category = db.Column(db.String(50), default='study') # school, study, personal, creative
    tag = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.task_id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'estimated_hours': self.estimated_hours,
            'category': self.category,
            'tag': self.tag
        }

class UserSchedule(db.Model):
    """User daily schedule constraints"""
    __tablename__ = 'user_schedules'
    
    schedule_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey('users.student_id'), nullable=False)
    
    # Simple fixed schedule for MVP (can be expanded to per-day)
    sleep_start = db.Column(db.String(5), default="23:00") # HH:MM
    sleep_end = db.Column(db.String(5), default="07:00")
    school_start = db.Column(db.String(5), default="09:00")
    school_end = db.Column(db.String(5), default="16:00")
    
    def to_dict(self):
        return {
            'sleep_start': self.sleep_start,
            'sleep_end': self.sleep_end,
            'school_start': self.school_start,
            'school_end': self.school_end,
            'available_hours_daily': 24 - (
                (int(self.sleep_end.split(':')[0]) + 24 - int(self.sleep_start.split(':')[0])) % 24 + 
                (int(self.school_end.split(':')[0]) - int(self.school_start.split(':')[0]))
            )
        }

class ChatMessage(db.Model):
    """Chat history for context-aware AI"""
    __tablename__ = 'chat_messages'
    
    message_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey('users.student_id'), nullable=False)
    context_type = db.Column(db.String(20), default='general') # general, course, topic, quiz
    context_id = db.Column(db.Integer) # ID of the related context
    role = db.Column(db.String(10), nullable=False) # user, assistant
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'message_id': self.message_id,
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp.isoformat()
        }

class TopicResource(db.Model):
    """Recommended resources for topics"""
    __tablename__ = 'topic_resources'
    
    resource_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('topics.topic_id'), nullable=False)
    resource_type = db.Column(db.String(20), default='video') # video, article, note
    title = db.Column(db.String(200))
    url = db.Column(db.String(500))
    youtube_video_id = db.Column(db.String(50))
    recommended_for = db.Column(db.String(100), default='all') # all, remedial
    
    def to_dict(self):
        return {
            'resource_id': self.resource_id,
            'type': self.resource_type,
            'title': self.title,
            'url': self.url,
            'youtube_id': self.youtube_video_id,
            'recommended_for': self.recommended_for
        }

class Prerequisite(db.Model):
    """Dependencies between topics for Graph-Based Path Planning"""
    __tablename__ = 'prerequisites'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('topics.topic_id'), nullable=False)
    prereq_topic_id = db.Column(db.Integer, db.ForeignKey('topics.topic_id'), nullable=False)
    
    # Relationships for easier graph traversal
    topic = db.relationship('Topic', foreign_keys=[topic_id], backref='prereqs_meta')
    prereq = db.relationship('Topic', foreign_keys=[prereq_topic_id])

class Note(db.Model):
    """Student notes (AI generated or Manual)"""
    __tablename__ = 'notes'
    
    note_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey('users.student_id'), nullable=False)
    topic_id = db.Column(db.Integer, db.ForeignKey('topics.topic_id'), nullable=True) # Optional link to topic
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text) # Stored as Markdown
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'note_id': self.note_id,
            'student_id': self.student_id,
            'topic_id': self.topic_id,
            'title': self.title,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
