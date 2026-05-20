import os
import logging
from groq import Groq
from typing import List, Dict

logger = logging.getLogger(__name__)

MODELS = [
    "llama3-8b-8192",        # primary — 14,400 req/day free
    "mixtral-8x7b-32768",    # fallback 1
    "gemma-7b-it",           # fallback 2
]

class LLMService:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    async def generate_answer(
        self,
        question: str,
        context_chunks: List[Dict],
        conversation_history: List[Dict] = []
    ) -> Dict:
        context = "\n\n".join([
            f"[Source {i+1}, Page {c.get('page_number', '?')}]:\n{c['content']}"
            for i, c in enumerate(context_chunks)
        ])
        
        system_prompt = """You are Cortex, an intelligent study assistant.
Answer questions based ONLY on the provided document context.
If the answer is not in the context, say so clearly.
Always cite which source number you used."""

        messages = [
            {"role": "system", "content": system_prompt},
            *conversation_history[-6:],  # last 3 exchanges for context
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ]
        
        for model in MODELS:
            for attempt in range(3):
                try:
                    logger.info(f"LLM call: model={model} attempt={attempt+1}")
                    response = self.client.chat.completions.create(
                        model=model,
                        messages=messages,
                        max_tokens=1024,
                        temperature=0.3
                    )
                    answer = response.choices[0].message.content
                    logger.info(f"LLM success: model={model} tokens={response.usage.total_tokens}")
                    return {"answer": answer, "model_used": model}
                except Exception as e:
                    logger.error(f"LLM attempt failed: model={model} error={e}")
                    if attempt == 2:
                        logger.warning(f"All retries failed for {model}, trying next model")
                        break
        
        raise Exception("All LLM models exhausted. Check Groq API key and quota.")

llm_service = LLMService()
