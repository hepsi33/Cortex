from fastapi import APIRouter, HTTPException
from core.supabase_client import supabase
from typing import Optional

router = APIRouter()

@router.get("/documents")
async def list_documents(user_id: Optional[str] = None):
    query = supabase.table("documents").select("*")
    if user_id:
        query = query.eq("user_id", user_id)
    
    result = query.execute()
    return result.data

@router.get("/documents/{document_id}")
async def get_document(document_id: str):
    result = supabase.table("documents").select("*").eq("id", document_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return result.data[0]

@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    # Retrieve file path to clean up storage
    doc = supabase.table("documents").select("file_path").eq("id", document_id).execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = doc.data[0]["file_path"]
    
    # Delete from documents table (cascades to document_chunks)
    supabase.table("documents").delete().eq("id", document_id).execute()
    
    # Try cleaning up Supabase storage
    try:
        supabase.storage.from_("documents").remove([file_path])
    except Exception:
        # Ignore storage delete errors
        pass
    
    return {"message": "Document and associated chunks deleted successfully"}
