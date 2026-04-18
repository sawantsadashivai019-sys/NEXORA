import logging
from typing import Optional
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)

class YouTubeService:
    """Service to handle YouTube video transcript extraction."""

    @staticmethod
    def extract_video_id(url: str) -> Optional[str]:
        """Extract the video ID from various YouTube URL formats."""
        try:
            parsed_url = urlparse(url)
            hostname = parsed_url.hostname.lower() if parsed_url.hostname else ""

            if 'youtu.be' in hostname:
                return parsed_url.path.lstrip('/')
            
            if 'youtube.com' in hostname:
                if parsed_url.path == '/watch':
                    return parse_qs(parsed_url.query).get('v', [None])[0]
                if parsed_url.path.startswith(('/embed/', '/v/')):
                    return parsed_url.path.split('/')[2]
                if parsed_url.path.startswith('/shorts/'):
                    return parsed_url.path.split('/')[2]
            
            return None
        except Exception as e:
            logger.error(f"Error parsing YouTube URL {url}: {e}")
            return None

    def get_transcript(self, url: str) -> str:
        """
        Fetch the transcript for a YouTube video with specific priority:
        1. Manually created (en, en-IN, hi, mr)
        2. Auto-generated (en, en-IN, hi, mr)
        """
        video_id = self.extract_video_id(url)
        if not video_id:
            raise ValueError(f"Could not extract a valid video ID from URL: {url}")

        try:
            # Instantiate the API
            ytt_api = YouTubeTranscriptApi()
            
            # Fetch the transcript list
            transcript_list = ytt_api.list(video_id)
            
            # Priority languages
            langs = ['en', 'en-IN', 'hi', 'mr']
            
            transcript = None
            
            # 1. Attempt to find a manual transcript in priority languages
            try:
                transcript = transcript_list.find_manually_created_transcript(langs)
                logger.info(f"Found manual transcript for {video_id} in {transcript.language_code}")
            except Exception:
                # 2. Fallback to auto-generated transcript in priority languages
                try:
                    transcript = transcript_list.find_generated_transcript(langs)
                    logger.info(f"Found auto-generated transcript for {video_id} in {transcript.language_code}")
                except Exception:
                    # If absolutely no preferred transcript, try to get any as a last resort
                    try:
                        transcript = transcript_list.find_transcript(langs)
                    except Exception:
                        raise ValueError(f"No transcripts (manual or auto) found in English, Hindi, or Marathi for video {video_id}.")

            # Fetch the actual transcript content
            data = transcript.fetch()
            # The fetch() method returns a FetchedTranscript object which is iterable
            text_content = " ".join([snippet.text for snippet in data])
            
            return f"YouTube Video Transcript ({url}) [{transcript.language_code} - {'manual' if not transcript.is_generated else 'auto'}]:\n\n{text_content}"

        except TranscriptsDisabled:
            raise ValueError("Transcripts are disabled for this video.")
        except VideoUnavailable:
            raise ValueError("The video is unavailable.")
        except Exception as e:
            # This handles "no element found" which is basically a ParseError 
            # if the response is empty or malformed.
            logger.error(f"Failed to fetch YouTube transcript for {video_id}: {e}")
            message = str(e)
            if "no element found" in message:
                message = "YouTube returned an empty transcript. This can happen with very new videos or region-restricted content."
            raise ValueError(f"YouTube Transcript Error: {message}")

