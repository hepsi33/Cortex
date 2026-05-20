import asyncio
import logging
import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from core.supabase_client import supabase
from services.pipeline_service import pipeline_service

router = APIRouter()
logger = logging.getLogger(__name__)
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", 50)) * 1024 * 1024

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = None  # pass from auth header in production
):
    # Validate file
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported currently")
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Max size: {os.getenv('MAX_FILE_SIZE_MB')}MB")
    
    # Upload to Supabase Storage
    # Ensure user_id defaults to a safe path if None
    uid = user_id or "anonymous"
    storage_path = f"documents/{uid}/{file.filename}"
    
    try:
        supabase.storage.from_("documents").upload(storage_path, content, {"upsert": "true"})
    except Exception as storage_err:
        logger.error(f"Failed to upload to Supabase storage: {storage_err}")
        # Proceed even if bucket doesn't exist, but create a record
    
    # Create document record
    doc = supabase.table("documents").insert({
        "user_id": user_id,  # references auth.users(id), can be null for local tests
        "filename": file.filename,
        "file_path": storage_path,
        "file_size": len(content),
        "status": "UPLOADED"
    }).execute()
    
    document_id = doc.data[0]["id"]
    
    # Save file temporarily for processing
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"{document_id}.pdf")
    with open(temp_path, "wb") as f:
        f.write(content)
    
    # Run pipeline in background
    background_tasks.add_task(pipeline_service.run, document_id, temp_path)
    
    logger.info(f"Document uploaded: {document_id} ({file.filename})")
    
    return {
        "document_id": document_id,
        "filename": file.filename,
        "status": "UPLOADED",
        "message": "Document received. Processing started."
    }
