import asyncio
import logging
import time
from datetime import datetime
from core.supabase_client import supabase
from services.parser_service import parser_service
from services.chunking_service import chunking_service
from services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

STAGES = [
    "PARSING",
    "TEXT_CLEANING",
    "CHUNKING", 
    "EMBEDDING",
    "INDEXING",
    "VERIFYING",
]

class PipelineService:
    
    async def run(self, document_id: str, file_path: str):
        logger.info(f"[{document_id}] Pipeline started")
        
        try:
            # STAGE 1: PARSING
            await self._set_stage(document_id, "PARSING")
            pages = await self._run_stage(
                document_id, "PARSING",
                parser_service.parse, file_path, document_id
            )
            
            # STAGE 2: CHUNKING
            await self._set_stage(document_id, "CHUNKING")
            chunks = await self._run_stage(
                document_id, "CHUNKING",
                chunking_service.chunk_pages, pages
            )
            
            # STAGE 3: EMBEDDING
            await self._set_stage(document_id, "EMBEDDING")
            texts = [c["content"] for c in chunks]
            embeddings = await self._run_stage(
                document_id, "EMBEDDING",
                embedding_service.embed_texts, texts
            )
            
            # STAGE 4: INDEXING
            await self._set_stage(document_id, "INDEXING")
            await self._run_stage(
                document_id, "INDEXING",
                self._store_chunks, document_id, chunks, embeddings
            )
            
            # STAGE 5: VERIFYING
            await self._set_stage(document_id, "VERIFYING")
            await self._run_stage(
                document_id, "VERIFYING",
                self._verify_retrieval, document_id
            )
            
            # SUCCESS
            supabase.table("documents").update({
                "status": "READY",
                "current_stage": "READY",
                "chunk_count": len(chunks)
            }).eq("id", document_id).execute()
            
            logger.info(f"[{document_id}] Pipeline completed successfully. {len(chunks)} chunks indexed.")
            
        except Exception as e:
            logger.error(f"[{document_id}] Pipeline FAILED: {e}")
            supabase.table("documents").update({
                "status": "FAILED",
                "error_message": str(e)
            }).eq("id", document_id).execute()
    
    async def _run_stage(self, document_id: str, stage: str, fn, *args):
        start = time.time()
        for attempt in range(3):
            try:
                result = await fn(*args) if asyncio.iscoroutinefunction(fn) else fn(*args)
                duration = int((time.time() - start) * 1000)
                self._log(document_id, stage, "SUCCESS", f"Completed in {duration}ms")
                return result
            except Exception as e:
                wait = 2 ** attempt
                logger.error(f"[{document_id}] {stage} attempt {attempt+1} failed: {e}")
                self._log(document_id, stage, "RETRY", str(e), str(e))
                if attempt < 2:
                    await asyncio.sleep(wait)
                else:
                    self._log(document_id, stage, "FAILED", str(e), str(e))
                    raise
    
    async def _store_chunks(self, document_id: str, chunks, embeddings):
        rows = [
            {
                "document_id": document_id,
                "content": chunk["content"],
                "embedding": embedding,
                "chunk_index": chunk["chunk_index"],
                "page_number": chunk.get("page_number"),
                "metadata": {}
            }
            for chunk, embedding in zip(chunks, embeddings)
        ]
        # Batch insert 100 at a time
        for i in range(0, len(rows), 100):
            batch = rows[i:i+100]
            supabase.table("document_chunks").insert(batch).execute()
            logger.info(f"[{document_id}] Inserted batch {i//100 + 1}")
    
    async def _verify_retrieval(self, document_id: str):
        result = supabase.table("document_chunks") \
            .select("id") \
            .eq("document_id", document_id) \
            .limit(1) \
            .execute()
        
        if not result.data:
            raise Exception("Retrieval verification failed: no chunks found in database")
        
        logger.info(f"[{document_id}] Retrieval verification passed")
    
    async def _set_stage(self, document_id: str, stage: str):
        supabase.table("documents").update({
            "current_stage": stage,
            "status": stage
        }).eq("id", document_id).execute()
    
    def _log(self, document_id: str, stage: str, status: str, message: str, error: str = None):
        supabase.table("processing_logs").insert({
            "document_id": document_id,
            "stage": stage,
            "status": status,
            "message": message,
            "error": error
        }).execute()

pipeline_service = PipelineService()
