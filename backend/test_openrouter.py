import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# We'll use the existing test_endpoint credentials if possible, or just mock it.
# Actually, I'll just check if ml_service can call OpenRouter directly.

def test_openrouter():
    from ml_service import llm_service
    prompt = "Generate a simple JSON quiz with one question about Python. Format: [{\"question\": \"...\", \"options\": [...], \"correct_answer\": \"...\", \"explanation\": \"...\", \"type\": \"mcq\"}]"
    print("Testing OpenRouter content generation...")
    resp = llm_service.generate_content(prompt, max_new_tokens=500)
    print(f"Response: {resp.text}")
    try:
        json_resp = json.loads(llm_service.clean_json_response(resp.text))
        print("✅ Successfully parsed JSON response.")
        print(json.dumps(json_resp, indent=2))
    except Exception as e:
        print(f"❌ Failed to parse JSON: {e}")

if __name__ == "__main__":
    test_openrouter()
