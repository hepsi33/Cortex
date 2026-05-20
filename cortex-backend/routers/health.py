from fastapi import APIRouter
from core.supabase_client import supabase
import os
import requests

router = APIRouter()

@router.get("/health")
async def health_check():
    checks = {}
    
    # Check Supabase
    try:
        supabase.table("documents").select("id").limit(1).execute()
        checks["supabase"] = "healthy"
    except Exception as e:
        checks["supabase"] = f"unhealthy: {str(e)}"
    
    # Check Groq
    try:
        response = requests.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}"},
            timeout=5
        )
        checks["groq"] = "healthy" if response.status_code == 200 else f"status {response.status_code}"
    except Exception as e:
        checks["groq"] = f"unhealthy: {str(e)}"
    
    # Check HF (production only)
    if os.getenv("ENVIRONMENT") == "production":
        checks["huggingface"] = "configured" if os.getenv("HF_TOKEN") else "missing token"
    else:
        checks["embedding"] = "local mode (Ollama/sentence-transformers)"
    
    all_healthy = all("healthy" in v or "local" in v or "configured" in v 
                     for v in checks.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks,
        "environment": os.getenv("ENVIRONMENT", "development")
    }
