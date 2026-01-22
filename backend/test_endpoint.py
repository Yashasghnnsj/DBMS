import requests
import json

# Replace with a valid topic_id from check_db.py output if needed
# Course count: 15, Topic count: 101. Let's try topic_id=1.
topic_id = 1

# I need a JWT token.
login_url = "http://127.0.0.1:5000/api/auth/login"
payload = {
    "email": "test_debug@example.com",
    "password": "password123"
}
try:
    resp = requests.post(login_url, json=payload)
    if resp.status_code == 200:
        token = resp.json().get('access_token')
        headers = {"Authorization": f"Bearer {token}"}
        
        gen_url = "http://127.0.0.1:5000/api/ai/notes/generate"
        gen_resp = requests.post(gen_url, json={"topic_id": topic_id}, headers=headers)
        print(f"Status Code: {gen_resp.status_code}")
        print(f"Response: {gen_resp.text}")
    else:
        print(f"Login failed: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
