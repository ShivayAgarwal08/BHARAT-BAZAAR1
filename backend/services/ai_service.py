import logging
import os
import re
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, Field, field_validator, model_validator


logger = logging.getLogger(__name__)

# Gemini 3.6 Flash is a current, broadly available Flash model. Deployments can
# select another supported model without a code change through GEMINI_MODEL.
DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"
ENGLISH_STOP_WORDS = {
    "a", "an", "and", "are", "for", "have", "i", "in", "is", "it", "of", "the", "to", "with",
}


class GeminiProductDraft(BaseModel):
    """The only structured shape accepted from Gemini for a listing draft."""

    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=3000)
    category: str = Field(min_length=1, max_length=80)
    materials: List[str] = Field(default_factory=list, max_length=10)
    quantity: int = Field(ge=1, le=100000)
    tags: List[str] = Field(default_factory=list, max_length=10)
    suggested_price_min: Optional[float] = Field(default=None, ge=0)
    suggested_price_max: Optional[float] = Field(default=None, ge=0)
    target_customer: Optional[str] = Field(default=None, max_length=300)
    selling_points: List[str] = Field(default_factory=list, max_length=8)

    @field_validator("title", "description", "category")
    @classmethod
    def require_nonempty_text(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Listing text cannot be empty")
        return value

    @field_validator("materials", "tags", "selling_points")
    @classmethod
    def normalize_lists(cls, values: List[str]) -> List[str]:
        return [" ".join(value.split()) for value in values if value and value.strip()]

    @model_validator(mode="after")
    def validate_price_range(self):
        if (
            self.suggested_price_min is not None
            and self.suggested_price_max is not None
            and self.suggested_price_min > self.suggested_price_max
        ):
            raise ValueError("Suggested price minimum cannot exceed maximum")
        return self


def _clean_transcript(description: str) -> str:
    return " ".join(description.split())


def _draft_title(transcript: str) -> str:
    words = transcript.split()
    return " ".join(words[:12])[:120]


def _draft_tags(transcript: str) -> List[str]:
    words = re.findall(r"[^\W_]+", transcript.lower(), flags=re.UNICODE)
    tags = []
    for word in words:
        if word in ENGLISH_STOP_WORDS or word.isdigit() or len(word) < 2 or word in tags:
            continue
        tags.append(word)
        if len(tags) == 5:
            break
    return tags


def _extract_quantity(transcript: str) -> int:
    match = re.search(r"(?<!\d)([0-9\u0966-\u096f]{1,5})(?!\d)", transcript)
    if not match:
        return 1
    devanagari_digits = str.maketrans("०१२३४५६७८९", "0123456789")
    return max(1, int(match.group(1).translate(devanagari_digits)))


async def create_basic_draft(description: str, language: str = "hi") -> Dict[str, Any]:
    """Create a deterministic, transcript-only listing draft with no financial claims."""
    transcript = _clean_transcript(description)
    title = _draft_title(transcript)
    return {
        "source": "basic_draft",
        "product_name": title,
        "category": None,
        "material": None,
        "materials": [],
        "min_price": None,
        "max_price": None,
        "suggested_price": None,
        "suggested_price_min": None,
        "suggested_price_max": None,
        "target_customer": None,
        "selling_points": [],
        "profit_margin": None,
        "quantity": _extract_quantity(transcript),
        "tags": _draft_tags(transcript),
        "greeting": None,
        "title": title,
        "description": transcript,
        "language": language,
    }


def get_gemini_failure_category(error: Exception) -> str:
    """Classify failures for logs and operational testing without exposing them to users."""
    message = str(error).lower()
    if any(term in message for term in ("api key", "apikey", "invalid key", "unauthenticated", "401")):
        return "invalid_key"
    if any(term in message for term in ("quota", "resource_exhausted", "429")):
        return "quota"
    if any(term in message for term in ("json", "validation", "schema", "parse")):
        return "parsing"
    if any(term in message for term in ("network", "connection", "timeout", "dns")):
        return "network"
    if any(term in message for term in ("not found", "404", "unsupported")):
        return "model_unavailable"
    return "other"


def _to_response(draft: GeminiProductDraft, language: str) -> Dict[str, Any]:
    estimated_price = None
    if draft.suggested_price_min is not None and draft.suggested_price_max is not None:
        estimated_price = (draft.suggested_price_min + draft.suggested_price_max) / 2

    return {
        "source": "ai",
        "product_name": draft.title,
        "title": draft.title,
        "description": draft.description,
        "category": draft.category,
        "material": ", ".join(draft.materials),
        "materials": draft.materials,
        "quantity": draft.quantity,
        "tags": draft.tags,
        # These are model estimates only; the UI labels them for review.
        "min_price": draft.suggested_price_min,
        "max_price": draft.suggested_price_max,
        "suggested_price": estimated_price,
        "suggested_price_min": draft.suggested_price_min,
        "suggested_price_max": draft.suggested_price_max,
        "target_customer": draft.target_customer,
        "selling_points": draft.selling_points,
        "profit_margin": None,
        "greeting": None,
        "language": language,
    }


def _product_prompt(description: str, language: str) -> str:
    return f"""
You create editable product-listing drafts for Bharat Bazaar artisans.

Transcript language hint: {language}
Artisan transcript (the source of truth):
---
{description}
---

Return only the requested JSON structure. Keep the listing in the transcript's
language unless the transcript explicitly asks for another language. Preserve
the artisan's stated facts and product meaning. Do not invent factual claims,
certifications, sales history, profit margin, revenue, demand statistics,
materials, quantities, locations, product features, occasions, use cases, or
quality judgments that are not stated. The description must be a concise
restatement of transcript facts only; do not add marketing copy. Selling points
must be direct, neutral restatements of facts the artisan provided.

Use a short, useful category. Use "other" when no category can be determined.
Only include materials that were stated. Extract the stated quantity; use 1
only when no quantity was stated. Tags and selling points must be grounded in
the transcript. Target customer may be null. Suggested price fields are optional
AI estimates in INR, and must both be null when there is insufficient basis.
Never imply that an estimate is live market data.
"""


async def analyze_product_input(description: str, language: str = "hi") -> Dict[str, Any]:
    """Use Gemini structured output or return an explicitly labeled local draft."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return await create_basic_draft(description, language)

    model_name = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=30000),
        )
        response = client.interactions.create(
            model=model_name,
            input=_product_prompt(_clean_transcript(description), language),
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": GeminiProductDraft.model_json_schema(),
            },
        )
        if not response.output_text:
            raise ValueError("Gemini returned no structured text")
        return _to_response(GeminiProductDraft.model_validate_json(response.output_text), language)
    except Exception as error:
        logger.warning("Gemini product generation failed (%s); using basic draft.", get_gemini_failure_category(error))
        return await create_basic_draft(description, language)


async def generate_product_listing(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Analysis already contains the listing draft; do not generate a second draft."""
    return analysis
