import logging
import requests
from bs4 import BeautifulSoup
from typing import Optional

logger = logging.getLogger(__name__)

class WebService:
    """Service to handle robust web scraping and content extraction."""

    def __init__(self, timeout: int = 15):
        self.timeout = timeout
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }

    def fetch_content(self, url: str) -> str:
        """
        Scrape content from a URL and extract clean text.
        Raises ValueError if scraping fails.
        """
        try:
            response = requests.get(
                url, 
                headers=self.headers, 
                timeout=self.timeout,
                allow_redirects=True
            )
            response.raise_for_status()
            
            # Use requests built-in encoding detection
            html = response.text
            
            soup = BeautifulSoup(html, 'html.parser')

            # Metadata extraction (Optional but helpful for context)
            title = soup.title.string if soup.title else ""
            
            # Robust extraction logic: Remove noisy elements
            for element in soup(["script", "style", "nav", "footer", "header", "aside", "form", "iframe", "noscript"]):
                element.decompose()

            # Attempt to find the "main" content if possible
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_='content') or soup.find('div', id='content')
            
            if main_content:
                text = main_content.get_text(separator='\n')
            else:
                text = soup.get_text(separator='\n')

            # Post-processing: Clean up whitespace and empty lines
            lines = [line.strip() for line in text.splitlines()]
            # Filter out very short or empty lines that aren't useful
            cleaned_lines = [line for line in lines if len(line) > 0]
            
            final_text = "\n".join(cleaned_lines)

            if not final_text.strip() or len(final_text) < 200:
                logger.info(f"Static scraping yielded insufficient content for {url}. Falling back to Gemini...")
                return self._fetch_with_gemini(url)

            output = f"Webpage Content ({url})\n"
            if title:
                output += f"Title: {title}\n"
            output += f"\n{final_text}"
            
            return output

        except requests.RequestException as e:
            logger.error(f"HTTP request failed for {url}: {e}")
            raise ValueError(f"Failed to fetch webpage: {str(e)}")
        except Exception as e:
            logger.error(f"Error parsing webpage {url}: {e}")
            # Try Gemini fallback as a last resort for any parsing error
            try:
                return self._fetch_with_gemini(url)
            except Exception:
                raise ValueError(f"Failed to parse webpage content: {str(e)}")

    def _fetch_with_gemini(self, url: str) -> str:
        """Use Gemini 2.5 Flash to extract readable text from a URL."""
        try:
            from .gemini_service import GeminiService
            gemini = GeminiService()
            
            prompt = f"Please extract all the main readable text content from this webpage: {url}. Provide a clean, structured text version of the article or page contents, ignoring navigation, ads, and footers."
            
            response = gemini.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            
            if response and response.text:
                return f"Webpage Content ({url}) [Extracted via AI]\n\n{response.text}"
            else:
                raise ValueError("Gemini returned an empty response.")
        except Exception as e:
            logger.error(f"Gemini fallback failed for {url}: {e}")
            raise ValueError(f"Robust extraction failed: Both static and AI methods could not retrieve content from {url}.")
