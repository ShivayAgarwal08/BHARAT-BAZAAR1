import asyncio
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional

import httpx
from google import genai
from google.genai import types
from pydantic import BaseModel, Field, field_validator, model_validator


logger = logging.getLogger(__name__)

# Gemini 3.6 Flash is a current, broadly available Flash model. Deployments can
# select another supported model without a code change through GEMINI_MODEL.
DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_ATTEMPT_TIMEOUT_SECONDS = 60
GEMINI_TOTAL_TIMEOUT_SECONDS = 65
GEMINI_MAX_ATTEMPTS = 2
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


def _listing_language(transcript: str, requested_language: str) -> str:
    """Avoid telling Gemini that Devanagari speech is English."""
    if re.search(r"[\u0900-\u097F]", transcript):
        return "hi"
    return (requested_language or "unspecified").strip() or "unspecified"


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
    if isinstance(error, TimeoutError):
        return "network"
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


def _provider_status(error: Exception) -> Optional[int]:
    status = getattr(error, "status_code", None)
    if status is None:
        status = getattr(error, "code", None)
    return status if isinstance(status, int) else None


def _is_transient_gemini_error(error: Exception) -> bool:
    if isinstance(error, (TimeoutError, httpx.TimeoutException, httpx.NetworkError)):
        return True
    return _provider_status(error) in {429, 503}


def _retry_after_seconds(error: Exception) -> Optional[float]:
    response = getattr(error, "response", None)
    headers = getattr(response, "headers", None)
    if not headers:
        return None
    retry_after = headers.get("retry-after") or headers.get("Retry-After")
    try:
        return max(0.0, float(retry_after)) if retry_after is not None else None
    except (TypeError, ValueError):
        return None


def _to_response(draft: GeminiProductDraft, language: str) -> Dict[str, Any]:
    if not draft.title.strip() or not draft.description.strip():
        raise ValueError("Gemini structured result has unusable title or description")

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

Transcript language hint: {_listing_language(description, language)}
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
    transcript = _clean_transcript(description)
    listing_language = _listing_language(transcript, language)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.info("Gemini product generation skipped; fallback_used=true reason=missing_api_key")
        return await create_basic_draft(transcript, listing_language)

    model_name = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
    deadline = time.monotonic() + GEMINI_TOTAL_TIMEOUT_SECONDS
    client = None

    for attempt in range(1, GEMINI_MAX_ATTEMPTS + 1):
        remaining_seconds = deadline - time.monotonic()
        if remaining_seconds <= 0:
            break
        try:
            logger.info(
                "Gemini product generation requested model=%s attempt=%d/%d transcript_length=%d",
                model_name,
                attempt,
                GEMINI_MAX_ATTEMPTS,
                len(transcript),
            )
            if client is None:
                client = genai.Client(
                    api_key=api_key,
                    http_options=types.HttpOptions(
                        timeout=GEMINI_ATTEMPT_TIMEOUT_SECONDS * 1000,
                        # Own retry loop below keeps two attempts and the total deadline predictable.
                        retry_options=types.HttpRetryOptions(attempts=1),
                    ),
                )
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.interactions.create,
                    model=model_name,
                    input=_product_prompt(transcript, listing_language),
                    response_format={
                        "type": "text",
                        "mime_type": "application/json",
                        "schema": GeminiProductDraft.model_json_schema(),
                    },
                ),
                timeout=min(GEMINI_ATTEMPT_TIMEOUT_SECONDS, remaining_seconds),
            )
            if not response.output_text:
                raise ValueError("Gemini returned no structured text")
            result = _to_response(GeminiProductDraft.model_validate_json(response.output_text), listing_language)
            logger.info(
                "Gemini product generation succeeded model=%s attempt=%d title_length=%d description_length=%d fallback_used=false",
                model_name,
                attempt,
                len(result["title"]),
                len(result["description"]),
            )
            return result
        except Exception as error:
            transient = _is_transient_gemini_error(error)
            retry_after = _retry_after_seconds(error)
            logger.warning(
                "Gemini product generation failed model=%s attempt=%d/%d error_class=%s status=%s category=%s transient=%s",
                model_name,
                attempt,
                GEMINI_MAX_ATTEMPTS,
                type(error).__name__,
                _provider_status(error),
                get_gemini_failure_category(error),
                transient,
            )
            if not transient or attempt == GEMINI_MAX_ATTEMPTS:
                break

            backoff_seconds = retry_after if retry_after is not None else 1.0
            if time.monotonic() + backoff_seconds >= deadline:
                logger.warning("Gemini retry skipped because the total deadline would be exceeded.")
                break
            logger.info("Gemini product generation retrying after %.1f seconds.", backoff_seconds)
            await asyncio.sleep(backoff_seconds)

    logger.warning("Gemini product generation exhausted; fallback_used=true")
    return await create_basic_draft(transcript, listing_language)


async def generate_product_listing(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Analysis already contains the listing draft; do not generate a second draft."""
    return analysis
