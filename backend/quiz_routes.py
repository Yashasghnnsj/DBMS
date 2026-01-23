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

    # Check if quiz already exists and HAS questions with options
    quiz = Quiz.query.filter_by(topic_id=topic_id).first()
    
    should_generate = False
    if not quiz:
        should_generate = True
    elif not quiz.questions:
        print(f"DEBUG: Quiz {quiz.quiz_id} exists but has no questions. Generating...")
        should_generate = True
    else:
        # Check if ANY question is missing options (for MCQ/TrueFalse)
        has_empty_options = any(
            (q.question_type in ['mcq', 'true_false']) and (not q.options or q.options == '[]') 
            for q in quiz.questions
        )
        if has_empty_options:
            print(f"DEBUG: Quiz {quiz.quiz_id} has questions with missing options. Re-generating...")
            # Clean up old questions to avoid duplicates on re-gen
            for q in quiz.questions:
                db.session.delete(q)
            db.session.commit()
            should_generate = True

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
You are creating a HIGH-QUALITY ACADEMIC CONCEPTUAL ASSESSMENT for: "{topic.title}"
Course: "{course_title}"

Source Material:
{topic.description}

CRITICAL REQUIREMENTS:
- Generate EXACTLY 5 Conceptual Reasoning Questions.
- These questions should NOT have options. They are open-ended assessments of understanding.
- Questions must be CHALLENGING and focus on "HOW" and "WHY" rather than "WHAT".
- For each question, provide a "Model Correct Answer" which is a detailed step-by-step reasoning that explains the fundamental principles.
- The goal is to force the student to explain the underlying logic in their own words.

Output ONLY a valid JSON array of objects:
[
  {{
    "question": "The complex conceptual reasoning question here?",
    "correct_answer": "Detailed model reasoning that the student's answer should match in principle",
    "explanation": "Pedagogical goal of this question",
    "type": "conceptual"
  }},
  ... (generate exactly 5 items) ...
]

