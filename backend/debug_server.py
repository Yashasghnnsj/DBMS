import traceback
import sys

try:
    from app import app
    print("App imported successfully")
except Exception as e:
    print(f"Error type: {type(e).__name__}")
    print(f"Error message: {str(e)}")
