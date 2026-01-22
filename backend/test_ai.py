import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

api_key = os.getenv('GOOGLE_API_KEY')

print(f"API Key present: {bool(api_key)}")
if api_key:
    try:
        genai.configure(api_key=api_key)
        print("Available Models:")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f" - {m.name}")
        
        print("\nTesting gemini-2.5-flash-lite...")
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        response = model.generate_content("What is the capital of France?")
        print(f"Success! Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
else:
    print("No API Key found")
