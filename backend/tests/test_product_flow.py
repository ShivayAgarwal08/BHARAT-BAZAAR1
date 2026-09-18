import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

# Configure an isolated database before importing the application.
_temp_dir = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_temp_dir.name) / 'product-flow.db'}"
os.environ["JWT_SECRET"] = "phase5a-isolated-test-secret-with-at-least-32-bytes"
os.environ["ADMIN_EMAIL"] = ""
os.environ["ADMIN_PASSWORD"] = ""

from fastapi.testclient import TestClient

from database import engine
from main import app


class ProductFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        engine.dispose()
        _temp_dir.cleanup()

    def test_artisan_can_create_and_read_reviewed_ai_draft(self):
        signup = self.client.post(
            "/auth/signup",
            json={
                "name": "Phase Five Artisan",
                "email": "phase5-artisan@example.test",
                "password": "SafeTestPass123!",
                "role": "artisan",
                "language": "en",
            },
        )
        self.assertEqual(signup.status_code, 200)
        headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

        created = self.client.post(
            "/product/create",
            headers=headers,
            json={
                "raw_description": "I have 20 handmade clay diyas.",
                "quantity": 20,
                "language": "en",
                "ai_data": {
                    "source": "ai",
                    "title": "Handmade Clay Diyas",
                    "description": "20 handmade clay diyas.",
                    "category": "pottery",
                    "material": "clay",
                    "materials": ["clay"],
                    "quantity": 20,
                    "tags": ["clay", "diyas"],
                    "suggested_price": 250,
                    "suggested_price_min": 200,
                    "suggested_price_max": 300,
                    "profit_margin": None,
                },
            },
        )
        self.assertEqual(created.status_code, 200)
        self.assertEqual(created.json()["price"], 250)
        self.assertIsNone(created.json()["profit_margin"])

        listed = self.client.get("/product/list", headers=headers)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()), 1)
        self.assertEqual(listed.json()[0]["title"], "Handmade Clay Diyas")
        self.assertEqual(listed.json()[0]["quantity"], 20)

    def test_blank_ai_description_is_rejected_before_gemini(self):
        with patch("routers.ai_router.analyze_product_input", side_effect=AssertionError("Gemini must not be called")):
            response = self.client.post(
                "/ai/analyze-product",
                json={"description": "   ", "language": "en"},
            )

        self.assertEqual(response.status_code, 422)
        self.assertIn("Please describe your product", response.text)

    def test_analyze_endpoint_preserves_spoken_transcript_and_contract(self):
        transcript = "मेरे पास 10 नीली बनारसी सिल्क साड़ियाँ हैं जिन पर गोल्डन ज़री का काम है"
        ai_result = {
            "source": "ai",
            "product_name": "नीली बनारसी सिल्क साड़ियाँ",
            "title": "नीली बनारसी सिल्क साड़ियाँ",
            "description": transcript,
            "category": "साड़ियाँ",
            "material": "बनारसी सिल्क, गोल्डन ज़री",
            "materials": ["बनारसी सिल्क", "गोल्डन ज़री"],
            "quantity": 10,
            "tags": ["बनारसी साड़ी", "गोल्डन ज़री"],
            "min_price": None,
            "max_price": None,
            "suggested_price": None,
            "suggested_price_min": None,
            "suggested_price_max": None,
            "target_customer": None,
            "selling_points": [],
            "profit_margin": None,
            "greeting": None,
            "language": "hi",
        }
        with patch("routers.ai_router.analyze_product_input", new_callable=AsyncMock, return_value=ai_result) as analyze:
            response = self.client.post(
                "/ai/analyze-product",
                json={"description": transcript, "language": "hi"},
            )

        self.assertEqual(response.status_code, 200)
        analyze.assert_awaited_once_with(transcript, "hi")
        payload = response.json()
        self.assertEqual(payload["source"], "ai")
        self.assertEqual(payload["title"], ai_result["title"])
        self.assertEqual(payload["description"], transcript)
        self.assertEqual(payload["materials"], ai_result["materials"])
        self.assertEqual(payload["quantity"], 10)
        self.assertEqual(payload["tags"], ai_result["tags"])


if __name__ == "__main__":
    unittest.main()
