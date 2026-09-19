import asyncio
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from services.ai_service import _product_prompt, analyze_product_input


class ProviderError(Exception):
    def __init__(self, status_code):
        super().__init__(f"provider error {status_code}")
        self.status_code = status_code


class AIServiceTests(unittest.TestCase):
    @staticmethod
    def _draft_json(title="Handmade Clay Diyas", description="20 handmade clay diyas."):
        return (
            '{"title":"' + title + '","description":"' + description + '",'
            '"category":"pottery","materials":["clay"],"quantity":20,'
            '"tags":["clay","diyas"],"suggested_price_min":null,'
            '"suggested_price_max":null,"target_customer":null,"selling_points":["handmade"]}'
        )

    def _gemini_client(self, create):
        return SimpleNamespace(interactions=SimpleNamespace(create=create))

    def _groq_client(self, content):
        completion = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])
        return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=lambda **_: completion)))

    def test_gemini_success_does_not_call_groq(self):
        gemini = self._gemini_client(lambda **_: SimpleNamespace(output_text=self._draft_json()))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test", "GROQ_API_KEY": "test"}), patch(
            "services.ai_service.genai.Client", return_value=gemini
        ), patch("services.ai_service.OpenAI") as groq:
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))
        self.assertEqual(result["source"], "ai")
        self.assertEqual(result["provider"], "gemini")
        groq.assert_not_called()

    def test_gemini_429_then_groq_success(self):
        gemini = self._gemini_client(lambda **_: (_ for _ in ()).throw(ProviderError(429)))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test", "GROQ_API_KEY": "test"}), patch(
            "services.ai_service.genai.Client", return_value=gemini
        ), patch("services.ai_service.OpenAI", return_value=self._groq_client(self._draft_json())) as groq, patch(
            "services.ai_service.asyncio.sleep", new_callable=AsyncMock
        ):
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))
        self.assertEqual(result["provider"], "groq")
        groq.assert_called_once()

    def test_gemini_timeout_then_groq_success(self):
        gemini = self._gemini_client(lambda **_: (_ for _ in ()).throw(TimeoutError()))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test", "GROQ_API_KEY": "test"}), patch(
            "services.ai_service.genai.Client", return_value=gemini
        ), patch("services.ai_service.OpenAI", return_value=self._groq_client(self._draft_json())), patch(
            "services.ai_service.asyncio.sleep", new_callable=AsyncMock
        ):
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))
        self.assertEqual(result["provider"], "groq")

    def test_gemini_503_then_groq_success(self):
        gemini = self._gemini_client(lambda **_: (_ for _ in ()).throw(ProviderError(503)))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test", "GROQ_API_KEY": "test"}), patch(
            "services.ai_service.genai.Client", return_value=gemini
        ), patch("services.ai_service.OpenAI", return_value=self._groq_client(self._draft_json())), patch(
            "services.ai_service.asyncio.sleep", new_callable=AsyncMock
        ):
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))
        self.assertEqual(result["provider"], "groq")

    def test_both_providers_fail_uses_basic_draft_without_provider(self):
        gemini = self._gemini_client(lambda **_: (_ for _ in ()).throw(TimeoutError()))
        groq = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=lambda **_: (_ for _ in ()).throw(TimeoutError()))))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test", "GROQ_API_KEY": "test"}), patch(
            "services.ai_service.genai.Client", return_value=gemini
        ), patch("services.ai_service.OpenAI", return_value=groq), patch(
            "services.ai_service.asyncio.sleep", new_callable=AsyncMock
        ):
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))
        self.assertEqual(result["source"], "basic_draft")
        self.assertIsNone(result["provider"])

    def test_permanent_gemini_4xx_does_not_retry_or_call_groq(self):
        calls = []
        def create(**_):
            calls.append(True)
            raise ProviderError(401)
        gemini = self._gemini_client(create)
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test", "GROQ_API_KEY": "test"}), patch(
            "services.ai_service.genai.Client", return_value=gemini
        ), patch("services.ai_service.OpenAI") as groq:
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))
        self.assertEqual(len(calls), 1)
        self.assertEqual(result["source"], "basic_draft")
        groq.assert_not_called()

    def test_hindi_groq_draft_preserves_hindi_language(self):
        hindi = self._draft_json("नीली साड़ियाँ", "मेरे पास 20 नीली साड़ियाँ हैं।")
        gemini = self._gemini_client(lambda **_: (_ for _ in ()).throw(ProviderError(503)))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test", "GROQ_API_KEY": "test"}), patch(
            "services.ai_service.genai.Client", return_value=gemini
        ), patch("services.ai_service.OpenAI", return_value=self._groq_client(hindi)), patch(
            "services.ai_service.asyncio.sleep", new_callable=AsyncMock
        ):
            result = asyncio.run(analyze_product_input("मेरे पास 20 नीली साड़ियाँ हैं।", "en"))
        self.assertEqual(result["provider"], "groq")
        self.assertEqual(result["language"], "hi")
        self.assertTrue(result["title"].startswith("नीली"))

    def test_missing_groq_key_preserves_final_basic_draft(self):
        gemini = self._gemini_client(lambda **_: (_ for _ in ()).throw(TimeoutError()))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test", "GROQ_API_KEY": ""}), patch(
            "services.ai_service.genai.Client", return_value=gemini
        ), patch("services.ai_service.asyncio.sleep", new_callable=AsyncMock):
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))
        self.assertEqual(result["source"], "basic_draft")
        self.assertIsNone(result["provider"])

    def test_hindi_prompt_is_not_labeled_english(self):
        prompt = _product_prompt("मेरे पास 10 नीली साड़ियाँ हैं।", "en")
        self.assertIn("Transcript language hint: hi", prompt)
        self.assertNotIn("Transcript language hint: en", prompt)


if __name__ == "__main__":
    unittest.main()
