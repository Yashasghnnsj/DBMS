from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
from models import db, User, Course, Topic, ChatMessage, Quiz, Question, Note
from ml_service import llm_service
import json
from datetime import datetime, timedelta

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/notes/generate', methods=['POST'])
@jwt_required()
def generate_notes():
    """Generate detailed study notes and SAVE to DB"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    topic_id = data.get('topic_id')
    
    topic = Topic.query.get_or_404(topic_id)
    course = Course.query.get(topic.course_id)
    
    try:
        prompt = f"""
        You are an expert professor creating comprehensive study materials.

        Topic: "{topic.title}"
        Course: "{course.title}"
        Context: {topic.description}

        Create detailed, thorough study notes covering ALL of the following:
        
        1. **Core Concepts & Definitions** - Fundamental principles explained clearly
        2. **Detailed Explanations** - In-depth analysis with concrete examples
        3. **Key Formulas/Algorithms** - If applicable, with explanations of when to use them
        4. **Real-World Applications** - Practical use cases and scenarios
        5. **Common Misconceptions** - What students often get wrong and why
        6. **Important Points to Remember** - Key takeaways for understanding and exams

        REQUIREMENTS:
        - Make it comprehensive (aim for 1000-1500 words total)
        - Use clear, structured explanations
        - Include specific examples wherever possible
        - Explain the "WHY" behind concepts, not just the "WHAT"
        
        Output ONLY valid JSON with this structure:
        {{
            "title": "Notes: {topic.title}",
            "sections": [
                {{
                     "heading": "1. Core Concepts",
                     "content": "Detailed content here..."
                }},
                {{
                     "heading": "2. In-Depth Analysis",
                     "content": "Comprehensive explanation..."
                }},
                {{
                     "heading": "3. Applications & Examples",
                     "content": "Real-world usage..."
                }}
            ]
        }}
        """
        
        response = llm_service.generate_content(prompt, max_new_tokens=3500)
        text_resp = response.text.strip()
        
        # Robust JSON Extraction
        final_content = text_resp
        try:
            import re
            json_match = re.search(r'\{.*\}', text_resp, re.DOTALL)
            if json_match:
                json_obj = json.loads(json_match.group(0))
                final_content = json.dumps(json_obj) # Store as JSON String
            else:
                # Fallback structure if AI fails JSON
                final_content = json.dumps({
                    "title": f"Notes: {topic.title}",
                    "sections": [
                        {"heading": "Generated Notes", "content": text_resp}
                    ]
                })
        except Exception as e:
            print(f"Notes JSON parse fail: {e}")
            final_content = json.dumps({
                "title": f"Notes: {topic.title}",
                "sections": [{"heading": "Content", "content": text_resp}]
            })
        
        # SAVE to DB
        new_note = Note(
            student_id=current_user_id,
            topic_id=topic_id,
            title=f"Notes: {topic.title}",
            content=final_content
        )
        db.session.add(new_note)
        db.session.commit()
        
        return jsonify({
            'message': 'Notes generated and saved',
            'note': new_note.to_dict()
        })
        
    except Exception as e:
        print(f"AI Error: {e}")
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/notes/<int:note_id>', methods=['PUT'])
@jwt_required()
def update_note(note_id):
    """Update note content (User Edit)"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    content = data.get('content')
    
    note = Note.query.get_or_404(note_id)
    
    if note.student_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    if content:
        note.content = content
        db.session.commit()
        
    return jsonify({'message': 'Note updated', 'note': note.to_dict()})

@ai_bp.route('/notes/topic/<int:topic_id>', methods=['GET'])
@jwt_required()
def get_topic_notes(topic_id):
    """Get all notes for a specific topic"""
    current_user_id = get_jwt_identity()
    
    notes = Note.query.filter_by(
        student_id=current_user_id,
        topic_id=topic_id
    ).order_by(Note.created_at.desc()).all()
    
    return jsonify([note.to_dict() for note in notes])


