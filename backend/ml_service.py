import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import os
import json

# Singleton for Local LLM
class LocalLLMService:
    _instance = None
    _model = None
    _tokenizer = None
    _device = None

    MODEL_PATH = "/app/models/Qwen/Qwen2.5-Coder-1.5B-Instruct"
    # Fallback to Hub ID if local path doesn't strictly exist in container yet (auto-download)
    MODEL_ID = "Qwen/Qwen2.5-Coder-1.5B-Instruct"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = LocalLLMService()
        return cls._instance

    def __init__(self):
        self._device = None # Lazy init
        print(f"🔹 ML Service: Initialized (Strict Lazy Loading). Model & Device will load on use.")
        # self._load_model() # DEFER LOADING

    def _load_model(self):
        try:
            # Initialize device here to be safe
            if not self._device:
                self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                print(f"🔹 ML Service: Device set to {self._device}")

            print(f"🔹 ML Service: ACTUALLY LOADING MODEL NOW... {self.MODEL_ID}")
            
            # Determine path to use
            path_to_use = self.MODEL_ID
            
            # 1. Check container path
            if os.path.exists(self.MODEL_PATH):
                path_to_use = self.MODEL_PATH
                print(f"🔹 ML Service: Using Container Path -> {path_to_use}")
            
            # 2. Check local relative paths (relative to backend/)
            # Check ../models/Qwen...
            elif os.path.exists("../models/Qwen/Qwen2.5-Coder-1.5B-Instruct"):
                path_to_use = "../models/Qwen/Qwen2.5-Coder-1.5B-Instruct"
                print(f"🔹 ML Service: Using Local Dev Path (Full Structure) -> {path_to_use}")
            
            # Check just ../models (if user dumped files there)
            elif os.path.exists("../models/config.json"):
                path_to_use = "../models"
                print(f"🔹 ML Service: Using Local Dev Path (Flat) -> {path_to_use}")

            # 3. Fallback to HF Hub
            else:
                print(f"🔹 ML Service: Path not found locally, downloading from HF Hub -> {self.MODEL_ID}")

            self._tokenizer = AutoTokenizer.from_pretrained(path_to_use, trust_remote_code=True)
            self._model = AutoModelForCausalLM.from_pretrained(
                path_to_use,
                torch_dtype=torch.float16 if self._device.type == 'cuda' else torch.float32,
                device_map="auto" if self._device.type == 'cuda' else None,
                trust_remote_code=True
            )
            if self._device.type != 'cuda':
                self._model.to(self._device)
                
            self._model.eval()
            print("✅ ML Service: Model loaded successfully.")
        except Exception as e:
            print(f"❌ ML Service: Failed to load model. Error: {e}")
            import traceback
            traceback.print_exc()

    def generate_content(self, prompt, max_tokens=2048, temperature=0.7):
        """
        Generates text based on the prompt.
        Mimics the Google GenAI 'response.text' interface by returning an object.
        """
        if not self._model or not self._tokenizer:
            print("⚠️ ML Service: Model not loaded, attempting reload...")
            self._load_model()
            if not self._model:
                return MockResponse("Error: Model currently unavailable.")

        try:
            inputs = self._tokenizer(prompt, return_tensors="pt").to(self._device)
            
            with torch.no_grad():
                outputs = self._model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=temperature,
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=self._tokenizer.eos_token_id
                )
            
            # Decode only the NEW tokens
            input_length = inputs["input_ids"].shape[1]
            generated_tokens = outputs[0][input_length:]
            result_text = self._tokenizer.decode(generated_tokens, skip_special_tokens=True)
            
            return MockResponse(result_text)

        except Exception as e:
            print(f"Error during generation: {e}")
            return MockResponse(f"Error generating content: {str(e)}")

# Helper class to mimic GenAI response object
class MockResponse:
    def __init__(self, text):
        self.text = text

# Expose a global instance
llm_service = LocalLLMService.get_instance()

# Keep Zero-Shot logic if needed, but it needs to be updated to use the LLM or removed if NLI was specific
# For now, we'll comment out the NLI specific code as we are switching to LLM-based logic mostly.
# If zero-shot is strictly needed, we can implement it via LLM prompting.

def get_zero_shot_intent(text, candidate_labels):
    """
    Simulated Zero-Shot via LLM Prompting
    """
    prompt = f"""
    Classify the following text into one of these categories: {candidate_labels}.
    Text: "{text}"
    
    Return ONLY the category name.
    """
    resp = llm_service.generate_content(prompt, max_tokens=10)
    best_label = resp.text.strip()
    
    # Simple validation
    for label in candidate_labels:
        if label.lower() in best_label.lower():
            return label, 0.9
            
    return "general", 0.5
