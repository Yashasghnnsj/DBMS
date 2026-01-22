import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import os
import json
import re
import google.generativeai as genai

class MultiLLMService:
    _instance = None
    _local_model = None
    _local_tokenizer = None
    _device = None
    _use_gemini = False
    _use_openrouter = False
    _openrouter_key = None

    MODEL_PATH = "/app/models/Qwen/Qwen2.5-Coder-1.5B-Instruct"
    MODEL_ID = "Qwen/Qwen2.5-Coder-1.5B-Instruct"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = MultiLLMService()
        return cls._instance

    def __init__(self):
        self._device = None
        self._openrouter_key = os.getenv('OPENROUTER_API_KEY')
        if self._openrouter_key:
            self._use_openrouter = True
            print("✅ ML Service: OpenRouter (Llama-3-8b) configured as primary engine.")
        
        self._api_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
        if self._api_key:
            try:
                genai.configure(api_key=self._api_key)
                self._use_gemini = True
                if not self._use_openrouter:
                    print("✅ ML Service: Gemini (2.5-flash-lite) configured as primary engine.")
            except Exception as e:
                print(f"⚠️ ML Service: Gemini config failed. Error: {e}")
        
        if not self._use_openrouter and not self._use_gemini:
            print("ℹ️ ML Service: No Cloud API Keys found. Using local LLM.")

    def _load_local_model(self):
        if self._local_model:
            return
        
        try:
            if not self._device:
                self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            
            print(f"🔹 ML Service: Loading local model {self.MODEL_ID}...")
            path_to_use = self.MODEL_ID
            if os.path.exists(self.MODEL_PATH):
                path_to_use = self.MODEL_PATH
            elif os.path.exists("../models/Qwen/Qwen2.5-Coder-1.5B-Instruct"):
                path_to_use = "../models/Qwen/Qwen2.5-Coder-1.5B-Instruct"

            self._local_tokenizer = AutoTokenizer.from_pretrained(path_to_use, trust_remote_code=True)
            self._local_model = AutoModelForCausalLM.from_pretrained(
                path_to_use,
                torch_dtype=torch.float16 if self._device.type == 'cuda' else torch.float32,
                device_map="auto" if self._device.type == 'cuda' else None,
                trust_remote_code=True
            )
            if self._device.type != 'cuda':
                self._local_model.to(self._device)
            self._local_model.eval()
            print("✅ ML Service: Local model loaded.")
        except Exception as e:
            print(f"❌ ML Service: Local model load failed: {e}")

    def generate_content(self, prompt, max_new_tokens=1024, temperature=0.7):
        """Unified generation interface. Prioritizes OpenRouter, then Gemini."""
        if self._use_openrouter:
            try:
                import requests
                response = requests.post(
                    url="https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self._openrouter_key}",
                        "Content-Type": "application/json",
                        "X-Title": "Academic Companion",
                    },
                    json={
                        "model": "meta-llama/llama-3-8b-instruct",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": max_new_tokens,
                        "temperature": temperature
                    },
                    timeout=30
                )
                if response.status_code == 200:
                    return MockResponse(response.json()['choices'][0]['message']['content'])
                else:
                    print(f"⚠️ OpenRouter failed ({response.status_code}): {response.text}. Falling back.")
            except Exception as e:
                print(f"⚠️ OpenRouter error: {e}. Falling back.")

        if self._use_gemini:
            try:
                model = genai.GenerativeModel('gemini-2.5-flash-lite')
                response = model.generate_content(
                    prompt, 
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=max_new_tokens,
                        temperature=temperature
                    )
                )
                return MockResponse(response.text)
            except Exception as e:
                print(f"⚠️ Gemini generation failed: {e}. Falling back to local.")
        
        # Local Fallback
        self._load_local_model()
        if not self._local_model:
            return MockResponse("Error: All AI models offline.")

        try:
            inputs = self._local_tokenizer(prompt, return_tensors="pt").to(self._device)
            with torch.no_grad():
                outputs = self._local_model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=self._local_tokenizer.eos_token_id
                )
            
            input_length = inputs["input_ids"].shape[1]
            generated_tokens = outputs[0][input_length:]
            result_text = self._local_tokenizer.decode(generated_tokens, skip_special_tokens=True)
            return MockResponse(result_text)
        except Exception as e:
            return MockResponse(f"Error: {str(e)}")

    @staticmethod
    def clean_json_response(text):
        """Robustly extracts JSON from AI markdown response."""
        if not text:
            return "{}"
        
        try:
            # 1. Remove markdown code blocks
            text = re.sub(r'```(?:json)?\s*', '', text)
            text = re.sub(r'\s*```', '', text)
            
            # 2. Find the first '{' and last '}' or first '[' and last ']'
            start_brace = text.find('{')
            end_brace = text.rfind('}')
            
            start_bracket = text.find('[')
            end_bracket = text.rfind(']')
            
            # Decide which one is the outer container
            if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
                if end_brace != -1:
                    return text[start_brace:end_brace+1].strip()
            elif start_bracket != -1:
                if end_bracket != -1:
                    return text[start_bracket:end_bracket+1].strip()
            
            return text.strip()
        except:
            return text.strip()

class MockResponse:
    def __init__(self, text):
        self.text = text

llm_service = MultiLLMService.get_instance()

def get_zero_shot_intent(text, candidate_labels):
    prompt = f"Classify this text into one category from {candidate_labels}: \"{text}\". Return ONLY the category name."
    resp = llm_service.generate_content(prompt, max_new_tokens=20)
    best_label = resp.text.strip().lower()
    for label in candidate_labels:
        if label.lower() in best_label:
            return label, 0.9
    return "general chat", 0.5
