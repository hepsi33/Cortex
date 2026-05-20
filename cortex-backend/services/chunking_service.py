import re
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class ChunkingService:
    
    def __init__(self, target_size=500, overlap=50):
        self.target_size = target_size
        self.overlap = overlap
    
    def chunk_pages(self, pages: List[Dict]) -> List[Dict]:
        all_chunks = []
        chunk_index = 0
        
        for page in pages:
            page_chunks = self._chunk_page(page)
            for chunk in page_chunks:
                chunk["chunk_index"] = chunk_index
                all_chunks.append(chunk)
                chunk_index += 1
        
        logger.info(f"Chunking complete: {len(all_chunks)} chunks from {len(pages)} pages")
        return all_chunks
    
    def _chunk_page(self, page: Dict) -> List[Dict]:
        text = page.get("text", "").strip()
        page_number = page.get("page_number", 0)
        
        if not text:
            return []
        
        # Split into paragraphs first (semantic boundary)
        paragraphs = [p.strip() for p in re.split(r'\n\n+', text) if p.strip()]
        
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            # If adding this paragraph exceeds target, save current and start new
            if len(current_chunk) + len(para) > self.target_size and current_chunk:
                chunks.append({
                    "content": current_chunk.strip(),
                    "page_number": page_number
                })
                # Overlap: carry last 50 chars into next chunk
                current_chunk = current_chunk[-self.overlap:] + " " + para
            else:
                current_chunk += (" " if current_chunk else "") + para
        
        if current_chunk.strip():
            chunks.append({
                "content": current_chunk.strip(),
                "page_number": page_number
            })
        
        return chunks

chunking_service = ChunkingService()
