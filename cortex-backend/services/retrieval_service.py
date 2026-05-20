import logging
from core.supabase_client import supabase
from services.embedding_service import embedding_service
from services.llm_service import llm_service

logger = logging.getLogger(__name__)

class RetrievalService:
    
    async def query(
        self,
        question: str,
        document_id: str,
        conversation_history: list = [],
        top_k: int = 5
    ) -> dict:
        logger.info(f"Query received for document {document_id}: {question[:50]}...")
        
        # Step 1: Embed the question
        query_embeddings = await embedding_service.embed_texts([question])
        query_vector = query_embeddings[0]
        
        # Step 2: Vector search in Supabase
        results = supabase.rpc("match_chunks", {
            "query_embedding": query_vector,
            "match_document_id": document_id,
            "match_count": top_k
        }).execute()
        
        chunks = results.data
        
        if not chunks:
            return {
                "answer": "No relevant content found in this document for your question.",
                "sources": [],
                "model_used": None
            }
        
        logger.info(f"Retrieved {len(chunks)} chunks. Top similarity: {chunks[0].get('similarity', 0):.3f}")
        
        # Step 3: Generate answer with Groq
        response = await llm_service.generate_answer(
            question=question,
            context_chunks=chunks,
            conversation_history=conversation_history
        )
        
        return {
            "answer": response["answer"],
            "sources": chunks,
            "model_used": response["model_used"]
        }

retrieval_service = RetrievalService()
