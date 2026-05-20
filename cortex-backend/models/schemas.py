from pydantic import BaseModel
from typing import Optional, List, Any

class QueryRequest(BaseModel):
    question: str
    document_id: str
    conversation_id: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    filename: str
    status: str
    current_stage: Optional[str] = None
    error_message: Optional[str] = None
    chunk_count: int
    created_at: str
