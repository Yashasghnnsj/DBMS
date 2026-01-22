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
        Act as an automated grader.
        Question: "{question_text}"
        Correct Answer: "{correct_answer}"
        Student Answer: "{student_answer}"
        Student Reasoning: "{student_reasoning}"
        
        Task: Analyze the student's reasoning.
        1. Does it show understanding?
        2. Is it logically consistent with the correct answer?
        
        Classify as one of:
        - Entailment (Correct reasoning)
        - Contradiction (Incorrect reasoning)
        - Neutral (Vague/Unrelated)
        
        Strictly output VALID JSON:
        {{
            "label": "Entailment" | "Contradiction" | "Neutral", 
            "confidence": 0.9,
            "severity": "minor" | "core",
            "core_importance": 0.0 to 1.0,
            "feedback": "Concise pedagogical feedback...",
            "misconceptions": ["List any specific errors"],
            "clarification_notes": "If severity is minor, provide a 1-2 sentence clarification."
        }}
        """
        
        response = llm_service.generate_content(prompt, max_new_tokens=256)
        text_resp = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(text_resp)
        
        label = result.get('label', 'Neutral')
        score = 1.0 if label == 'Entailment' else 0.0
        if label == 'Neutral': score = 0.5
        
        return {
            'understood': label == 'Entailment',
            'misconceptions': result.get('misconceptions', []),
            'feedback': result.get('feedback', "Reasoning reviewed."),
            'label': label,
            'severity': result.get('severity', 'core' if label != 'Entailment' else 'none'),
            'core_importance': result.get('core_importance', 0.5),
            'clarification_notes': result.get('clarification_notes', ''),
            'confidence': result.get('confidence', 0.8),
            'score': score
        }
        
    except Exception as e:
        print(f"Reasoning Analysis Error: {e}")
        return {
            'understood': student_answer == correct_answer,
            'misconceptions': [],
            'feedback': "Analysis error occurred.",
            'score': 0.0
        }