IMPORTANT: 
- Focus on synthesis and application of concepts
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
                elif 'conceptual' in raw_type or 'reasoning' in raw_type:
                    q_type = 'conceptual'
                elif 'true' in raw_type or 'false' in raw_type or 'closed' in raw_type:
                    q_type = 'true_false'
                else:
                    # All others (short answer, fill blank, etc) fall to textarea
                    q_type = 'open'

                # More robust key extraction for options and correct answer
                q_options = q_data.get('options', q_data.get('choices', q_data.get('answers', [])))
                
                # If still empty, look for any list inside q_data
                if not q_options or not isinstance(q_options, list):
                    for val in q_data.values():
                        if isinstance(val, list) and len(val) >= 2:
                            q_options = val
                            break
                
                # Ensure it's a list for safety
                if not isinstance(q_options, list):
                    q_options = []

                q_correct = q_data.get('correct_answer', q_data.get('correct', q_data.get('answer', '')))
                q_explanation = q_data.get('explanation', q_data.get('reasoning', q_data.get('content', '')))
                
                print(f"DEBUG: Processing question: {q_text[:30]}... Options found: {len(q_options)}")

                question = Question(
                    quiz_id=quiz.quiz_id,
                    question_text=q_text,
                    question_type=q_type,
                    options=json.dumps(q_options),
                    correct_answer=q_correct,
                    points=q_data.get('points', 10),
                    explanation=q_explanation,
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
        user_answer = submitted_answers.get(q_id)
        user_reason = submitted_reasoning.get(q_id, "")
        
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
        
        # Scoring logic for conceptual questions (Pure reasoning 0-10)
        points_awarded = 0
        if question.question_type == 'conceptual':
            # Scale the 0-10 score to the question's point value
            points_awarded = (analysis['points_allocated'] / 10.0) * question.points
            is_correct = analysis['understood']
        else:
            # Scoring logic with partial credit for reasoning (MCQ/TF)
            if is_correct:
                points_awarded = question.points
                if question.reasoning_required and not analysis['understood']:
                    points_awarded *= 0.7 
            else:
                 if analysis['understood']: 
                     points_awarded = question.points * 0.4
        
        total_score += points_awarded
        
        feedback_details[q_id] = {
            'correct': is_correct,
            'understood': analysis['understood'],
            'score_out_of_10': analysis['points_allocated'],
            'justification': analysis['grading_justification'],
            'feedback': analysis['feedback'],
            'model_answer': analysis['model_answer'],
            'severity': analysis['severity'],
            'clarification': analysis['clarification_notes']
        }
        
        # Immediate Clarification: If minor misconception, attach to topic
        if not analysis['understood'] and analysis['severity'] == 'minor':
            topic = Topic.query.get(quiz.topic_id)
            if topic:
                current_notes = topic.clarification_notes or ""
                topic.clarification_notes = current_notes + f"\n- {analysis['clarification_notes']}"
        
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
        # Unlock Next Topic / Module
        topic = Topic.query.get(quiz.topic_id)
        next_topic = Topic.query.filter(
            Topic.course_id == topic.course_id, 
            Topic.sequence_order > topic.sequence_order
        ).order_by(Topic.sequence_order.asc()).first()
        
        if next_topic:
            next_topic.is_unlocked = True
            print(f"DEBUG: Unlocked next topic: {next_topic.title}")
            
            # Feature: Next Module Video Suggestion
            from video_recommender import get_video_for_topic
            if not next_topic.youtube_video_id:
                course = Course.query.get(topic.course_id)
                v = get_video_for_topic(next_topic.title, course.title if course else "")
                if v: next_topic.youtube_video_id = v['youtube_id']

        # Auto-assign creative task (existing logic)
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
        # Remedial Content Generation (Core Gaps)
        core_misconceptions = [m for q_id, f in feedback_details.items() if not f['understood'] and f['severity'] == 'core']
        
        if core_misconceptions:
            try:
                topic = Topic.query.get(quiz.topic_id)
                from ml_service import llm_service
                
                # Identify key misconception to target
                top_misconception = core_misconceptions[0]
                
                # REGENERATE / ADAPT PATH: Ask AI to create a remedial sub-path
                prompt = f"""
                The student is struggling with a CORE concept: "{top_misconception}"
                Original Topic: "{topic.title}"
                
                Generate a 2-topic remedial sub-path to bridge this gap before they can proceed.
                Topics should be simpler and more fundamental.
                
                Output JSON:
                [
                    {{
                        "title": "Remedial Level 1: [Simplified Logic]",
                        "description": "Foundational explanation of...",
                        "duration": 15
                    }},
                    {{
                        "title": "Remedial Level 2: [Bridging to {topic.title}]",
                        "description": "Connecting basics to the current topic...",
                        "duration": 20
                    }}
                ]
                """
                
                response = llm_service.generate_content(prompt)
                text_resp = llm_service.clean_json_response(response.text)
                remedial_steps = json.loads(text_resp)
                
                # Shift sequence of all upcoming topics
                upcoming = Topic.query.filter(
                    Topic.course_id == topic.course_id, 
                    Topic.sequence_order > topic.sequence_order
                ).all()
                for u in upcoming:
                    u.sequence_order += len(remedial_steps)
                
                # Insert new remedial topics
                from video_recommender import get_video_for_topic
                for i, step in enumerate(remedial_steps):
                    new_t = Topic(
                        course_id=topic.course_id,
                        student_id=current_student_id,
                        title=step['title'],
                        description=step['description'],
                        sequence_order=topic.sequence_order + i + 1,
                        estimated_duration_minutes=step['duration'],
                        is_unlocked=(i == 0) # Unlock the first remedial topic immediately
                    )
                    # Video for remedial
                    v = get_video_for_topic(new_t.title, topic.title)
                    if v: new_t.youtube_video_id = v['youtube_id']
                    
                    db.session.add(new_t)
                
                db.session.commit()
                
            except Exception as e:
                print(f"Adaptive Path Error: {e}")

    db.session.commit()
    
    # Fetch next topic info for immediate suggestion
    next_topic = Topic.query.filter(Topic.course_id == topic.course_id, Topic.sequence_order > topic.sequence_order).order_by(Topic.sequence_order.asc()).first()
    next_suggestion = None
    if next_topic and next_topic.is_unlocked:
        next_suggestion = {
            'title': next_topic.title,
            'topic_id': next_topic.topic_id,
            'video_id': next_topic.youtube_video_id,
            'description': next_topic.description
        }

    # Return result
    return jsonify({
        'attempt_id': attempt.attempt_id,
        'quiz_id': quiz_id,
        'topic_id': Topic.query.get(quiz.topic_id).topic_id,
        'score': percentage,
        'passed': passed,
        'feedback': "Great work!" if passed else "Let's review some core concepts.",
        'details': feedback_details,
        'misconceptions': misconceptions,
        'remedial_resources': recommended_resources if not passed and 'recommended_resources' in locals() else [],
        'next_topic_suggestion': next_suggestion
    })