@ai_bp.route('/notes/<int:note_id>/pdf', methods=['GET'])
@jwt_required()
def download_note_pdf(note_id):
    """Generate PDF from Markdown Note"""
    current_user_id = get_jwt_identity()
    note = Note.query.get_or_404(note_id)
    
    if note.student_id != current_user_id:
         return jsonify({'error': 'Unauthorized'}), 403

    try:
        import markdown
        from xhtml2pdf import pisa
        from io import BytesIO
        from flask import send_file
        
        html_content = markdown.markdown(note.content)
        
        full_html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Helvetica, Arial, sans-serif; font-size: 12pt; line-height: 1.5; }}
                h1 {{ color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
                h2 {{ color: #2980b9; margin-top: 20px; }}
                h3 {{ color: #16a085; }}
                code {{ background-color: #f8f9fa; padding: 2px 5px; font-family: monospace; }}
                pre {{ background-color: #f8f9fa; padding: 10px; border-left: 5px solid #bdc3c7; }}
            </style>
        </head>
        <body>
            <h1>{note.title}</h1>
            {html_content}
            <div style="text-align: center; margin-top: 50px; font-size: 10pt; color: #7f8c8d;">
                Generated by AI Academic Companion
            </div>
        </body>
        </html>
        """
        
        pdf_buffer = BytesIO()
        pisa_status = pisa.CreatePDF(full_html, dest=pdf_buffer)
        
        if pisa_status.err:
            return jsonify({'error': 'PDF Generation Failed'}), 500
            
        pdf_buffer.seek(0)
        
        return send_file(
            pdf_buffer, 
            as_attachment=True, 
            download_name=f"{note.title.replace(' ', '_')}.pdf", 
            mimetype='application/pdf'
        )

    except Exception as e:
        print(f"PDF Error: {e}")
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/quiz/generate', methods=['POST'])
@jwt_required()
def generate_quiz():
    """Generate a dynamic quiz with reasoning"""
    data = request.get_json()
    topic_id = data.get('topic_id')
    
    topic = Topic.query.get_or_404(topic_id)
    
    try:
        prompt = f"""
        Create a 5-question multiple choice quiz for the topic: "{topic.title}".
        Target level: Intermediate.
        
        Strictly output VALID JSON in the following format:
        [
            {{
                "question_text": "Question here?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Option A",
                "explanation": "Why Option A is correct..."
            }}
        ]
        """
        
        response = llm_service.generate_content(prompt)
        text_resp = response.text.replace('```json', '').replace('```', '').strip()
        
        quiz_data = json.loads(text_resp)
        
        quiz = Quiz.query.filter_by(topic_id=topic_id).first()
        if not quiz:
            quiz = Quiz(topic_id=topic_id, title=f"Quiz: {topic.title}")
            db.session.add(quiz)
            db.session.commit()
            
        created_questions = []
        for q in quiz_data:
            new_q = Question(
                quiz_id=quiz.quiz_id,
                question_text=q['question_text'],
                question_type='mcq',
                correct_answer=q['correct_answer'],
                options=json.dumps(q['options']),
                points=10,
                explanation=q.get('explanation', 'No explanation provided.')
            )
            db.session.add(new_q)
            created_questions.append(new_q)
            
        db.session.commit()
        
        return jsonify({'message': 'Quiz Generated', 'quiz_id': quiz.quiz_id, 'count': len(created_questions)})
        
    except Exception as e:
        print(f"Quiz Gen Error: {e}")
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/submit/<int:quiz_id>', methods=['POST'])
@jwt_required()
def submit_quiz(quiz_id):
    student_id = get_jwt_identity()
    data = request.get_json()
    answers = data.get('answers', {})
    
    quiz = Quiz.query.get_or_404(quiz_id)
    questions = Question.query.filter_by(quiz_id=quiz.quiz_id).all()
    
    score = 0
    total_points = sum(q.points for q in questions)
    
    for q in questions:
        if str(answers.get(str(q.question_id))) == q.correct_answer:
            score += q.points
            
    percentage = (score / total_points) * 100 if total_points > 0 else 0
    passed = percentage >= quiz.passing_score
    
    feedback = "Great job! You've mastered this concept." if passed else "Let's review this concept to strengthen your understanding."
    
    if not passed:
        feedback += " We've added a personalized Remedial Module to your learning path to help you grasp the basics."
        
        try:
            topic = Topic.query.get(quiz.topic_id)
            
            prompt = f"""
            Title: Remedial Lesson for "{topic.title}"
            Context: The student failed a quiz on this topic.
            
            Generate a simpler, easier-to-understand version of this topic.
            Output VALID JSON:
            {{
                "title": "Remedial: {topic.title}",
                "description": "Simplified explanation...",
                "content": "Full markdown content with analogies..."
            }}
            """
            response = llm_service.generate_content(prompt)
            text_resp = response.text.replace('```json', '').replace('```', '').strip()
            remedial_data = json.loads(text_resp)
            
            # Shift sequences
            next_topics = Topic.query.filter(Topic.course_id == topic.course_id, Topic.sequence_order > topic.sequence_order).all()
            for t in next_topics:
                t.sequence_order += 1
            
            new_topic = Topic(
                course_id=topic.course_id,
                student_id=student_id,
                title=remedial_data['title'],
                description=remedial_data['description'],
                sequence_order=topic.sequence_order + 1,
                estimated_duration_minutes=15,
            )
            # Todo: save content if Topic has content field, otherwise relying on Description for now
            
            db.session.add(new_topic)
            db.session.commit()
                
        except Exception as e:
            print(f"Dynamic Path Error: {e}")
            
    return jsonify({
        'score': percentage,
        'passed': passed,
        'feedback': feedback
    })


@ai_bp.route('/challenge/generate', methods=['POST'])
@jwt_required()
def generate_challenge():
    """Generates a creative task for the student"""
    student_id = get_jwt_identity()
    
    from models import Enrollment, Task as TaskModel
    
    enrollment = Enrollment.query.filter_by(student_id=student_id, status='active').first()
    if enrollment:
        course = Course.query.get(enrollment.course_id)
        topic_context = f"related to the course '{course.title}'"
    else:
        topic_context = "related to general logic, problem solving, or current events"

    try:
        prompt = f"""
        Create a unique, "Brain Testing" task for a student {topic_context}.
        
        The task should NOT be standard homework. It should be:
        - Creative and "Out of the Box"
        - Require synthesis, application, or lateral thinking.
        - Fun but educational.
        - Doable in 1-2 hours.
        
        Strictly output VALID JSON:
        {{
            "title": "Catchy Task Title",
            "description": "Short description of what to do...",
            "estimated_hours": 1.5
        }}
        """
        
        response = llm_service.generate_content(prompt)
        text_resp = response.text.replace('```json', '').replace('```', '').strip()
        
        challenge_data = json.loads(text_resp)
        
        new_task = TaskModel(
            student_id=student_id,
            title=challenge_data['title'],
            description=challenge_data['description'],
            status='todo',
            priority='high',
            due_date=datetime.utcnow() + timedelta(days=2),
            estimated_hours=float(challenge_data.get('estimated_hours', 1.0)),
            category='creative',
            tag='AI Challenge'
        )
        
        db.session.add(new_task)
        db.session.commit()
        
        return jsonify({'message': 'Challenge Accepted!', 'task': new_task.to_dict()})
        
    except Exception as e:
        print(f"Challenge Gen Error: {e}")
        return jsonify({'error': str(e)}), 500
