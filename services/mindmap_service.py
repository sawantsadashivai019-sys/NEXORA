from __future__ import annotations
import logging
from typing import List, Optional, Any
from pydantic import BaseModel, Field, ValidationError
from .grok_service import GrokService

logger = logging.getLogger(__name__)

grok = GrokService()

class MapNode(BaseModel):
    id: str
    label: str
    content: Optional[str] = ''
    children: List['MapNode'] = Field(default_factory=list)
    source_ref: Optional[str] = None  # should map to UploadedFile.id or similar
    text_snippet: Optional[str] = None

    # pydantic v2-friendly configuration; keep compatibility with v1 semantics
    model_config = {
        "from_attributes": True,
        "arbitrary_types_allowed": True
    }

MapNode.update_forward_refs()

class MindMapService:
    """Generates mind maps using Grok and validates output with Pydantic models."""

    def generate_mindmap(self, knowledge_base) -> List[MapNode]:
        # Build system prompt
        system_prompt = (
            "You are a Knowledge Graph Architect. Given the documents in the knowledge base, "
            "produce a hierarchical JSON object representing the main topics, subtopics, and leaf points. "
            "Each node must follow this schema: {\n  id: string,\n  label: string,\n  content: string,\n  children: [...],\n  source_ref: string (the ID of the source file),\n  text_snippet: string (5-10 words)\n}\n"
            "Ensure all leaf nodes include a valid source_ref and a short text_snippet pulled verbatim from the source. "
            "Output only valid JSON that can be parsed by a JSON parser."
        )

        try:
            # Fallback to local text content always since Grok doesn't have file search
            files = knowledge_base.files.filter(content__isnull=False).exclude(content='')
            if not files.exists():
                raise ValueError("No files available for mind map generation")
                
            sources_text = "\n\n".join(f.content for f in files)
            parsed = grok.generate_structured_mindmap(
                system_prompt=system_prompt,
                files_or_text=sources_text[:150000]  # rough char limit
            )
            # Validate parsed JSON into MapNode(s)
            if isinstance(parsed, dict) and 'id' in parsed:
                root = MapNode.parse_obj(parsed)
                return [root]
            elif isinstance(parsed, list):
                nodes = [MapNode.parse_obj(item) for item in parsed]
                return nodes
            else:
                raise ValueError('Unexpected structure from Grok')
        except Exception as e:
            logger.warning(f"Grok mindmap generation failed or returned invalid output: {e}. Falling back to local generator.")

            # Local, deterministic fallback: one node per file, with up to two child bullet points
            fallback_nodes: List[MapNode] = []
            root_id = f"kb-{str(knowledge_base.id)}"
            root = MapNode(
                id=root_id,
                label=knowledge_base.name or 'Knowledge Base',
                content=(knowledge_base.description or '')[:500],
                children=[],
            )

            for f in knowledge_base.files.all():
                file_node = MapNode(
                    id=str(f.id),
                    label=f.name,
                    content=(f.content or '')[:300],
                    children=[],
                    source_ref=str(f.id)
                )

                # simple chunking: take first 2 sentences as child nodes
                text = (f.content or '').strip()
                if text:
                    sentences = [s.strip() for s in text.replace('\n', ' ').split('.') if s.strip()]
                    for i, s in enumerate(sentences[:2]):
                        child = MapNode(
                            id=f"{f.id}-p{i}",
                            label=(s[:60] + '...') if len(s) > 60 else s,
                            content=s,
                            children=[],
                            source_ref=str(f.id),
                            text_snippet=' '.join(s.split()[:10])
                        )
                        file_node.children.append(child)

                root.children.append(file_node)

            return [root]
