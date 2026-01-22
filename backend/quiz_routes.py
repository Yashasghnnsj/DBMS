from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Quiz, Question, QuizAttempt, Topic, User
from datetime import datetime
import json
import random
import os
import requests

quiz_bp = Blueprint('quiz', __name__)
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

@quiz_bp.route('/generate/<int:topic_id>', methods=['POST'])
@jwt_required()
def generate_quiz(topic_id):
    """
    Generate or retrieve a quiz for a topic.
    """
    topic = Topic.query.get(topic_id)
    if not topic:
        return jsonify({'error': 'Topic not found'}), 404

    # Check if quiz already exists and HAS questions
    quiz = Quiz.query.filter_by(topic_id=topic_id).first()
    
    # If quiz exists but has no questions, we need to generate them
    if quiz and not quiz.questions:
        print(f"DEBUG: Quiz {quiz.quiz_id} exists but has no questions. Generating...")
        should_generate = True
    elif not quiz:
        should_generate = True
    else:
        should_generate = False

    if should_generate:
        if not quiz:
            quiz = Quiz(
                topic_id=topic_id,
                title=f"Assessment: {topic.title}",
                passing_score=70
            )
            db.session.add(quiz)
            db.session.commit()
        
        # AI Question Generation
        try:
            from ml_service import llm_service
            
            # Define simplified question types for stability
            course_title = topic.course.title if topic.course else "General Knowledge"
            context_material = topic.description if topic.description else f"{topic.title} in the context of {course_title}"
            
            prompt = f"""
You are creating a FACTUAL KNOWLEDGE QUIZ with REASONING for the topic: "{topic.title}"
Course: "{course_title}"

Source Material:
{topic.description}

CRITICAL REQUIREMENTS:
- Generate 5-8 Multiple Choice Questions (aim for at least 5)
- Each question MUST have EXACTLY 4 options labeled A, B, C, D
- Questions should be FACTUAL and SPECIFIC (not abstract concepts)
- Test knowledge of specific facts, values, definitions, or procedures
- Students must be able to explain WHY their answer is correct

QUESTION STYLE:
- "What is the primary function of...?"
- "Which algorithm is used for...?"
- "At what value does X occur?"
- "What happens when...?"
- "Which of the following is true about...?"

EXAMPLES OF GOOD QUESTIONS:
- "Water reaches its maximum density at?" 
  Options: ["0°C", "4°C", "100°C", "25°C"]
  
- "Which sorting algorithm has the best average-case time complexity?"
  Options: ["Bubble Sort O(n²)", "Quick Sort O(n log n)", "Selection Sort O(n²)", "Insertion Sort O(n²)"]

Output ONLY a valid JSON array:
[
  {{
    "question": "Specific factual question about {topic.title}?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option B",
    "explanation": "Clear explanation of why this answer is correct",
    "type": "mcq"
  }},
  ...more questions (5-8 total)...
]

IMPORTANT: 
- Make questions specific and testable
- Ensure there is ONE clearly correct answer
- Output ONLY the JSON array, no other text
"""
            
            response = llm_service.generate_content(prompt, max_new_tokens=3000)
            text_resp = response.text.strip()
            print(f"DEBUG: AI Raw Response: {text_resp[:100]}...")

            def extract_json_array(text):
                """Robustly find JSON array by searching backwards from the end"""
                text = text.strip()
                start = text.find('[')
                if start == -1: return None
                
                # Find all closing brackets after the start
                end_candidates = [i for i, char in enumerate(text) if char == ']' and i > start]
                
                # Try from the last closing bracket backwards
                for end in reversed(end_candidates):
                    candidate = text[start:end+1]
                    try:
                        return json.loads(candidate)
                    except:
                        continue
                return None

            questions_data = extract_json_array(text_resp)
            
            if not questions_data:
                # Fallback: Try cleaning markdown code blocks explicitly
                clean_text = text_resp.replace('```json', '').replace('```', '').strip()
                try:
                    questions_data = json.loads(clean_text)
                except:
                     # One last try with loose parsing (finding first [ and last ])
                     # This was the old way, but maybe useful as last resort if strict parser failed
                    try:
                        import re
                        m = re.search(r'\[.*\]', text_resp, re.DOTALL)
                        if m: questions_data = json.loads(m.group(0))
                    except:
                        pass
            
            if not questions_data:
                 raise ValueError("Could not extract JSON from AI response")

            for q_data in questions_data:
                # robust key extraction
                raw_type = q_data.get('question_type', q_data.get('type', 'mcq')).lower()
                q_text = q_data.get('question_text', q_data.get('question', q_data.get('text', 'Unknown Question')))
                
                # Normalize for Frontend (Quiz.jsx expects 'mcq' or 'true_false' for buttons)
                if 'multiple' in raw_type or 'choice' in raw_type:
                    q_type = 'mcq'
                elif 'true' in raw_type or 'false' in raw_type or 'closed' in raw_type:
                    q_type = 'true_false'
                else:
                    # All others (short answer, fill blank, etc) fall to textarea
                    q_type = 'open' 
                
                question = Question(
                    quiz_id=quiz.quiz_id,
                    question_text=q_text,
                    question_type=q_type,
                    options=json.dumps(q_data.get('options', [])),
                    correct_answer=q_data.get('correct_answer', ''),
                    points=q_data.get('points', 10),
                    explanation=q_data.get('explanation', ''),
                    reasoning_required=q_data.get('reasoning_required', True)
                )
                db.session.add(question)
            
            db.session.commit()
            
        except Exception as e:
            print(f"Quiz AI Generation Failed: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to simple template questions
            template_questions = [
                {
                    "text": f"What is the primary concept of {topic.title}?",
                    "type": "mcq",
                    "options": ["Concept A", "Concept B", "Concept C", "Concept D"],
                    "correct": "Concept A",
                    "points": 10,
                    "explanation": "This is a fundamental concept.",
                    "reasoning_required": True
                },
                {
                    "text": f"Which statement best describes {topic.title}?",
                    "type": "mcq",
                    "options": ["Statement 1", "Statement 2", "Statement 3", "Statement 4"],
                    "correct": "Statement 1",
                    "points": 10,
                    "explanation": "This accurately represents the topic.",
                    "reasoning_required": True
                }
            ]
            for q_data in template_questions:
                question = Question(
                    quiz_id=quiz.quiz_id,
                    question_text=q_data['text'],
                    question_type=q_data['type'],
                    options=json.dumps(q_data['options']),
                    correct_answer=q_data['correct'],
                    points=q_data['points'],
                    explanation=q_data['explanation'],
                    reasoning_required=q_data['reasoning_required']
                )
                db.session.add(question)
            db.session.commit()
    
    # Return quiz data structure
    questions_data = []
    for q in quiz.questions:
        questions_data.append({
            'id': q.question_id,
            'text': q.question_text,
            'type': q.question_type,
            'options': json.loads(q.options) if q.options else [],
            'points': q.points,
            'reasoning_required': q.reasoning_required
        })
        
    return jsonify({
        'quiz_id': quiz.quiz_id,
        'title': quiz.title,
        'questions': questions_data
    })

@quiz_bp.route('/submit/<int:quiz_id>', methods=['POST'])
@jwt_required()
def submit_quiz(quiz_id):
    """
    Submit quiz attempt with reasoning analysis.
    Expected JSON:
    {
        "answers": { "q_id": "answer" },
        "reasoning": { "q_id": "because..." }
    }
    """
    current_student_id = get_jwt_identity()
    data = request.get_json()
    submitted_answers = data.get('answers', {})
    submitted_reasoning = data.get('reasoning', {})
    
    quiz = Quiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404

    # Validate reasoning for all questions
    for question in quiz.questions: # Use quiz.questions here
        q_id_str = str(question.question_id)
        reasoning_text = submitted_reasoning.get(q_id_str, '').strip()
        
        if question.reasoning_required and (not reasoning_text or len(reasoning_text) < 10):
            return jsonify({
                'error': f'All questions marked as reasoning_required need reasoning (minimum 10 characters). Please provide reasoning for question {question.question_id}.'
            }), 400
    
        
    total_score = 0
    max_score = 0
    feedback_details = {}
    misconceptions = []
    
    from reasoning_analyzer import analyze_reasoning
    
    for question in quiz.questions:
        max_score += question.points
        q_id = str(question.question_id)
        user_answer = answers.get(q_id)
        user_reason = reasoning.get(q_id, "")
        
        # Grading
        is_correct = False
        if question.question_type in ['mcq', 'true_false']:
            is_correct = (user_answer == question.correct_answer)
        
        # Reasoning Analysis
        analysis = analyze_reasoning(
            question.question_text, 
            question.correct_answer, 
            user_answer, 
            user_reason
        )
        
        # Scoring logic with partial credit for reasoning
        points_awarded = 0
        if is_correct:
            points_awarded = question.points
            if question.reasoning_required and not analysis['understood']:
                points_awarded *= 0.7 # Penalty for correct answer but wrong reasoning (lucky guess)
        else:
             if analysis['understood']: # Wrong option but good reasoning (ambiguity?)
                 points_awarded = question.points * 0.4
        
        total_score += points_awarded
        
        feedback_details[q_id] = {
            'correct': is_correct,
            'understood': analysis['understood'],
            'feedback': analysis['feedback']
        }
        
        if not analysis['understood']:
            misconceptions.extend(analysis['misconceptions'])
            
    percentage = (total_score / max_score) * 100 if max_score > 0 else 0
    passed = percentage >= quiz.passing_score
    
    # Save Attempt
    attempt = QuizAttempt(
        student_id=current_student_id,
        quiz_id=quiz_id,
        score=percentage,
        passed=passed,
        reasoning_analysis=json.dumps(feedback_details),
        misconceptions=json.dumps(misconceptions)
    )
    db.session.add(attempt)
    
    # Logic for Passed/Failed
    from models import Task, TopicResource
    
    if passed:
        # Auto-assign creative task
        existing_task = Task.query.filter_by(
            student_id=current_student_id, 
            description=f"Generated from Quiz: {quiz.title}"
        ).first()
        
        if not existing_task:
            new_task = Task(
                student_id=current_student_id,
                title=f"Project: {quiz.title.replace('Assessment: ', '')}",
                description=f"Creative application task based on your mastery of {quiz.title}.",
                status='todo',
                priority='high',
                tag='Creative',
                due_date=datetime.utcnow()
            )
            db.session.add(new_task)
            
    else:
        # Remedial Content Generation
        if not passed:
            try:
                topic = Topic.query.get(quiz.topic_id)
                from ml_service import llm_service
                
                # Identify key misconception to target
                top_misconception = misconceptions[0] if misconceptions else "core concepts"
                
                prompt = f"""
                Title: Remedial Lesson for "{topic.title}"
                Focus: The student struggles with: {top_misconception}
                
                Generate a simpler topic module.
                Output JSON:
                {{
                    "title": "Remedial: {topic.title} - {top_misconception[:20]}...",
                    "description": "Simplified explanation focusing on...",
                    "estimated_duration_minutes": 20
                }}
                """
                
                response = llm_service.generate_content(prompt)
                text_resp = response.text.replace('```json', '').replace('```', '').strip()
                remedial_data = json.loads(text_resp)
                
                # Shift sequences
                next_topics = Topic.query.filter(Topic.course_id == topic.course_id, Topic.sequence_order > topic.sequence_order).all()
                for t in next_topics:
                    t.sequence_order += 1
                
                # New Topic
                new_topic = Topic(
                    course_id=topic.course_id,
                    student_id=current_student_id,
                    title=remedial_data['title'],
                    description=remedial_data.get('description', 'Remedial content'),
                    sequence_order=topic.sequence_order + 1,
                    estimated_duration_minutes=remedial_data.get('estimated_duration_minutes', 20)
                )
                db.session.add(new_topic)
                db.session.commit() # Commit to get ID for resources
                
                # Video Recommendations
                from video_recommender import get_remedial_videos
                videos = get_remedial_videos(topic.title, top_misconception)
                
                recommended_resources = []
                for v in videos:
                    res = TopicResource(
                        topic_id=new_topic.topic_id,
                        resource_type='video',
                        title=v['title'],
                        url=v['url'],
                        youtube_video_id=v['youtube_id'],
                        recommended_for='remedial'
                    )
                    db.session.add(res)
                    recommended_resources.append(v)
                
                # Stub for schedule recalculation
                from course_routes import recalculate_course_timeline
                recalculate_course_timeline(current_student_id, topic.course_id)
                
            except Exception as e:
                print(f"Remedial Gen Error: {e}")
                import traceback
                traceback.print_exc()

    db.session.commit()
    
    # Return result
    return jsonify({
        'attempt_id': attempt.attempt_id,
        'score': percentage,
        'passed': passed,
        'feedback': feedback_details,
        'misconceptions': misconceptions,
        'remedial_resources': recommended_resources if not passed and 'recommended_resources' in locals() else []
    })

