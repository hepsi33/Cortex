import fitz  # PyMuPDF
import pdfplumber
import pytesseract
import unicodedata
import re
import logging
from pathlib import Path
from PIL import Image
from typing import List, Dict

logger = logging.getLogger(__name__)

class ParserService:
    
    async def parse(self, file_path: str, document_id: str) -> List[Dict]:
        parsers = [
            ("PyMuPDF", self._parse_pymupdf),
            ("pdfplumber", self._parse_pdfplumber),
            ("Docling", self._parse_docling),
        ]
        
        for parser_name, parser_fn in parsers:
            try:
                logger.info(f"[{document_id}] Trying parser: {parser_name}")
                pages = await parser_fn(file_path)
                
                if self._needs_ocr(pages):
                    logger.info(f"[{document_id}] Low text density detected. Switching to OCR.")
                    pages = await self._parse_ocr(file_path)
                
                cleaned = [self._clean_text(p) for p in pages]
                logger.info(f"[{document_id}] Parsing successful with {parser_name}. Pages: {len(cleaned)}")
                return cleaned
                
            except Exception as e:
                logger.warning(f"[{document_id}] {parser_name} failed: {e}. Trying next parser.")
                continue
        
        raise Exception(f"[{document_id}] All parsers failed. Document may be corrupted.")
    
    def _needs_ocr(self, pages: List[Dict]) -> bool:
        if not pages:
            return True
        avg_length = sum(len(p.get("text", "")) for p in pages) / len(pages)
        return avg_length < 100
    
    async def _parse_pymupdf(self, file_path: str) -> List[Dict]:
        doc = fitz.open(file_path)
        pages = []
        for page_num, page in enumerate(doc):
            text = page.get_text("text")
            pages.append({"text": text, "page_number": page_num + 1})
        doc.close()
        return pages
    
    async def _parse_pdfplumber(self, file_path: str) -> List[Dict]:
        pages = []
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                pages.append({"text": text, "page_number": page_num + 1})
        return pages
    
    async def _parse_docling(self, file_path: str) -> List[Dict]:
        from docling.document_converter import DocumentConverter
        converter = DocumentConverter()
        result = converter.convert(file_path)
        doc = result.document
        pages = []
        for page in doc.pages:
            page_num = page.page_no
            page_text_items = []
            for item, _ in doc.iterate_items(page_no=page_num):
                if hasattr(item, "text") and item.text:
                    page_text_items.append(item.text)
            text = "\n".join(page_text_items)
            pages.append({"text": text, "page_number": page_num})
        return pages
    
    async def _parse_ocr(self, file_path: str) -> List[Dict]:
        logger.info("OCR mode activated via Tesseract")
        doc = fitz.open(file_path)
        pages = []
        for page_num, page in enumerate(doc):
            pix = page.get_pixmap(dpi=200)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            text = pytesseract.image_to_string(img)
            pages.append({"text": text, "page_number": page_num + 1})
        doc.close()
        return pages
    
    def _clean_text(self, page: Dict) -> Dict:
        text = page.get("text", "")
        text = text.replace("\x00", "")
        text = unicodedata.normalize("NFKC", text)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'[^\S\n ]+', '', text)
        page["text"] = text.strip()
        return page

parser_service = ParserService()
