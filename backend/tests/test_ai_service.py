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
    def _successful_response():
        return SimpleNamespace(
            output_text=(
                '{"title":"Handmade Clay Diyas","description":"20 handmade clay diyas.",'
                '"category":"pottery","materials":["clay"],"quantity":20,'
                '"tags":["clay","diyas"],"suggested_price_min":null,'
                '"suggested_price_max":null,"target_customer":null,'
                '"selling_points":["handmade"]}'
            )
        )

    def test_valid_structured_hindi_draft_is_labeled_ai(self):
        response = SimpleNamespace(
            output_text=(
                '{"title":"नीली बनारसी साड़ियाँ","description":"10 नीली बनारसी सिल्क '
                'साड़ियाँ जिन पर गोल्डन ज़री का काम है।","category":"textile",'
                '"materials":["सिल्क","ज़री"],"quantity":10,"tags":["बनारसी","साड़ी"],'
                '"suggested_price_min":null,"suggested_price_max":null,"target_customer":null,'
                '"selling_points":["गोल्डन ज़री का काम"]}'
            )
        )
        client = SimpleNamespace(interactions=SimpleNamespace(create=lambda **_: response))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}), patch(
            "services.ai_service.genai.Client", return_value=client
        ):
            result = asyncio.run(analyze_product_input("मेरे पास 10 साड़ियाँ हैं", "hi"))

        self.assertEqual(result["source"], "ai")
        self.assertEqual(result["quantity"], 10)
        self.assertEqual(result["materials"], ["सिल्क", "ज़री"])
        self.assertIsNone(result["suggested_price"])
        self.assertIsNone(result["profit_margin"])

    def test_valid_structured_english_draft_preserves_price_as_estimate(self):
        response = SimpleNamespace(
            output_text=(
                '{"title":"Handmade Clay Diyas","description":"20 handmade clay diyas.",'
                '"category":"pottery","materials":["clay"],"quantity":20,'
                '"tags":["clay","diyas"],"suggested_price_min":200,'
                '"suggested_price_max":300,"target_customer":null,'
                '"selling_points":["handmade"]}'
            )
        )
        client = SimpleNamespace(interactions=SimpleNamespace(create=lambda **_: response))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}), patch(
            "services.ai_service.genai.Client", return_value=client
        ):
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))

        self.assertEqual(result["source"], "ai")
        self.assertEqual(result["quantity"], 20)
        self.assertEqual(result["suggested_price"], 250)
        self.assertIsNone(result["profit_margin"])

    def test_provider_failure_uses_truthful_basic_draft(self):
        for provider_error in ("404 Not Found", "network timeout", "503 Service Unavailable"):
            client = SimpleNamespace(
                interactions=SimpleNamespace(create=lambda **_: (_ for _ in ()).throw(RuntimeError(provider_error)))
            )
            with self.subTest(provider_error=provider_error), patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}), patch(
                "services.ai_service.genai.Client", return_value=client
            ), patch("services.ai_service.asyncio.sleep", new_callable=AsyncMock):
                result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))

            self.assertEqual(result["source"], "basic_draft")
            self.assertEqual(result["quantity"], 20)
            self.assertIsNone(result["suggested_price"])
            self.assertIsNone(result["profit_margin"])

    def test_invalid_gemini_json_uses_truthful_basic_draft(self):
        client = SimpleNamespace(interactions=SimpleNamespace(create=lambda **_: SimpleNamespace(output_text="not json")))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}), patch(
            "services.ai_service.genai.Client", return_value=client
        ):
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))

        self.assertEqual(result["source"], "basic_draft")
        self.assertIsNone(result["suggested_price"])

    def test_empty_structured_fields_use_truthful_basic_draft(self):
        client = SimpleNamespace(
            interactions=SimpleNamespace(
                create=lambda **_: SimpleNamespace(
                    output_text=(
                        '{"title":"","description":"","category":"",'
                        '"materials":[],"quantity":1,"tags":[],'
                        '"suggested_price_min":null,"suggested_price_max":null,'
                        '"target_customer":null,"selling_points":[]}'
                    )
                )
            )
        )
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}), patch(
            "services.ai_service.genai.Client", return_value=client
        ):
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))

        self.assertEqual(result["source"], "basic_draft")
        self.assertEqual(result["description"], "I have 20 handmade clay diyas.")

    def test_timeout_then_success_retries_once(self):
        calls = []

        def create(**_):
            calls.append(True)
            if len(calls) == 1:
                raise TimeoutError()
            return self._successful_response()

        client = SimpleNamespace(interactions=SimpleNamespace(create=create))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}), patch(
            "services.ai_service.genai.Client", return_value=client
        ), patch("services.ai_service.asyncio.sleep", new_callable=AsyncMock) as sleep:
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))

        self.assertEqual(result["source"], "ai")
        self.assertEqual(len(calls), 2)
        sleep.assert_awaited_once_with(1.0)

    def test_both_timeouts_use_basic_draft_after_two_attempts(self):
        calls = []

        def create(**_):
            calls.append(True)
            raise TimeoutError()

        client = SimpleNamespace(interactions=SimpleNamespace(create=create))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}), patch(
            "services.ai_service.genai.Client", return_value=client
        ), patch("services.ai_service.asyncio.sleep", new_callable=AsyncMock):
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))

        self.assertEqual(result["source"], "basic_draft")
        self.assertEqual(len(calls), 2)

    def test_503_then_success_retries_once(self):
        calls = []

        def create(**_):
            calls.append(True)
            if len(calls) == 1:
                raise ProviderError(503)
            return self._successful_response()

        client = SimpleNamespace(interactions=SimpleNamespace(create=create))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}), patch(
            "services.ai_service.genai.Client", return_value=client
        ), patch("services.ai_service.asyncio.sleep", new_callable=AsyncMock):
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))

        self.assertEqual(result["source"], "ai")
        self.assertEqual(len(calls), 2)

    def test_permanent_404_does_not_retry(self):
        calls = []

        def create(**_):
            calls.append(True)
            raise ProviderError(404)

        client = SimpleNamespace(interactions=SimpleNamespace(create=create))
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}), patch(
            "services.ai_service.genai.Client", return_value=client
        ):
            result = asyncio.run(analyze_product_input("I have 20 handmade clay diyas.", "en"))

        self.assertEqual(result["source"], "basic_draft")
        self.assertEqual(len(calls), 1)

    def test_hindi_transcript_is_not_prompted_as_english(self):
        prompt = _product_prompt("मेरे पास 10 नीली साड़ियाँ हैं।", "en")
        self.assertIn("Transcript language hint: hi", prompt)
        self.assertNotIn("Transcript language hint: en", prompt)


if __name__ == "__main__":
    unittest.main()
