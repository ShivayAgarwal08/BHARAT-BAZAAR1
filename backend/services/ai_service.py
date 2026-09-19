import asyncio
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx
from google import genai
from google.genai import types
from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator


logger = logging.getLogger(__name__)
DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"
DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"
GEMINI_ATTEMPT_TIMEOUT_SECONDS = 60
GEMINI_PROVIDER_BUDGET_SECONDS = 35
GEMINI_MAX_ATTEMPTS = 2
GROQ_ATTEMPT_TIMEOUT_SECONDS = 35
AI_TOTAL_TIMEOUT_SECONDS = 70
ENGLISH_STOP_WORDS = {"a", "an", "and", "are", "for", "have", "i", "in", "is", "it", "of", "the", "to", "with"}


class GeminiProductDraft(BaseModel):
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
        if self.suggested_price_min is not None and self.suggested_price_max is not None and self.suggested_price_min > self.suggested_price_max:
            raise ValueError("Suggested price minimum cannot exceed maximum")
        return self


def _clean_transcript(description: str) -> str:
    return " ".join(description.split())


def _listing_language(transcript: str, requested_language: str) -> str:
    if re.search(r"[\u0900-\u097F]", transcript):
        return "hi"
    return (requested_language or "unspecified").strip() or "unspecified"


def _draft_title(transcript: str) -> str:
    return " ".join(transcript.split()[:12])[:120] or "Product listing draft"


def _draft_tags(transcript: str) -> List[str]:
    tags: List[str] = []
    for word in re.findall(r"[^\W_]+", transcript.lower(), flags=re.UNICODE):
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
    return max(1, int(match.group(1).translate(str.maketrans("०१२३४५६७८९", "0123456789"))))


async def create_basic_draft(description: str, language: str = "hi") -> Dict[str, Any]:
    transcript = _clean_transcript(description)
    title = _draft_title(transcript)
    return {
        "source": "basic_draft", "provider": None, "product_name": title, "category": None,
        "material": None, "materials": [], "min_price": None, "max_price": None,
        "suggested_price": None, "suggested_price_min": None, "suggested_price_max": None,
        "target_customer": None, "selling_points": [], "profit_margin": None,
        "quantity": _extract_quantity(transcript), "tags": _draft_tags(transcript), "greeting": None,
        "title": title, "description": transcript, "language": language,
    }


def _provider_status(error: Exception) -> Optional[int]:
    for name in ("status_code", "status", "code"):
        value = getattr(error, name, None)
        if isinstance(value, int):
            return value
    value = getattr(getattr(error, "response", None), "status_code", None)
    return value if isinstance(value, int) else None


def _is_transient_error(error: Exception) -> bool:
    return isinstance(error, (TimeoutError, asyncio.TimeoutError, httpx.TimeoutException, httpx.NetworkError)) or _provider_status(error) in {429, 503}


def _eligible_for_groq(error: Exception) -> bool:
    """Only provider-unavailable and unusable-output failures may fall through."""
    return _is_transient_error(error) or _provider_status(error) == 404 or isinstance(error, (ValidationError, ValueError))


def _retry_after_seconds(error: Exception) -> Optional[float]:
    headers = getattr(getattr(error, "response", None), "headers", None)
    value = headers.get("retry-after") if headers else None
    try:
        return max(0.0, float(value)) if value is not None else None
    except (TypeError, ValueError):
        return None


def _to_response(draft: GeminiProductDraft, language: str, provider: str) -> Dict[str, Any]:
    estimated_price = None
    if draft.suggested_price_min is not None and draft.suggested_price_max is not None:
        estimated_price = (draft.suggested_price_min + draft.suggested_price_max) / 2
    return {
        "source": "ai", "provider": provider, "product_name": draft.title, "title": draft.title,
        "description": draft.description, "category": draft.category, "material": ", ".join(draft.materials),
        "materials": draft.materials, "quantity": draft.quantity, "tags": draft.tags,
        "min_price": draft.suggested_price_min, "max_price": draft.suggested_price_max,
        "suggested_price": estimated_price, "suggested_price_min": draft.suggested_price_min,
        "suggested_price_max": draft.suggested_price_max, "target_customer": draft.target_customer,
        "selling_points": draft.selling_points, "profit_margin": None, "greeting": None, "language": language,
    }


