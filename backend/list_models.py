import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

print("Listing models...")
try:
    for m in genai.list_models():
        print(f"Name: {m.name}, Display: {m.display_name}")
except Exception as e:
    print(f"Error listing: {e}")
