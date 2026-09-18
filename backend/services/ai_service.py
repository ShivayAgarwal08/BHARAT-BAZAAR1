import json
import os
import re
from typing import Any, Dict, List

import google.generativeai as genai


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


MODELS_TO_TRY = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-pro-latest", "gemini-2.0-flash"]
ENGLISH_STOP_WORDS = {
    "a", "an", "and", "are", "for", "have", "i", "in", "is", "it", "of", "the", "to", "with",
}


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
        "min_price": None,
        "max_price": None,
        "suggested_price": None,
        "profit_margin": None,
        "quantity": _extract_quantity(transcript),
        "tags": _draft_tags(transcript),
        "greeting": None,
        "title": title,
        "description": transcript,
        "language": language,
    }


def _parse_json_response(raw_text: str) -> Dict[str, Any]:
    raw_text = raw_text.strip()
    if "```json" in raw_text:
        raw_text = raw_text.split("```json", 1)[1].split("```", 1)[0].strip()
    return json.loads(raw_text)


async def analyze_product_input(description: str, language: str = "hi") -> Dict[str, Any]:
    """Use Gemini when available; otherwise return an explicitly labeled transcript-only draft."""
    if not GEMINI_API_KEY:
        return await create_basic_draft(description, language)

    last_error = None
    for model_name in MODELS_TO_TRY:
        try:
            model = genai.GenerativeModel(model_name)
            prompt = f"""
            Act as a product market expert for rural products in India.
            Analyze the following product description: "{description}"
            Language of description: {language}

            Respond in strictly JSON format with these fields:
            - product_name: short specific name
            - category: one of handloom, pottery, jewelry, food, other
            - material: primary material
            - min_price: estimated minimum market price in INR
            - max_price: estimated maximum market price in INR
            - quantity: extracted quantity, default 1
            - tags: list of SEO tags derived from the product
            - greeting: a warm conversational greeting for the artisan in {language}
            - title: a specific listing title
            - description: a listing description based on the artisan's product
            """
            data = _parse_json_response(model.generate_content(prompt).text)
            min_price = float(data["min_price"])
            max_price = float(data["max_price"])
            suggested_price = int(((min_price + max_price) / 2) * 1.1)
            return {
                **data,
                "source": "ai",
                "min_price": min_price,
                "max_price": max_price,
                "suggested_price": suggested_price,
                "profit_margin": int(suggested_price * 0.4),
                "quantity": int(data.get("quantity") or 1),
                "tags": data.get("tags") or [],
                "language": language,
            }
        except Exception as error:
            last_error = error
            print(f"Gemini attempt with {model_name} failed: {error}")

    print(f"All Gemini models failed; returning a basic draft. Last error: {last_error}")
    return await create_basic_draft(description, language)


async def generate_product_listing(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Analysis already contains the listing draft; do not generate a simulated second draft."""
    return analysis
