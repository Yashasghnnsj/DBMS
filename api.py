import requests
import json
import os

API_KEY = "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"

response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Academic Companion",
    },
    json={
        "model": "meta-llama/llama-3-8b-instruct",
        "messages": [
            {
                "role": "user",
                "content": "What is the meaning of life?"
            }
        ]
    }
)

print(response.status_code)
print(response.json())