def _product_prompt(description: str, language: str) -> str:
    return f"""You create editable product-listing drafts for Bharat Bazaar artisans.

Transcript language hint: {_listing_language(description, language)}
Artisan transcript (the source of truth):
---
{description}
---

Return only the requested JSON structure. Keep the listing in the transcript's language unless the transcript explicitly asks for another language. Preserve stated facts and product meaning. Do not invent factual claims, certifications, sales history, profit margin, revenue, demand statistics, materials, quantities, locations, product features, occasions, use cases, or quality judgments. The description and selling points must be neutral restatements of transcript facts only. Use "other" when no category can be determined. Only include stated materials. Extract the stated quantity; use 1 only when no quantity was stated. Target customer may be null. Suggested price fields are optional AI estimates in INR, and must both be null when there is insufficient basis. Never imply an estimate is live market data."""


def _groq_schema() -> Dict[str, Any]:
    schema = GeminiProductDraft.model_json_schema()
    schema["additionalProperties"] = False
    schema["required"] = list(schema["properties"].keys())
    return schema


async def _generate_with_gemini(transcript: str, language: str, deadline: float) -> Tuple[Optional[Dict[str, Any]], bool]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.info("Gemini product generation skipped; reason=missing_api_key")
        return None, False
    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=GEMINI_ATTEMPT_TIMEOUT_SECONDS * 1000, retry_options=types.HttpRetryOptions(attempts=1)))
    for attempt in range(1, GEMINI_MAX_ATTEMPTS + 1):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return None, True
        try:
            response = await asyncio.wait_for(asyncio.to_thread(client.interactions.create, model=model, input=_product_prompt(transcript, language), response_format={"type": "text", "mime_type": "application/json", "schema": GeminiProductDraft.model_json_schema()}), timeout=min(GEMINI_ATTEMPT_TIMEOUT_SECONDS, remaining))
            if not response.output_text:
                raise ValueError("Gemini returned no structured text")
            return _to_response(GeminiProductDraft.model_validate_json(response.output_text), language, "gemini"), False
        except Exception as error:
            transient = _is_transient_error(error)
            logger.warning("Gemini product generation failed model=%s attempt=%d/%d status=%s transient=%s error_class=%s", model, attempt, GEMINI_MAX_ATTEMPTS, _provider_status(error), transient, type(error).__name__)
            if not transient or attempt == GEMINI_MAX_ATTEMPTS:
                return None, _eligible_for_groq(error)
            delay = _retry_after_seconds(error) or 1.0
            if time.monotonic() + delay >= deadline:
                return None, True
            await asyncio.sleep(delay)
    return None, True


async def _generate_with_groq(transcript: str, language: str, deadline: float) -> Optional[Dict[str, Any]]:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        logger.info("Groq product generation skipped; reason=missing_api_key")
        return None
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        return None
    model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip() or DEFAULT_GROQ_MODEL
    timeout = min(GROQ_ATTEMPT_TIMEOUT_SECONDS, remaining)
    try:
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1", timeout=timeout)
        completion = await asyncio.wait_for(asyncio.to_thread(client.chat.completions.create, model=model, messages=[{"role": "user", "content": _product_prompt(transcript, language)}], response_format={"type": "json_schema", "json_schema": {"name": "product_listing", "strict": True, "schema": _groq_schema()}}), timeout=timeout)
        draft = GeminiProductDraft.model_validate_json(completion.choices[0].message.content or "")
        return _to_response(draft, language, "groq")
    except Exception as error:
        logger.warning("Groq product generation failed model=%s status=%s error_class=%s", model, _provider_status(error), type(error).__name__)
        return None


async def analyze_product_input(description: str, language: str = "hi") -> Dict[str, Any]:
    transcript = _clean_transcript(description)
    if not transcript:
        raise ValueError("Product description cannot be blank")
    listing_language = _listing_language(transcript, language)
    total_deadline = time.monotonic() + AI_TOTAL_TIMEOUT_SECONDS
    gemini_result, try_groq = await _generate_with_gemini(transcript, listing_language, min(total_deadline, time.monotonic() + GEMINI_PROVIDER_BUDGET_SECONDS))
    if gemini_result:
        return gemini_result
    if try_groq:
        groq_result = await _generate_with_groq(transcript, listing_language, total_deadline)
        if groq_result:
            return groq_result
    logger.info("Product generation exhausted configured providers; returning basic draft")
    return await create_basic_draft(transcript, listing_language)


async def generate_product_listing(analysis: Dict[str, Any]) -> Dict[str, Any]:
    return analysis
