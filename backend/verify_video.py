import os
import sys
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Add backend to path
sys.path.append(r'c:\Users\Yashas H D\Desktop\PYTHON\dbms\companion\backend')

from video_recommender import search_youtube_video, get_video_for_topic

def test_video_search():
    print("Testing Video Search for 'Database Normalization'...")
    try:
        results = search_youtube_video("Database Normalization", "Database Management Systems")
        if not results:
            print("No results found.")
            return

        print(f"Found {len(results)} videos.")
        for vid in results:
            print(f"- {vid['title']} ({vid['url']})")
            
        print("\nTesting Get Single Video for 'SQL Joins'...")
        best_video = get_video_for_topic("SQL Joins", "DBMS")
        if best_video:
            print(f"Best Video: {best_video['title']} - {best_video['url']}")
        else:
            print("No best video found.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_video_search()
