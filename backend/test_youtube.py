import os
import requests
from dotenv import load_dotenv

load_dotenv()

youtube_key = os.getenv('YOUTUBE_API_KEY')
google_key = os.getenv('GOOGLE_API_KEY')

def test_key(name, key):
    if not key:
        print(f"{name}: MISSING")
        return
    
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {'part': 'snippet', 'q': 'Python', 'type': 'video', 'key': key, 'maxResults': 1}
    
    try:
        resp = requests.get(url, params=params)
        if resp.status_code == 200:
            print(f"{name}: WORKING")
        else:
            # Extract only the summary error
            err_msg = resp.json().get('error', {}).get('message', 'Unknown Error')
            # Extract project ID if present
            pid = "Unknown"
            details = resp.json().get('error', {}).get('details', [])
            for d in details:
                if d.get('metadata', {}).get('consumer'):
                    pid = d['metadata']['consumer']
            print(f"{name}: FAILED ({resp.status_code}) - {err_msg} (Project: {pid})")
    except Exception as e:
        print(f"{name}: REQ FAILED - {e}")

test_key("YT_KEY", youtube_key)
test_key("GOOG_KEY", google_key)
