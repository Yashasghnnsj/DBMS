import os
import json
try:
    from ml_service import llm_service
except ImportError:
    llm_service = None

def analyze_reasoning(question_text, correct_answer, student_answer, student_reasoning):
    """
    Analyze student reasoning using Local LLM.
    Entailment -> Reason matches correct logic.
    Contradiction -> Reason contradicts correct logic.
    Neutral -> Irrelevant or Weak reasoning.
    """
    if not llm_service:
        return {'score': 0, 'feedback': "AI Service Unavailable"}

    try:
        prompt = f"""
        Act as an Advanced Academic Evaluator using the Llama-3 model.
        
        CONTEXT:
        Question: "{question_text}"
        Reference Model Answer: "{correct_answer}"
        Student's Essay/Reasoning: "{student_reasoning}"
        
        TASK:
        1. Evaluate the student's depth of understanding.
        2. Assign a score from 0.0 to 10.0.
           - 9.0-10.0: Perfect logic, covers all technical nuances.
           - 7.0-8.9: Strong understanding, but missing minor depth or clarity.
           - 5.0-6.9: Partial understanding, has the right direction but significant gaps.
           - Below 5.0: Fundamental misconceptions or irrelevant logic.
        3. Provide a clear "Grading Justification" explaining exactly why marks were awarded or deducted.
        4. Categorize any misconceptions by severity (minor vs core).
        
        Strictly output VALID JSON:
        {{
            "points_allocated": 8.5,
            "grading_justification": "The student correctly identified X but failed to mention the relationship between Y and Z, which is why 1.5 marks were deducted.",
            "label": "Entailment" | "Contradiction" | "Neutral",
            "severity": "minor" | "core",
            "feedback": "Concise feedback directly to the student...",
            "misconceptions": ["Specific error 1", "Specific error 2"],
            "clarification_notes": "Expert clarification for the student."
        }}
        """
        
        response = llm_service.generate_content(prompt, max_new_tokens=512)
        text_resp = llm_service.clean_json_response(response.text)
        result = json.loads(text_resp)
        
        label = result.get('label', 'Neutral')
        raw_score = result.get('points_allocated', 0.0)
        
        return {
            'understood': raw_score >= 7.0,
            'points_allocated': raw_score,
            'grading_justification': result.get('grading_justification', 'No justification provided.'),
            'misconceptions': result.get('misconceptions', []),
            'feedback': result.get('feedback', "Evaluation complete."),
            'label': label,
            'severity': result.get('severity', 'core' if raw_score < 7.0 else 'minor' if raw_score < 9.0 else 'none'),
            'clarification_notes': result.get('clarification_notes', ''),
            'model_answer': correct_answer
        }
        
    except Exception as e:
        print(f"Reasoning Analysis Error: {e}")
        return {
            'understood': student_answer == correct_answer,
            'misconceptions': [],
            'feedback': "Analysis error occurred.",
            'score': 0.0
        }
