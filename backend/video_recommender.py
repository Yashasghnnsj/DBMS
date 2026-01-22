import os
import requests
import json
import torch
import torch.nn.functional as F

YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

# Shared MiniLM loading from chat_routes logic
MINILM_PATH = r"C:\Users\Yashas H D\Desktop\PYTHON\dbms\companion\models\all-MiniLM-L6-v2"
_tokenizer = None
_model = None
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def get_embedder():
    global _tokenizer, _model
    if _model is None:
        try:
            from transformers import AutoTokenizer, AutoModel
            _tokenizer = AutoTokenizer.from_pretrained(MINILM_PATH)
            _model = AutoModel.from_pretrained(MINILM_PATH)
            _model.to(_device)
            _model.eval()
        except: pass
    return _tokenizer, _model

def get_similarity_scores(target_text, candidate_list):
    tok, mod = get_embedder()
    if not mod: return [0] * len(candidate_list)
    
    inputs = tok([target_text] + candidate_list, padding=True, truncation=True, return_tensors="pt", max_length=128).to(_device)
    with torch.no_grad():
        out = mod(**inputs)
    embs = out.last_hidden_state.mean(dim=1)
    
    target_emb = embs[0:1]
    cand_embs = embs[1:]
    
    sims = F.cosine_similarity(target_emb, cand_embs)
    return sims.cpu().tolist()

def search_youtube_video(query, topic_title="", max_results=5):
    """
    Search YouTube and rank results using a Hybrid approach:
    Relevance (YouTube) + Semantic Similarity (MiniLM)
    """
    api_key = YOUTUBE_API_KEY or os.getenv('GOOGLE_API_KEY')
    if not api_key:
        return [{'youtube_id': None, 'title': f'{topic_title} Search', 'url': f'https://www.youtube.com/results?search_query={topic_title}'}]

    try:
        # Relaxed academic context to ensure results
        search_query = f"{query} full lecture tutorial"
        
        params = {
            'part': 'snippet',
            'q': search_query,
            'type': 'video',
            'key': api_key,
            'maxResults': max_results,
            'relevanceLanguage': 'en',
            # 'videoDuration': 'long' # Removed strict long duration enabling more hits (medium/long)
        }
        resp = requests.get(YOUTUBE_SEARCH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
        
        candidates = []
        titles = []
        for item in data.get('items', []):
            vid = {
                'youtube_id': item['id']['videoId'],
                'title': item['snippet']['title'],
                'description': item['snippet']['description'],
                'thumbnail': item['snippet']['thumbnails']['high']['url'],
                'url': f"https://www.youtube.com/watch?v={item['id']['videoId']}"
            }
            candidates.append(vid)
            titles.append(vid['title'])
            
        if not candidates: return []

        # 2. Hybrid Ranking: Boost based on Semantic Similarity to topic_title
        if topic_title:
            sim_scores = get_similarity_scores(topic_title, titles)
            for i, score in enumerate(sim_scores):
                candidates[i]['rank_score'] = score

            # Sort by semantic similarity
            candidates.sort(key=lambda x: x.get('rank_score', 0), reverse=True)

        return candidates
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            print(f"YouTube Quota Exceeded/Forbidden (403). Using Fallback.")
        else:
            print(f"YouTube API Error: {e}")
        
        # Fallback to generic URL
        return [{
            'youtube_id': None, 
            'title': f'{topic_title} (Click to Search YouTube)', 
            'description': 'Direct video feed unavailable due to API limits. Click to search manually.',
            'url': f'https://www.youtube.com/results?search_query={requests.utils.quote(search_query)}',
            'thumbnail': '',
            'rank_score': 0
        }]
    except Exception as e:
        print(f"Hybrid YouTube Search Error: {e}")
        return [{
            'youtube_id': None, 
            'title': f'{topic_title} (Manual Search)', 
            'description': 'Search failed. Click to find manually.',
            'url': f'https://www.youtube.com/results?search_query={query}',
            'thumbnail': '',
            'rank_score': 0
        }]

def get_video_for_topic(topic_title, course_context=""):
    """
    Get the single best semantically relevant video for a topic.
    """
    # Explicitly request full coverage of the topic
    query = f"{topic_title} {course_context} full detailed explanation"
    videos = search_youtube_video(query, topic_title=topic_title, max_results=5)
    return videos[0] if videos else None

def get_remedial_videos(topic_title, misconception, count=2):
    """
    Find remedial videos specifically targeting a misconception.
    """
    query = f"misconception {topic_title} {misconception} simplified explanation"
    return search_youtube_video(query, topic_title=f"Simplified {topic_title}", max_results=count)
