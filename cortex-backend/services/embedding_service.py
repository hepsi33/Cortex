import os
import time
import logging
import requests
import numpy as np
from typing import List

logger = logging.getLogger(__name__)

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
HF_API_URL = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{MODEL_NAME}"
EMBEDDING_DIMENSION = 384

class EmbeddingService:
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        
        if self.environment == "production":
            self.mode = "api"
            self.hf_token = os.getenv("HF_TOKEN")
            self.headers = {"Authorization": f"Bearer {self.hf_token}"}
            logger.info("EmbeddingService initialized in API mode (HuggingFace)")
        else:
            self.mode = "local"
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(MODEL_NAME)
            logger.info("EmbeddingService initialized in LOCAL mode")
    
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        
        all_embeddings = []
        batch_size = int(os.getenv("BATCH_SIZE", 32))
        batches = [texts[i:i+batch_size] for i in range(0, len(texts), batch_size)]
        
        for batch_idx, batch in enumerate(batches):
            logger.info(f"Embedding batch {batch_idx+1}/{len(batches)} ({len(batch)} texts)")
            embeddings = await self._embed_batch_with_retry(batch)
            all_embeddings.extend(embeddings)
        
        self._validate_embeddings(all_embeddings)
        return all_embeddings
    
    async def _embed_batch_with_retry(self, texts: List[str]) -> List[List[float]]:
        for attempt in range(3):
            try:
                if self.mode == "local":
                    return self.model.encode(texts, show_progress_bar=False).tolist()
                else:
                    response = requests.post(
                        HF_API_URL,
                        headers=self.headers,
                        json={"inputs": texts, "options": {"wait_for_model": True}},
                        timeout=30
                    )
                    response.raise_for_status()
                    return response.json()
            except Exception as e:
                wait = 2 ** attempt
                logger.error(f"Embedding attempt {attempt+1} failed: {e}. Retrying in {wait}s")
                if attempt < 2:
                    time.sleep(wait)
                else:
                    raise
    
    def _validate_embeddings(self, embeddings: List[List[float]]):
        for i, emb in enumerate(embeddings):
            if len(emb) != EMBEDDING_DIMENSION:
                raise ValueError(f"Embedding {i} has wrong dimension: {len(emb)}, expected {EMBEDDING_DIMENSION}")
            if any(np.isnan(v) or np.isinf(v) for v in emb):
                raise ValueError(f"Embedding {i} contains NaN or Inf values")

embedding_service = EmbeddingService()
