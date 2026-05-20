from fastapi import APIRouter, HTTPException
from models.schemas import QueryRequest
from services.retrieval_service import retrieval_service
from core.supabase_client import supabase

router = APIRouter()

@router.post("/query")
async def query_document(request: QueryRequest):
    # Verify document is ready
    doc = supabase.table("documents") \
        .select("status") \
        .eq("id", request.document_id) \
        .single() \
        .execute()
    
    if not doc.data:
        raise HTTPException(404, "Document not found")
    
    if doc.data["status"] != "READY":
        raise HTTPException(400, f"Document not ready yet. Status: {doc.data['status']}")
    
    # Get conversation history if provided
    history = []
    if request.conversation_id:
        messages = supabase.table("messages") \
            .select("role, content") \
            .eq("conversation_id", request.conversation_id) \
            .order("created_at") \
            .limit(6) \
            .execute()
        history = messages.data or []
    
    # Run retrieval
    result = await retrieval_service.query(
        question=request.question,
        document_id=request.document_id,
        conversation_history=history
    )
    
    # Save messages to Supabase
    if request.conversation_id:
        supabase.table("messages").insert([
            {"conversation_id": request.conversation_id, "role": "user", "content": request.question},
            {"conversation_id": request.conversation_id, "role": "assistant",
             "content": result["answer"], "sources": result["sources"]}
        ]).execute()
    
    return result
