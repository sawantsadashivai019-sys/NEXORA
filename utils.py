import os
import PyPDF2
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

def extract_text_from_file(file_content, filename):
    """Extract text content from various file types"""
    try:
        filename_lower = filename.lower()
        
        if filename_lower.endswith('.pdf'):
            return extract_pdf_text(file_content)
        elif filename_lower.endswith(('.txt', '.md')):
            return file_content.decode('utf-8')
        else:
            # For other files, try to decode as text first
            try:
                return file_content.decode('utf-8')
            except UnicodeDecodeError:
                raise ValueError(f"Unsupported file type: {filename}. Please upload PDF, TXT, or MD files.")
    except Exception as e:
        logger.error(f"Error extracting text from file {filename}: {e}")
        raise ValueError(f"Error extracting text from file: {e}")

def extract_text_from_url(url):
    """Extract text content from a YouTube video URL or a standard webpage."""
    from .services.youtube_service import YouTubeService
    from .services.web_service import WebService

    yt_service = YouTubeService()
    video_id = yt_service.extract_video_id(url)

    if video_id:
        # It's a YouTube URL
        return yt_service.get_transcript(url)
    else:
        # Handle as standard webpage
        web_service = WebService()
        return web_service.fetch_content(url)

def extract_pdf_text(file_content):
    """Extract text content from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        raise ValueError(f"Error extracting text from PDF: {e}")