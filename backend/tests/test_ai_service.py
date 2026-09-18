import asyncio
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from services.ai_service import analyze_product_input


class AIServiceTests(unittest.TestCase):
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
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}), patch(
            "services.ai_service.genai.Client", side_effect=RuntimeError("network timeout")
        ):
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


if __name__ == "__main__":
    unittest.main()
