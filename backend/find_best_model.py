import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

models_to_test = [
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite',
    'gemini-3-flash'
]

print("--- Rapid Model Discovery ---")
for m_name in models_to_test:
    try:
        model = genai.GenerativeModel(m_name)
        response = model.generate_content("Ping")
        print(f"[WORKING] {m_name}")
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg:
            print(f"[QUOTA EXCEEDED] {m_name}")
        elif "404" in err_msg:
            print(f"[NOT FOUND] {m_name}")
        else:
            print(f"[ERROR] {m_name}: {err_msg[:50]}...")
